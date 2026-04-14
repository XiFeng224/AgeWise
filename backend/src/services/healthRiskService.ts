import { HealthData, ActivityTrack, Elderly, EmotionRecord, CognitiveTest } from '../models'
import { Op } from 'sequelize'
import emotionService from './emotionService'
import cognitiveService from './cognitiveService'
import medicationService from './medicationService'

// 健康风险预测服务类
class HealthRiskService {
  // 预测跌倒风险
  async predictFallRisk(elderlyId: number, days: number = 30): Promise<{
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
    factors: string[]
    recommendations: string[]
  }> {
    try {
      // 获取老人的健康数据和活动数据
      const healthData = await HealthData.findAll({
        where: {
          elderlyId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        order: [['createdAt', 'ASC']]
      })

      const activityData = await ActivityTrack.findAll({
        where: {
          elderlyId,
          startTime: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        order: [['startTime', 'ASC']]
      })

      // 获取情绪和认知数据
      const emotionData = await EmotionRecord.findAll({
        where: {
          elderlyId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      })

      const cognitiveData = await CognitiveTest.findAll({
        where: {
          elderlyId,
          testDate: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      })

      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 计算跌倒风险因素
      const factors = this.analyzeFallRiskFactors(healthData, activityData, elderly, emotionData, cognitiveData)

      // 计算风险分数
      const riskScore = this.calculateFallRiskScore(factors, elderly)

      // 确定风险等级
      const riskLevel = this.determineRiskLevel(riskScore)

      // 生成建议
      const recommendations = this.generateFallRiskRecommendations(riskLevel, factors)

      return {
        riskScore,
        riskLevel,
        factors,
        recommendations
      }
    } catch (error) {
      console.error('预测跌倒风险失败:', error)
      throw error
    }
  }

  // 分析跌倒风险因素
  private analyzeFallRiskFactors(
    healthData: any[],
    activityData: any[],
    elderly: Elderly,
    emotionData?: any[],
    cognitiveData?: any[]
  ): string[] {
    const factors: string[] = []

    // 年龄因素
    if (elderly.age >= 80) {
      factors.push('年龄较大（80岁以上）')
    } else if (elderly.age >= 70) {
      factors.push('年龄较大（70-79岁）')
    }

    // 健康状况因素
    if (elderly.healthStatus === 'poor') {
      factors.push('健康状况较差')
    } else if (elderly.healthStatus === 'fair') {
      factors.push('健康状况一般')
    }

    // 独居因素
    if (elderly.isAlone) {
      factors.push('独居老人')
    }

    // 健康数据因素
    const heartRateData = healthData.filter(d => d.dataType === 'heart_rate')
    if (heartRateData.length > 0) {
      const avgHeartRate = heartRateData.reduce((sum, d) => sum + d.value, 0) / heartRateData.length
      if (avgHeartRate > 100 || avgHeartRate < 60) {
        factors.push('心率异常')
      }
    }

    const bloodPressureData = healthData.filter(d => d.dataType === 'blood_pressure')
    if (bloodPressureData.length > 0) {
      const avgSystolic = bloodPressureData.reduce((sum, d) => sum + d.value, 0) / bloodPressureData.length
      if (avgSystolic > 140) {
        factors.push('血压偏高')
      }
    }

    const stepsData = healthData.filter(d => d.dataType === 'steps')
    if (stepsData.length > 0) {
      const avgSteps = stepsData.reduce((sum, d) => sum + d.value, 0) / stepsData.length
      if (avgSteps < 1000) {
        factors.push('活动量过少')
      }
    }

    // 活动数据因素
    const restActivities = activityData.filter(a => a.activityType === 'rest')
    if (restActivities.length > 0) {
      const avgRestDuration = restActivities.reduce((sum, a) => sum + a.duration, 0) / restActivities.length
      if (avgRestDuration > 3 * 60 * 60) { // 超过3小时
        factors.push('长时间休息')
      }
    }

    const bathroomActivities = activityData.filter(a => a.activityType === 'bathroom')
    if (bathroomActivities.length > 10) {
      factors.push('频繁上厕所')
    }

    // 异常活动因素
    const abnormalActivities = activityData.filter(a => a.isAbnormal)
    if (abnormalActivities.length > 0) {
      factors.push('存在异常活动模式')
    }

    // 情绪因素
    if (emotionData && emotionData.length > 0) {
      const negativeEmotions = emotionData.filter(e => 
        e.emotionType === 'sad' || e.emotionType === 'anxious' || e.emotionType === 'angry'
      )
      if (negativeEmotions.length > emotionData.length * 0.5) {
        factors.push('情绪状态较差')
      }
    }

    // 认知因素
    if (cognitiveData && cognitiveData.length > 0) {
      const avgScore = cognitiveData.reduce((sum, c) => sum + c.score / c.maxScore, 0) / cognitiveData.length
      if (avgScore < 0.6) {
        factors.push('认知功能下降')
      }
    }

    return factors
  }

  // 计算跌倒风险分数
  private calculateFallRiskScore(factors: string[], elderly: Elderly): number {
    let score = 0

    // 基础分数
    if (elderly.age >= 80) score += 30
    else if (elderly.age >= 70) score += 20
    else if (elderly.age >= 60) score += 10

    if (elderly.healthStatus === 'poor') score += 25
    else if (elderly.healthStatus === 'fair') score += 15

    if (elderly.isAlone) score += 20

    // 因素分数
    factors.forEach(factor => {
      switch (factor) {
        case '心率异常': score += 15
        case '血压偏高': score += 15
        case '活动量过少': score += 15
        case '长时间休息': score += 10
        case '频繁上厕所': score += 10
        case '存在异常活动模式': score += 20
        case '情绪状态较差': score += 15
        case '认知功能下降': score += 20
      }
    })

    return Math.min(score, 100)
  }

  // 确定风险等级
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  // 生成跌倒风险建议
  private generateFallRiskRecommendations(riskLevel: 'low' | 'medium' | 'high', factors: string[]): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('建议增加家庭陪护或社区网格员定期探访')
      recommendations.push('建议在家中安装防滑设施和跌倒报警装置')
      recommendations.push('建议进行平衡能力训练')
      recommendations.push('建议定期进行健康检查')
    } else if (riskLevel === 'medium') {
      recommendations.push('建议增加日常活动量')
      recommendations.push('建议在家中安装扶手等安全设施')
      recommendations.push('建议定期监测健康状况')
    } else {
      recommendations.push('建议保持规律的日常活动')
      recommendations.push('建议定期进行健康检查')
    }

    // 根据具体因素生成建议
    if (factors.includes('活动量过少')) {
      recommendations.push('建议每天进行适量的散步或其他轻度运动')
    }

    if (factors.includes('心率异常') || factors.includes('血压偏高')) {
      recommendations.push('建议定期监测心率和血压')
      recommendations.push('建议咨询医生调整用药')
    }

    if (factors.includes('情绪状态较差')) {
      recommendations.push('建议增加社交活动，保持心情愉悦')
      recommendations.push('建议家属多陪伴，关注情绪变化')
    }

    if (factors.includes('认知功能下降')) {
      recommendations.push('建议进行认知训练，如记忆游戏、拼图等')
      recommendations.push('建议家属或网格员提醒老人注意安全')
    }

    return recommendations
  }

  // 预测中风风险
  async predictStrokeRisk(elderlyId: number, days: number = 30): Promise<{
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
    factors: string[]
    recommendations: string[]
  }> {
    try {
      // 获取老人的健康数据
      const healthData = await HealthData.findAll({
        where: {
          elderlyId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        order: [['createdAt', 'ASC']]
      })

      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 分析中风风险因素
      const factors = this.analyzeStrokeRiskFactors(healthData, elderly)

      // 计算风险分数
      const riskScore = this.calculateStrokeRiskScore(factors, elderly)

      // 确定风险等级
      const riskLevel = this.determineRiskLevel(riskScore)

      // 生成建议
      const recommendations = this.generateStrokeRiskRecommendations(riskLevel, factors)

      return {
        riskScore,
        riskLevel,
        factors,
        recommendations
      }
    } catch (error) {
      console.error('预测中风风险失败:', error)
      throw error
    }
  }

  // 分析中风风险因素
  private analyzeStrokeRiskFactors(healthData: any[], elderly: Elderly): string[] {
    const factors: string[] = []

    // 年龄因素
    if (elderly.age >= 75) {
      factors.push('年龄较大（75岁以上）')
    } else if (elderly.age >= 65) {
      factors.push('年龄较大（65-74岁）')
    }

    // 性别因素
    if (elderly.gender === 'male') {
      factors.push('男性')
    }

    // 健康状况因素
    if (elderly.healthStatus === 'poor') {
      factors.push('健康状况较差')
    }

    // 健康数据因素
    const bloodPressureData = healthData.filter(d => d.dataType === 'blood_pressure')
    if (bloodPressureData.length > 0) {
      const avgSystolic = bloodPressureData.reduce((sum, d) => sum + d.value, 0) / bloodPressureData.length
      const avgDiastolic = bloodPressureData.reduce((sum, d) => sum + (d.value2 || 0), 0) / bloodPressureData.length
      if (avgSystolic > 140 || avgDiastolic > 90) {
        factors.push('高血压')
      }
    }

    const bloodSugarData = healthData.filter(d => d.dataType === 'blood_sugar')
    if (bloodSugarData.length > 0) {
      const avgBloodSugar = bloodSugarData.reduce((sum, d) => sum + d.value, 0) / bloodSugarData.length
      if (avgBloodSugar > 7.0) {
        factors.push('血糖偏高')
      }
    }

    const heartRateData = healthData.filter(d => d.dataType === 'heart_rate')
    if (heartRateData.length > 0) {
      const avgHeartRate = heartRateData.reduce((sum, d) => sum + d.value, 0) / heartRateData.length
      if (avgHeartRate > 100 || avgHeartRate < 60) {
        factors.push('心率异常')
      }
    }

    return factors
  }

  // 计算中风风险分数
  private calculateStrokeRiskScore(factors: string[], elderly: Elderly): number {
    let score = 0

    // 基础分数
    if (elderly.age >= 75) score += 30
    else if (elderly.age >= 65) score += 20

    if (elderly.gender === 'male') score += 10

    if (elderly.healthStatus === 'poor') score += 20

    // 因素分数
    factors.forEach(factor => {
      switch (factor) {
        case '高血压': score += 30
        case '血糖偏高': score += 20
        case '心率异常': score += 15
      }
    })

    return Math.min(score, 100)
  }

  // 生成中风风险建议
  private generateStrokeRiskRecommendations(riskLevel: 'low' | 'medium' | 'high', factors: string[]): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('建议立即咨询医生，进行详细的中风风险评估')
      recommendations.push('建议调整饮食，减少盐分和脂肪摄入')
      recommendations.push('建议增加有氧运动')
      recommendations.push('建议定期监测血压和血糖')
    } else if (riskLevel === 'medium') {
      recommendations.push('建议咨询医生，了解中风预防措施')
      recommendations.push('建议调整饮食结构')
      recommendations.push('建议增加日常活动量')
      recommendations.push('建议定期监测健康指标')
    } else {
      recommendations.push('建议保持健康的生活方式')
      recommendations.push('建议定期进行健康检查')
    }

    // 根据具体因素生成建议
    if (factors.includes('高血压')) {
      recommendations.push('建议严格控制血压，按照医生建议服用降压药')
    }

    if (factors.includes('血糖偏高')) {
      recommendations.push('建议控制血糖，合理饮食')
    }

    return recommendations
  }

  // 分析用药依从性
  async analyzeMedicationAdherence(elderlyId: number, days: number = 30): Promise<{
    adherenceScore: number
    adherenceLevel: 'excellent' | 'good' | 'fair' | 'poor'
    insights: string[]
    recommendations: string[]
  }> {
    try {
      // 使用medicationService获取真实的用药依从性数据
      const adherenceData = await medicationService.analyzeMedicationAdherence(elderlyId, days)
      
      // 计算依从性分数
      const adherenceScore = adherenceData.data.overallAdherence

      // 确定依从性等级
      let adherenceLevel: 'excellent' | 'good' | 'fair' | 'poor'
      if (adherenceScore >= 90) adherenceLevel = 'excellent'
      else if (adherenceScore >= 75) adherenceLevel = 'good'
      else if (adherenceScore >= 60) adherenceLevel = 'fair'
      else adherenceLevel = 'poor'

      // 生成洞察和建议
      const insights: string[] = []
      const recommendations: string[] = []

      if (adherenceLevel === 'excellent') {
        insights.push('用药依从性非常好')
        recommendations.push('继续保持良好的用药习惯')
      } else if (adherenceLevel === 'good') {
        insights.push('用药依从性良好')
        recommendations.push('建议设置用药提醒，确保按时服药')
      } else if (adherenceLevel === 'fair') {
        insights.push('用药依从性一般')
        recommendations.push('建议使用智能药盒提醒服药')
        recommendations.push('建议家属或网格员定期提醒')
      } else {
        insights.push('用药依从性较差')
        recommendations.push('建议使用智能药盒和手机提醒')
        recommendations.push('建议家属或网格员每天监督服药')
        recommendations.push('建议咨询医生调整用药方案')
      }

      // 添加medicationService生成的建议
      const medicationReport = await medicationService.generateMedicationReport(elderlyId, days)
      recommendations.push(...medicationReport.data.recommendations)

      return {
        adherenceScore,
        adherenceLevel,
        insights,
        recommendations
      }
    } catch (error) {
      console.error('分析用药依从性失败:', error)
      throw error
    }
  }

  // 生成综合健康风险报告
  async generateComprehensiveRiskReport(elderlyId: number, days: number = 30): Promise<string> {
    try {
      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 获取各项风险评估
      const fallRisk = await this.predictFallRisk(elderlyId, days)
      const strokeRisk = await this.predictStrokeRisk(elderlyId, days)
      const medicationAdherence = await this.analyzeMedicationAdherence(elderlyId, days)
      const emotionReport = await emotionService.generateEmotionReport(elderlyId, days)
      const cognitiveReport = await cognitiveService.generateCognitiveReport(elderlyId, days)

      // 生成报告
      let report = `综合健康风险报告 - ${elderly.name} (${elderly.age}岁)\n`
      report += `生成时间: ${new Date().toLocaleString()}\n\n`

      report += '1. 跌倒风险评估:\n'
      report += `   风险分数: ${fallRisk.riskScore}\n`
      report += `   风险等级: ${this.getRiskLevelName(fallRisk.riskLevel)}\n`
      report += '   风险因素:\n'
      fallRisk.factors.forEach((factor, index) => {
        report += `     ${index + 1}. ${factor}\n`
      })
      report += '   建议:\n'
      fallRisk.recommendations.forEach((recommendation, index) => {
        report += `     ${index + 1}. ${recommendation}\n`
      })
      report += '\n'

      report += '2. 中风风险评估:\n'
      report += `   风险分数: ${strokeRisk.riskScore}\n`
      report += `   风险等级: ${this.getRiskLevelName(strokeRisk.riskLevel)}\n`
      report += '   风险因素:\n'
      strokeRisk.factors.forEach((factor, index) => {
        report += `     ${index + 1}. ${factor}\n`
      })
      report += '   建议:\n'
      strokeRisk.recommendations.forEach((recommendation, index) => {
        report += `     ${index + 1}. ${recommendation}\n`
      })
      report += '\n'

      report += '3. 用药依从性评估:\n'
      report += `   依从性分数: ${medicationAdherence.adherenceScore}\n`
      report += `   依从性等级: ${this.getAdherenceLevelName(medicationAdherence.adherenceLevel)}\n`
      report += '   洞察:\n'
      medicationAdherence.insights.forEach((insight, index) => {
        report += `     ${index + 1}. ${insight}\n`
      })
      report += '   建议:\n'
      medicationAdherence.recommendations.forEach((recommendation, index) => {
        report += `     ${index + 1}. ${recommendation}\n`
      })
      report += '\n'

      report += '4. 情绪状态评估:\n'
      report += `   主导情绪: ${emotionReport.data.dominantEmotion}\n`
      report += `   风险等级: ${emotionReport.data.riskLevel}\n`
      report += `   情绪趋势: ${emotionReport.data.trend}\n`
      report += `   平均情绪强度: ${emotionReport.data.avgIntensity}\n`
      report += '   建议:\n'
      emotionReport.data.recommendations.forEach((recommendation, index) => {
        report += `     ${index + 1}. ${recommendation}\n`
      })
      report += '\n'

      report += '5. 认知功能评估:\n'
      report += `   认知水平: ${cognitiveReport.data.cognitiveLevel}\n`
      report += '   各项测试趋势:\n'
      cognitiveReport.data.trends.forEach((trend, index) => {
        report += `     ${index + 1}. ${trend.testType}: 平均分数 ${trend.avgScore.toFixed(1)}, 趋势 ${trend.trend}\n`
      })
      report += '   建议:\n'
      cognitiveReport.data.recommendations.forEach((recommendation, index) => {
        report += `     ${index + 1}. ${recommendation}\n`
      })

      return report
    } catch (error) {
      console.error('生成综合健康风险报告失败:', error)
      throw error
    }
  }

  // 辅助函数：获取风险等级的中文名称
  private getRiskLevelName(riskLevel: 'low' | 'medium' | 'high'): string {
    const names: Record<string, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险'
    }
    return names[riskLevel] || riskLevel
  }

  // 辅助函数：获取依从性等级的中文名称
  private getAdherenceLevelName(level: 'excellent' | 'good' | 'fair' | 'poor'): string {
    const names: Record<string, string> = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差'
    }
    return names[level] || level
  }
}

export default new HealthRiskService()