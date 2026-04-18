import { ActivityTrack, Elderly } from '../models'
import { Op } from 'sequelize'
import warningManagementService from './warningManagementService'

// 行为轨迹服务类
class ActivityTrackService {
  // 记录老人的活动
  async recordActivity(data: {
    elderlyId: number
    activityType: 'movement' | 'rest' | 'bathroom' | 'kitchen' | 'bedroom'
    startTime: Date
    endTime?: Date
    duration: number
    location?: string
    sensorId?: string
  }) {
    try {
      // 验证老人是否存在
      const elderly = await Elderly.findByPk(data.elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 分析活动是否异常
      const analysisResult = this.analyzeActivity(data)

      // 保存行为轨迹数据
      const activityTrack = await ActivityTrack.create({
        elderlyId: data.elderlyId,
        activityType: data.activityType,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        location: data.location,
        sensorId: data.sensorId,
        isAbnormal: analysisResult.isAbnormal
      })

      // 如果活动异常，生成预警
      if (analysisResult.isAbnormal) {
        await warningManagementService.analyzeActivityDataAndGenerateWarning(data.elderlyId, data)
      }

      return {
        success: true,
        data: activityTrack,
        message: '活动记录成功'
      }
    } catch (error) {
      console.error('记录活动失败:', error)
      return {
        success: false,
        message: '活动记录失败: ' + (error as Error).message
      }
    }
  }

  // 分析活动是否异常
  private analyzeActivity(
    data: {
      activityType: 'movement' | 'rest' | 'bathroom' | 'kitchen' | 'bedroom'
      duration: number
      startTime: Date
    }
  ) {
    let isAbnormal = false
    let message = ''

    switch (data.activityType) {
      case 'rest':
        // 长时间休息（超过4小时）视为异常
        if (data.duration > 4 * 60 * 60) {
          isAbnormal = true
          message = `长时间休息: ${Math.round(data.duration / 3600)} 小时`
        }
        break
      case 'bathroom':
        // 长时间在卫生间（超过30分钟）视为异常
        if (data.duration > 30 * 60) {
          isAbnormal = true
          message = `长时间在卫生间: ${Math.round(data.duration / 60)} 分钟`
        }
        break
      case 'kitchen': {
        // 深夜在厨房活动视为异常
        const hour = data.startTime.getHours()
        if (hour < 6 || hour > 22) {
          isAbnormal = true
          message = '深夜在厨房活动'
        }
        break
      }
      case 'movement':
        // 很少活动（持续时间短）视为异常
        if (data.duration < 10 * 60) {
          isAbnormal = true
          message = '活动时间过短'
        }
        break
    }

    return { isAbnormal, message }
  }

  // 获取老人的活动轨迹历史
  async getElderlyActivityHistory(elderlyId: number, days: number = 7) {
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - days)

    return ActivityTrack.findAll({
      where: {
        elderlyId,
        startTime: {
          [Op.gte]: startTime
        }
      },
      order: [['startTime', 'ASC']]
    })
  }

  // 分析老人的活动规律
  async analyzeActivityPattern(elderlyId: number, days: number = 7) {
    const history = await this.getElderlyActivityHistory(elderlyId, days)
    if (history.length === 0) {
      return {
        pattern: 'no_data',
        message: '暂无足够的活动数据'
      }
    }

    // 按活动类型分组统计
    const activityStats: Record<string, {
      count: number
      totalDuration: number
      averageDuration: number
    }> = {}

    history.forEach(activity => {
      if (!activityStats[activity.activityType]) {
        activityStats[activity.activityType] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0
        }
      }
      activityStats[activity.activityType].count++
      activityStats[activity.activityType].totalDuration += activity.duration
    })

    // 计算平均持续时间
    for (const activityType in activityStats) {
      activityStats[activityType].averageDuration = 
        activityStats[activityType].totalDuration / activityStats[activityType].count
    }

    // 分析活动规律
    const pattern = this.identifyActivityPattern(activityStats)

    return {
      pattern,
      stats: activityStats,
      totalActivities: history.length
    }
  }

  // 识别活动模式
  private identifyActivityPattern(stats: Record<string, { count: number; totalDuration: number; averageDuration: number }>): string {
    // 分析活动模式
    const restCount = stats['rest']?.count || 0
    const movementCount = stats['movement']?.count || 0
    const bathroomCount = stats['bathroom']?.count || 0

    if (movementCount === 0) {
      return 'sedentary' // 久坐不动
    } else if (bathroomCount > 10) {
      return 'frequent_bathroom' // 频繁上厕所
    } else if (restCount > movementCount * 2) {
      return 'resting' // 休息时间过长
    } else {
      return 'active' // 活动正常
    }
  }

  // 批量记录活动
  async batchRecordActivities(dataList: Array<{
    elderlyId: number
    activityType: 'movement' | 'rest' | 'bathroom' | 'kitchen' | 'bedroom'
    startTime: Date
    endTime?: Date
    duration: number
    location?: string
    sensorId?: string
  }>) {
    const results = []
    for (const data of dataList) {
      const result = await this.recordActivity(data)
      results.push(result)
    }
    return results
  }

  // 检测异常活动模式
  async detectAbnormalPatterns(elderlyId: number, days: number = 7) {
    const history = await this.getElderlyActivityHistory(elderlyId, days)
    if (history.length === 0) {
      return []
    }

    const anomalies = []

    // 检测长时间无活动
    const latestActivity = history[history.length - 1]
    const timeSinceLastActivity = new Date().getTime() - latestActivity.startTime.getTime()
    if (timeSinceLastActivity > 6 * 60 * 60 * 1000) { // 6小时无活动
      const anomaly = {
        activityType: 'no_activity',
        message: '长时间无活动',
        duration: Math.round(timeSinceLastActivity / (1000 * 60 * 60)),
        timestamp: new Date()
      }
      anomalies.push(anomaly)
      // 生成预警
      await warningManagementService.analyzeActivityDataAndGenerateWarning(elderlyId, anomaly)
    }

    // 检测异常活动频率
    const bathroomActivities = history.filter(a => a.activityType === 'bathroom')
    if (bathroomActivities.length > 15) { // 一天超过15次上厕所
      const anomaly = {
        activityType: 'frequent_bathroom',
        message: '频繁上厕所',
        count: bathroomActivities.length,
        timestamp: new Date()
      }
      anomalies.push(anomaly)
      // 生成预警
      await warningManagementService.analyzeActivityDataAndGenerateWarning(elderlyId, anomaly)
    }

    // 检测夜间活动
    const nightActivities = history.filter(a => {
      const hour = a.startTime.getHours()
      return hour < 6 || hour > 22
    })
    if (nightActivities.length > 3) { // 夜间活动超过3次
      const anomaly = {
        activityType: 'night_activity',
        message: '夜间频繁活动',
        count: nightActivities.length,
        timestamp: new Date()
      }
      anomalies.push(anomaly)
      // 生成预警
      await warningManagementService.analyzeActivityDataAndGenerateWarning(elderlyId, anomaly)
    }

    return anomalies
  }

  // 生成活动报告
  async generateActivityReport(elderlyId: number, days: number = 7) {
    const history = await this.getElderlyActivityHistory(elderlyId, days)
    const elderly = await Elderly.findByPk(elderlyId)

    if (!elderly) {
      throw new Error('老人不存在')
    }

    let report = `活动报告 - ${elderly.name} (${elderly.age}岁)\n`
    report += `生成时间: ${new Date().toLocaleString()}\n\n`

    // 统计活动数据
    const activityStats: Record<string, number> = {
      movement: 0,
      rest: 0,
      bathroom: 0,
      kitchen: 0,
      bedroom: 0
    }

    history.forEach(activity => {
      activityStats[activity.activityType]++
    })

    report += '活动统计:\n'
    for (const [activityType, count] of Object.entries(activityStats)) {
      report += `${this.getActivityTypeName(activityType)}: ${count} 次\n`
    }

    // 分析活动模式
    const patternAnalysis = await this.analyzeActivityPattern(elderlyId, days)
    report += `\n活动模式: ${this.getPatternName(patternAnalysis.pattern)}\n`

    // 检测异常
    const anomalies = await this.detectAbnormalPatterns(elderlyId, days)
    if (anomalies.length > 0) {
      report += '\n异常活动:\n'
      anomalies.forEach((anomaly, index) => {
        report += `${index + 1}. ${anomaly.message}\n`
      })
    }

    return report
  }

  // 辅助函数：获取活动类型的中文名称
  private getActivityTypeName(activityType: string): string {
    const names: Record<string, string> = {
      movement: '活动',
      rest: '休息',
      bathroom: '卫生间',
      kitchen: '厨房',
      bedroom: '卧室'
    }
    return names[activityType] || activityType
  }

  // 辅助函数：获取活动模式的中文名称
  private getPatternName(pattern: string): string {
    const names: Record<string, string> = {
      sedentary: '久坐不动',
      frequent_bathroom: '频繁上厕所',
      resting: '休息时间过长',
      active: '活动正常',
      no_data: '暂无数据'
    }
    return names[pattern] || pattern
  }
}

export default new ActivityTrackService()