import { EmotionRecord } from '../models'
import { Op } from 'sequelize'
import { agentService } from './agentService'

class EmotionService {
  // 分析语音情感
  async analyzeVoiceEmotion(elderlyId: number, audioData: string) {
    try {
      // 调用AI服务分析语音情感
      const emotionAnalysis = await agentService.analyzeEmotion(audioData, 'voice') as { emotionType: string; intensity: number; context: string }
      
      // 保存情绪记录
      const emotionRecord = await EmotionRecord.create({
        elderlyId,
        emotionType: emotionAnalysis.emotionType as 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral',
        intensity: emotionAnalysis.intensity,
        analysisMethod: 'voice',
        context: emotionAnalysis.context
      })
      
      // 检查是否需要生成预警
      if (this.shouldGenerateWarning(emotionAnalysis.emotionType, emotionAnalysis.intensity)) {
        // 这里可以调用预警服务
        console.log('情绪异常，需要生成预警')
      }
      
      return { success: true, data: emotionRecord }
    } catch (error) {
      console.error('语音情感分析失败:', error)
      throw new Error('语音情感分析失败')
    }
  }

  // 分析文本情感
  async analyzeTextEmotion(elderlyId: number, text: string) {
    try {
      // 调用AI服务分析文本情感
      const emotionAnalysis = await agentService.analyzeEmotion(text, 'text') as { emotionType: string; intensity: number; context: string }
      
      // 保存情绪记录
      const emotionRecord = await EmotionRecord.create({
        elderlyId,
        emotionType: emotionAnalysis.emotionType as 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral',
        intensity: emotionAnalysis.intensity,
        analysisMethod: 'text',
        context: text
      })
      
      // 检查是否需要生成预警
      if (this.shouldGenerateWarning(emotionAnalysis.emotionType, emotionAnalysis.intensity)) {
        // 这里可以调用预警服务
        console.log('情绪异常，需要生成预警')
      }
      
      return { success: true, data: emotionRecord }
    } catch (error) {
      console.error('文本情感分析失败:', error)
      throw new Error('文本情感分析失败')
    }
  }

  // 分析行为情感（基于活动模式）
  async analyzeBehaviorEmotion(elderlyId: number) {
    try {
      // 这里可以基于活动模式分析情绪
      // 例如：长时间独处、活动量骤减可能表示情绪低落
      
      // 暂时返回默认值，实际项目中需要更复杂的分析
      const emotionRecord = await EmotionRecord.create({
        elderlyId,
        emotionType: 'neutral',
        intensity: 5,
        analysisMethod: 'behavior',
        context: '基于活动模式分析'
      })
      
      return { success: true, data: emotionRecord }
    } catch (error) {
      console.error('行为情感分析失败:', error)
      throw new Error('行为情感分析失败')
    }
  }

  // 获取情绪趋势
  async getEmotionTrend(elderlyId: number, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const emotionRecords = await EmotionRecord.findAll({
        where: {
          elderlyId,
          createdAt: { [Op.gte]: startDate }
        },
        order: [['createdAt', 'ASC']]
      })
      
      // 分析情绪趋势
      const trend = this.analyzeEmotionTrend(emotionRecords)
      
      return { success: true, data: { records: emotionRecords, trend } }
    } catch (error) {
      console.error('获取情绪趋势失败:', error)
      throw new Error('获取情绪趋势失败')
    }
  }

  // 分析情绪趋势
  private analyzeEmotionTrend(records: EmotionRecord[]) {
    if (records.length === 0) {
      return { trend: 'stable' as const, dominantEmotion: 'neutral' as const, riskLevel: 'low' as const, avgIntensity: 0 }
    }
    
    // 计算情绪分布
    const emotionCounts = records.reduce((acc, record) => {
      acc[record.emotionType] = (acc[record.emotionType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // 计算平均强度
    const avgIntensity = records.reduce((sum, record) => sum + record.intensity, 0) / records.length
    
    // 确定主导情绪
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral'
    
    // 评估风险水平
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    let trend: 'improving' | 'deteriorating' | 'stable' = 'stable'
    
    if (dominantEmotion === 'sad' || dominantEmotion === 'anxious' || dominantEmotion === 'angry') {
      riskLevel = avgIntensity > 7 ? 'high' : 'medium'
    }
    
    // 简单趋势分析（比较最近7天和之前的情绪）
    if (records.length > 7) {
      const recentRecords = records.slice(-7)
      const olderRecords = records.slice(0, -7)
      
      const recentAvgIntensity = recentRecords.reduce((sum, record) => sum + record.intensity, 0) / recentRecords.length
      const olderAvgIntensity = olderRecords.reduce((sum, record) => sum + record.intensity, 0) / olderRecords.length
      
      if (recentAvgIntensity > olderAvgIntensity + 1) {
        trend = 'deteriorating'
      } else if (recentAvgIntensity < olderAvgIntensity - 1) {
        trend = 'improving'
      }
    }
    
    return { trend, dominantEmotion, riskLevel, avgIntensity }
  }

  // 检查是否需要生成预警
  private shouldGenerateWarning(emotionType: string, intensity: number): boolean {
    // 情绪异常且强度高时生成预警
    return (emotionType === 'sad' || emotionType === 'anxious' || emotionType === 'angry') && intensity > 7
  }

  // 生成情绪分析报告
  async generateEmotionReport(elderlyId: number, days: number = 30) {
    try {
      const { data } = await this.getEmotionTrend(elderlyId, days)
      
      const report = {
        elderlyId,
        period: `${days}天`,
        dominantEmotion: data.trend.dominantEmotion,
        riskLevel: data.trend.riskLevel,
        trend: data.trend.trend,
        avgIntensity: data.trend.avgIntensity,
        recordCount: data.records.length,
        recommendations: this.generateEmotionRecommendations(data.trend as { riskLevel: 'low' | 'medium' | 'high'; trend: 'improving' | 'deteriorating' | 'stable'; dominantEmotion: 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral' })
      }
      
      return { success: true, data: report }
    } catch (error) {
      console.error('生成情绪分析报告失败:', error)
      throw new Error('生成情绪分析报告失败')
    }
  }

  // 生成情绪建议
  private generateEmotionRecommendations(trend: { riskLevel: 'low' | 'medium' | 'high'; trend: 'improving' | 'deteriorating' | 'stable'; dominantEmotion: 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral' }): string[] {
    const recommendations: string[] = []
    
    if (trend.riskLevel === 'high') {
      recommendations.push('建议家属增加陪伴时间')
      recommendations.push('建议社区网格员进行心理疏导')
      recommendations.push('考虑安排专业心理咨询')
    } else if (trend.riskLevel === 'medium') {
      recommendations.push('建议增加社交活动')
      recommendations.push('鼓励参与社区活动')
    }
    
    if (trend.trend === 'deteriorating') {
      recommendations.push('需要密切关注情绪变化')
    }
    
    if (trend.dominantEmotion === 'sad') {
      recommendations.push('建议播放老人喜欢的音乐或戏曲')
      recommendations.push('回忆往事，分享快乐的经历')
    }
    
    return recommendations
  }
}

export default new EmotionService()