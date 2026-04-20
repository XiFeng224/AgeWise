import { Op } from 'sequelize'
import { Elderly, HealthData, ActivityTrack, Warning, Notification, ServiceRequest, EmotionRecord, CognitiveTest, MedicationAdherence } from '../models'
import healthRiskService from './healthRiskService'
import healthDataService from './healthDataService'

export interface RiskAnalysisResult {
  elderly: {
    id: number
    name: string
    age: number
    riskLevel: 'low' | 'medium' | 'high'
    riskLevelZh: '低风险' | '中风险' | '高风险'
    healthStatus: string
    isAlone: boolean
  }
  summary: {
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
    riskLevelZh: '低风险' | '中风险' | '高风险'
    trend: 'improving' | 'stable' | 'worsening'
    confidence: number
  }
  analysis: {
    healthAbnormalities: string[]
    activityAbnormalities: string[]
    warningSignals: string[]
    serviceGaps: string[]
    emotionalSignals: string[]
    cognitiveSignals: string[]
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    timeWindow: '10分钟' | '30分钟' | '24小时' | '7天'
    owner: '社区医生' | '网格员' | '家属' | '护工' | '系统'
    action: string
    reason: string
  }>
  dataSnapshot: {
    healthPoints: number
    activityPoints: number
    warningCount: number
    recentNotificationCount: number
    serviceRequestCount: number
    latestHealthDataAt?: string
    latestActivityAt?: string
  }
}

class RiskAnalysisService {
  private getRiskLevelZh(level: 'low' | 'medium' | 'high'): '低风险' | '中风险' | '高风险' {
    if (level === 'high') return '高风险'
    if (level === 'medium') return '中风险'
    return '低风险'
  }

  private getChineseHealthType(type: string) {
    const map: Record<string, string> = {
      heart_rate: '心率',
      blood_pressure: '血压',
      blood_sugar: '血糖',
      temperature: '体温',
      steps: '步数',
      sleep: '睡眠'
    }
    return map[type] || type
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  async analyze(elderlyId: number, days = 7): Promise<RiskAnalysisResult> {
    const elderly = await Elderly.findByPk(elderlyId)
    if (!elderly) throw new Error('老人不存在')

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const since3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const [healthData, activityData, warnings, notifications, serviceRequests, emotionData, cognitiveData, fallRisk, strokeRisk, medication] = await Promise.all([
      HealthData.findAll({ where: { elderlyId, createdAt: { [Op.gte]: since } }, order: [['createdAt', 'DESC']] }),
      ActivityTrack.findAll({ where: { elderlyId, startTime: { [Op.gte]: since } }, order: [['startTime', 'DESC']] }),
      Warning.findAll({ where: { elderlyId, created_at: { [Op.gte]: since } }, order: [['created_at', 'DESC']] }),
      Notification.findAll({ where: { relatedId: elderlyId, createdAt: { [Op.gte]: since } }, order: [['createdAt', 'DESC']] }),
      ServiceRequest.findAll({ where: { elderlyId, created_at: { [Op.gte]: since } }, order: [['created_at', 'DESC']] }),
      EmotionRecord.findAll({ where: { elderlyId, createdAt: { [Op.gte]: since } }, order: [['createdAt', 'DESC']] }),
      CognitiveTest.findAll({ where: { elderlyId, testDate: { [Op.gte]: since } }, order: [['testDate', 'DESC']] }),
      healthRiskService.predictFallRisk(elderlyId, days),
      healthRiskService.predictStrokeRisk(elderlyId, days),
      healthRiskService.analyzeMedicationAdherence(elderlyId, days)
    ])

    const abnormalHealth = healthData.filter((item: any) => item.isAbnormal).map((item: any) => `${this.getChineseHealthType(item.dataType)}异常：${item.value}${item.value2 ? `/${item.value2}` : ''}${item.unit ? ` ${item.unit}` : ''}`)
    const abnormalActivity = activityData.filter((item: any) => item.isAbnormal).map((item: any) => `活动异常：${item.activityType}，持续${Math.round(item.duration / 60)}分钟`)

    const recentWarnings = warnings.slice(0, 5).map((w: any) => `${w.title}（${w.riskLevel === 'high' ? '高风险' : w.riskLevel === 'medium' ? '中风险' : '低风险'}）`)
    const serviceGapDays = Math.min(7, Math.max(1, days))
    const serviceGap = serviceRequests.length === 0 ? [`最近${serviceGapDays}天无服务记录`] : []
    const recentNotificationCount = notifications.length

    const emotionalSignals = emotionData.length
      ? [
          `最近${days}天情绪记录${emotionData.length}条`,
          emotionData.some((e: any) => ['sad', 'anxious', 'angry'].includes(e.emotionType)) ? '存在负面情绪信号' : '未见明显负面情绪'
        ]
      : ['暂无情绪数据']

    const cognitiveSignals = cognitiveData.length
      ? [
          `最近${days}天认知测试${cognitiveData.length}次`,
          cognitiveData.some((c: any) => Number(c.score) / Math.max(1, Number(c.maxScore || 100)) < 0.6) ? '存在认知下降信号' : '认知测试整体稳定'
        ]
      : ['暂无认知测试数据']

    const latestHealthDataAt = healthData[0]?.createdAt ? new Date(healthData[0].createdAt).toISOString() : undefined
    const latestActivityAt = activityData[0]?.startTime ? new Date(activityData[0].startTime).toISOString() : undefined

    const scoreParts = [
      fallRisk.riskScore * 0.35,
      strokeRisk.riskScore * 0.25,
      medication.adherenceScore ? (100 - medication.adherenceScore) * 0.15 : 0,
      abnormalHealth.length * 6,
      abnormalActivity.length * 8,
      recentWarnings.length * 5,
      serviceRequests.length === 0 ? 10 : 0,
      emotionData.length && emotionData.some((e: any) => ['sad', 'anxious', 'angry'].includes(e.emotionType)) ? 8 : 0,
      cognitiveData.length && cognitiveData.some((c: any) => Number(c.score) / Math.max(1, Number(c.maxScore || 100)) < 0.6) ? 8 : 0
    ]
    const riskScore = Math.min(100, Math.round(scoreParts.reduce((sum, n) => sum + n, 0)))
    const riskLevel = this.getRiskLevel(riskScore)

    const trend = healthData.length >= 2
      ? (() => {
          const abnormalRecent = healthData.slice(0, Math.max(1, Math.floor(healthData.length / 3))).filter((item: any) => item.isAbnormal).length
          const abnormalEarly = healthData.slice(Math.max(0, healthData.length - Math.max(1, Math.floor(healthData.length / 3)))).filter((item: any) => item.isAbnormal).length
          if (abnormalRecent > abnormalEarly) return 'worsening'
          if (abnormalRecent < abnormalEarly) return 'improving'
          return 'stable'
        })()
      : 'stable'

    const confidence = Math.min(95, Math.max(55, 60 + abnormalHealth.length * 3 + abnormalActivity.length * 4 + recentWarnings.length * 2))

    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      timeWindow: '10分钟' | '30分钟' | '24小时' | '7天'
      owner: '社区医生' | '网格员' | '家属' | '护工' | '系统'
      action: string
      reason: string
    }> = [
      {
        priority: riskLevel === 'high' ? 'high' : 'medium',
        timeWindow: '10分钟',
        owner: '网格员',
        action: '电话确认老人当前状态并核实是否需要上门',
        reason: '先确认是否存在急性异常，避免误判'
      },
      {
        priority: riskLevel === 'high' ? 'high' : 'medium',
        timeWindow: '30分钟',
        owner: '社区医生',
        action: '安排上门或视频复测血压、心率、血糖等关键指标',
        reason: '结合健康趋势和异常信号做二次评估'
      },
      {
        priority: 'medium',
        timeWindow: '24小时',
        owner: '家属',
        action: '推送简版风险报告并提醒关注睡眠、饮食和情绪变化',
        reason: '让家属参与照护闭环'
      },
      {
        priority: 'low',
        timeWindow: '7天',
        owner: '系统',
        action: '自动跟踪服务记录、预警记录和健康趋势变化',
        reason: '用于后续偏好学习与策略优化'
      }
    ]

    if (serviceRequests.length === 0) {
      recommendations.unshift({
        priority: 'medium',
        timeWindow: '24小时',
        owner: '网格员',
        action: '发起空窗期关怀，电话询问是否需要助餐、助浴或代办服务',
        reason: '连续无服务记录，可能存在照护空窗'
      })
    }

    const elderlyRiskLevel = elderly.riskLevel as 'low' | 'medium' | 'high'

    return {
      elderly: {
        id: elderly.id,
        name: elderly.name,
        age: elderly.age,
        riskLevel: elderlyRiskLevel,
        riskLevelZh: this.getRiskLevelZh(elderlyRiskLevel),
        healthStatus: elderly.healthStatus,
        isAlone: elderly.isAlone
      },
      summary: {
        riskScore,
        riskLevel,
        riskLevelZh: this.getRiskLevelZh(riskLevel),
        trend,
        confidence
      },
      analysis: {
        healthAbnormalities: abnormalHealth,
        activityAbnormalities: abnormalActivity,
        warningSignals: recentWarnings,
        serviceGaps: serviceGap,
        emotionalSignals,
        cognitiveSignals
      },
      recommendations,
      dataSnapshot: {
        healthPoints: healthData.length,
        activityPoints: activityData.length,
        warningCount: warnings.length,
        recentNotificationCount,
        serviceRequestCount: serviceRequests.length,
        latestHealthDataAt,
        latestActivityAt
      }
    }
  }
}

export default new RiskAnalysisService()
