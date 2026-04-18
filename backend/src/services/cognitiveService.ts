import { CognitiveTest } from '../models'
import { Op } from 'sequelize'

class CognitiveService {
  // 创建认知测试
  async createCognitiveTest(elderlyId: number, testType: 'memory' | 'attention' | 'language' | 'executive', score: number, maxScore: number, testDuration: number, notes?: string) {
    try {
      const cognitiveTest = await CognitiveTest.create({
        elderlyId,
        testType,
        score,
        maxScore,
        testDate: new Date(),
        testDuration,
        notes
      })
      
      return { success: true, data: cognitiveTest }
    } catch (error) {
      console.error('创建认知测试失败:', error)
      throw new Error('创建认知测试失败')
    }
  }

  // 获取认知测试历史
  async getCognitiveTestHistory(elderlyId: number, testType?: 'memory' | 'attention' | 'language' | 'executive', days: number = 90) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const whereClause: Record<string, unknown> = {
        elderlyId,
        testDate: { [Op.gte]: startDate }
      }
      
      if (testType) {
        whereClause.testType = testType
      }
      
      const tests = await CognitiveTest.findAll({
        where: whereClause,
        order: [['testDate', 'ASC']]
      })
      
      return { success: true, data: tests }
    } catch (error) {
      console.error('获取认知测试历史失败:', error)
      throw new Error('获取认知测试历史失败')
    }
  }

  // 分析认知衰退趋势
  async analyzeCognitiveTrend(elderlyId: number, days: number = 180) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const tests = await CognitiveTest.findAll({
        where: {
          elderlyId,
          testDate: { [Op.gte]: startDate }
        },
        order: [['testDate', 'ASC']]
      })
      
      if (tests.length === 0) {
        return { success: true, data: { trend: 'insufficient_data', cognitiveLevel: 'unknown', recommendations: [] } }
      }
      
      // 按测试类型分组分析
      const testsByType = tests.reduce((acc, test) => {
        if (!acc[test.testType]) {
          acc[test.testType] = []
        }
        acc[test.testType].push(test)
        return acc
      }, {} as Record<string, CognitiveTest[]>)
      
      // 分析每种测试类型的趋势
      const trendsByType = Object.entries(testsByType).map(([type, typeTests]) => {
        const scores = typeTests.map(test => test.score / test.maxScore * 100)
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
        
        // 计算趋势（线性回归）
        const trend = this.calculateTrend(typeTests)
        
        return {
          testType: type,
          avgScore,
          trend,
          recentScore: scores[scores.length - 1],
          testCount: typeTests.length
        }
      })
      
      // 综合评估认知水平
      const overallCognitiveLevel = this.assessCognitiveLevel(trendsByType)
      
      // 生成建议
      const recommendations = this.generateCognitiveRecommendations(
        trendsByType.map(item => ({
          testType: item.testType as 'memory' | 'attention' | 'language' | 'executive',
          trend: item.trend
        })),
        overallCognitiveLevel
      )
      
      return {
        success: true,
        data: {
          trends: trendsByType,
          cognitiveLevel: overallCognitiveLevel,
          recommendations
        }
      }
    } catch (error) {
      console.error('分析认知衰退趋势失败:', error)
      throw new Error('分析认知衰退趋势失败')
    }
  }

  // 计算趋势
  private calculateTrend(tests: CognitiveTest[]): 'improving' | 'declining' | 'stable' {
    if (tests.length < 2) {
      return 'stable'
    }
    
    // 简单线性回归
    const n = tests.length
    const xValues = tests.map((_, index) => index)
    const yValues = tests.map(test => test.score / test.maxScore * 100)
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = yValues.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, index) => sum + x * yValues[index], 0)
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    if (slope > 1) {
      return 'improving'
    } else if (slope < -1) {
      return 'declining'
    } else {
      return 'stable'
    }
  }

  // 评估认知水平
  private assessCognitiveLevel(trends: Array<{ avgScore: number }>): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgScores = trends.map(trend => trend.avgScore)
    const overallAvg = avgScores.reduce((sum, score) => sum + score, 0) / avgScores.length
    
    if (overallAvg >= 90) {
      return 'excellent'
    } else if (overallAvg >= 75) {
      return 'good'
    } else if (overallAvg >= 60) {
      return 'fair'
    } else {
      return 'poor'
    }
  }

  // 生成认知建议
  private generateCognitiveRecommendations(trends: Array<{ trend: 'improving' | 'declining' | 'stable'; testType: 'memory' | 'attention' | 'language' | 'executive' }>, cognitiveLevel: 'excellent' | 'good' | 'fair' | 'poor'): string[] {
    const recommendations: string[] = []
    
    // 根据认知水平生成建议
    if (cognitiveLevel === 'poor') {
      recommendations.push('建议寻求专业认知评估')
      recommendations.push('增加认知训练频率')
      recommendations.push('建议家属密切关注认知变化')
    } else if (cognitiveLevel === 'fair') {
      recommendations.push('建议每周进行3-5次认知训练')
      recommendations.push('增加社交活动，保持大脑活跃')
    } else if (cognitiveLevel === 'good') {
      recommendations.push('建议每周进行2-3次认知训练')
      recommendations.push('保持健康的生活方式')
    } else {
      recommendations.push('继续保持良好的认知状态')
      recommendations.push('定期进行认知测试')
    }
    
    // 根据具体测试类型的趋势生成建议
    trends.forEach(trend => {
      if (trend.trend === 'declining') {
        switch (trend.testType) {
          case 'memory':
            recommendations.push('建议进行记忆训练，如数字记忆、图片记忆等')
            break
          case 'attention':
            recommendations.push('建议进行注意力训练，如找不同、舒尔特方格等')
            break
          case 'language':
            recommendations.push('建议多读书、多交流，保持语言能力')
            break
          case 'executive':
            recommendations.push('建议进行逻辑思维训练，如下棋、解谜等')
            break
        }
      }
    })
    
    return recommendations
  }

  // 生成认知测试报告
  async generateCognitiveReport(elderlyId: number, days: number = 180) {
    try {
      const { data } = await this.analyzeCognitiveTrend(elderlyId, days)
      
      const report = {
        elderlyId,
        period: `${days}天`,
        cognitiveLevel: data.cognitiveLevel,
        trends: data.trends,
        recommendations: data.recommendations
      }
      
      return { success: true, data: report }
    } catch (error) {
      console.error('生成认知测试报告失败:', error)
      throw new Error('生成认知测试报告失败')
    }
  }

  // 生成游戏化认知测试任务
  async generateGamifiedTest(elderlyId: number, testType: 'memory' | 'attention' | 'language' | 'executive') {
    try {
      // 根据测试类型生成不同的游戏化任务
      let task: Record<string, unknown> = {}
      
      switch (testType) {
        case 'memory': {
          // 数字记忆任务
          const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10))
          task = {
            type: 'memory',
            name: '数字记忆挑战',
            description: '请记住以下数字，稍后会询问你',
            content: numbers.join(' '),
            expectedAnswer: numbers.join(''),
            timeLimit: 30 // 秒
          }
          break
        }
        
        case 'attention': {
          // 找不同任务
          task = {
            type: 'attention',
            name: '找不同挑战',
            description: '请找出两张图片的不同之处',
            content: '图片URL1,图片URL2', // 实际项目中使用真实图片
            expectedAnswer: '3', // 不同之处的数量
            timeLimit: 60 // 秒
          }
          break
        }
        
        case 'language': {
          // 词语联想任务
          const words = ['苹果', '香蕉', '橙子', '葡萄']
          task = {
            type: 'language',
            name: '词语联想挑战',
            description: '请说出与以下词语相关的其他水果',
            content: words.join(','),
            expectedAnswer: '至少3个',
            timeLimit: 45 // 秒
          }
          break
        }
        
        case 'executive': {
          // 逻辑推理任务
          task = {
            type: 'executive',
            name: '逻辑推理挑战',
            description: '请根据规律填写缺失的数字: 1, 3, 5, 7, ?',
            content: '1, 3, 5, 7, ?',
            expectedAnswer: '9',
            timeLimit: 20 // 秒
          }
          break
        }
      }
      
      return { success: true, data: task }
    } catch (error) {
      console.error('生成游戏化认知测试任务失败:', error)
      throw new Error('生成游戏化认知测试任务失败')
    }
  }
}

export default new CognitiveService()