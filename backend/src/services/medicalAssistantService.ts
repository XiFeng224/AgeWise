import { Op } from 'sequelize'
import { Elderly, HealthData, User } from '../models'
import healthDataService from './healthDataService'
import notificationService from './notificationService'
import outreachService from './outreachService'

export interface RealtimeHealthPoint {
  dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
  value: number
  value2?: number
  deviceId?: string
}

class MedicalAssistantService {
  async ingestRealtimeData(elderlyId: number, points: RealtimeHealthPoint[]) {
    const elderly = await Elderly.findByPk(elderlyId)
    if (!elderly) {
      throw new Error('老人不存在')
    }

    const results = []
    for (const point of points) {
      const result = await healthDataService.processDeviceData({
        elderlyId,
        dataType: point.dataType,
        value: point.value,
        value2: point.value2,
        deviceId: point.deviceId || 'realtime-gateway'
      })
      results.push(result)
    }

    const summary = await this.getRealtimeSummary(elderlyId, 24)

    if (summary.overallLevel === 'urgent') {
      await this.notifyCommunityForUrgentRisk(elderly)
    }

    return {
      elderly: {
        id: elderly.id,
        name: elderly.name,
        age: elderly.age,
        riskLevel: elderly.riskLevel
      },
      ingestCount: points.length,
      successCount: results.filter(r => r.success).length,
      summary
    }
  }

  async getRealtimeSummary(elderlyId: number, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const records = await HealthData.findAll({
      where: {
        elderlyId,
        createdAt: { [Op.gte]: since }
      },
      order: [['createdAt', 'DESC']]
    })

    const latest: Record<string, { value: number; value2?: number; unit: string; at: Date; abnormal: boolean }> = {}
    for (const item of records) {
      if (!latest[item.dataType]) {
        latest[item.dataType] = {
          value: item.value,
          value2: item.value2,
          unit: item.unit,
          at: item.createdAt,
          abnormal: item.isAbnormal
        }
      }
    }

    const advice = this.buildPlainMedicalAdvice(latest)
    return {
      hours,
      latest,
      abnormalCount: records.filter(r => r.isAbnormal).length,
      totalCount: records.length,
      overallLevel: advice.level,
      suggestions: advice.suggestions,
      emergencySignals: advice.emergencySignals,
      disclaimer: '该建议用于社区健康管理与日常提醒，不能替代医生面诊。若有明显不适请立即就医。'
    }
  }

  private async notifyCommunityForUrgentRisk(elderly: Elderly) {
    const title = `紧急健康提醒：${elderly.name}`
    const content = `系统检测到 ${elderly.name} 近期监测数据存在紧急风险，请立即联系家属并安排就医。`

    const notifyUserIds = new Set<number>()
    if (elderly.gridMemberId) notifyUserIds.add(elderly.gridMemberId)

    const admins = await User.findAll({ where: { role: 'admin' } })
    admins.forEach(a => notifyUserIds.add(a.id))

    await Promise.all(
      Array.from(notifyUserIds).map((userId) =>
        notificationService.sendNotification(userId, title, content, 'medical_urgent', elderly.id)
      )
    )

    // 家属外部渠道通知（短信/企业微信Webhook预留）
    await outreachService.notifyFamilyForUrgentRisk(elderly, content)
  }

  private buildPlainMedicalAdvice(latest: Record<string, { value: number; value2?: number }>) {
    const suggestions: string[] = []
    const emergencySignals: string[] = []
    let level: 'normal' | 'attention' | 'urgent' = 'normal'

    const bp = latest.blood_pressure
    if (bp) {
      const sbp = bp.value
      const dbp = bp.value2
      if (sbp >= 180 || (dbp && dbp >= 120)) {
        level = 'urgent'
        emergencySignals.push('血压极高，建议立即联系家属并就医。')
      } else if (sbp >= 140 || (dbp && dbp >= 90)) {
        level = 'attention'
        suggestions.push('血压偏高：请先安静休息10分钟后复测，减少盐分，必要时联系社区医生。')
      }
    }

    const sugar = latest.blood_sugar
    if (sugar) {
      if (sugar.value >= 11.1) {
        level = 'urgent'
        emergencySignals.push('血糖明显偏高，建议尽快联系医生。')
      } else if (sugar.value < 3.9) {
        level = 'urgent'
        emergencySignals.push('血糖偏低，建议立即补充含糖食物并观察。')
      } else if (sugar.value > 7.0) {
        if (level !== 'urgent') {
          level = 'attention'
        }
        suggestions.push('血糖偏高：请控制精制碳水摄入，按时用药，今日增加轻量活动。')
      }
    }

    const hr = latest.heart_rate
    if (hr) {
      if (hr.value > 120 || hr.value < 45) {
        level = 'urgent'
        emergencySignals.push('心率异常明显，若伴胸闷头晕请尽快就医。')
      } else if (hr.value > 100 || hr.value < 60) {
        if (level !== 'urgent') {
          level = 'attention'
        }
        suggestions.push('心率偏离正常范围：建议减少活动强度并复测。')
      }
    }

    const temp = latest.temperature
    if (temp) {
      if (temp.value >= 38.5) {
        level = 'urgent'
        emergencySignals.push('体温较高，建议尽快就医排查感染。')
      } else if (temp.value >= 37.5) {
        if (level !== 'urgent') {
          level = 'attention'
        }
        suggestions.push('体温偏高：注意补水、休息并每4小时复测体温。')
      }
    }

    const steps = latest.steps
    if (steps && steps.value < 800) {
      if (level !== 'urgent') {
        level = 'attention'
      }
      suggestions.push('今日活动量偏低：建议在安全范围内分段步行10-20分钟。')
    }

    const sleep = latest.sleep
    if (sleep && (sleep.value < 5 || sleep.value > 10)) {
      if (level !== 'urgent') {
        level = 'attention'
      }
      suggestions.push('睡眠时长异常：保持固定作息，白天适量活动，减少午睡过长。')
    }

    if (!suggestions.length && !emergencySignals.length) {
      suggestions.push('当前监测指标总体平稳，请继续按时监测、规律饮食与规律服药。')
    }

    return { level, suggestions, emergencySignals }
  }
}

export default new MedicalAssistantService()
