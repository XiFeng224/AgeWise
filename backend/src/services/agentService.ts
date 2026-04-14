import { User, Elderly, Warning, ServiceRecord, HealthRecord } from '../models'
import { Op } from 'sequelize'
import { spawn } from 'child_process'
import path from 'path'

const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY
const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

class AgentService {
  /**
   * 处理自然语言查询
   * @param query 自然语言查询字符串
   * @returns 处理后的查询结果
   */
  async processNaturalLanguageQuery(query: string): Promise<any> {
    try {
      if (!query || query.trim() === '') {
        return {
          success: false,
          error: '查询内容不能为空'
        }
      }

      // 优先调用千问（若已配置）
      const qwenResult = await this.callQwenAgent(query)
      if (qwenResult?.intent) {
        const result = await this.executeQuery(qwenResult, query)
        return {
          success: true,
          intent: qwenResult.intent,
          query,
          sql: qwenResult.sql_hint || this.generateSqlQuery(qwenResult, query),
          data: result.data,
          summary: result.summary,
          modelSource: 'qwen'
        }
      }

      // 次选：Python NLP Agent
      const nlpResult = await this.callNlpAgent(query)
      if (nlpResult?.intent) {
        const result = await this.executeQuery(nlpResult, query)
        return {
          success: true,
          intent: nlpResult.intent,
          query,
          sql: nlpResult.sql_hint || this.generateSqlQuery(nlpResult, query),
          data: result.data,
          summary: result.summary,
          modelSource: 'nlp'
        }
      }

      // 兜底：本地规则
      const processedQuery = query.toLowerCase().trim()
      const intent = this.analyzeIntent(processedQuery)
      const sqlQuery = this.generateSqlQuery(intent, processedQuery)
      const result = await this.executeQuery(intent, processedQuery)

      return {
        success: true,
        intent: intent.type,
        query,
        sql: sqlQuery,
        data: result.data,
        summary: result.summary,
        modelSource: 'rule'
      }
    } catch (error) {
      console.error('处理自然语言查询失败:', error)
      return {
        success: false,
        error: '处理查询失败，请尝试使用更明确的语言'
      }
    }
  }

  /**
   * 调用千问进行意图识别
   */
  private async callQwenAgent(query: string): Promise<any> {
    try {
      if (!QWEN_API_KEY) return null

      const response = await fetch(QWEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${QWEN_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: [
            {
              role: 'system',
              content: '你是社区养老系统NLP解析器。请将用户问题解析为JSON：{"intent":"query_elderly_info|query_health_status|query_service_records|query_warnings|statistical_analysis","entities":{},"sql_hint":""}，不要输出其他内容。'
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.1
        })
      })

      if (!response.ok) return null
      const data: any = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) return null
      try {
        return JSON.parse(content)
      } catch {
        const match = content.match(/\{[\s\S]*\}/)
        return match ? JSON.parse(match[0]) : null
      }
    } catch (error) {
      console.error('调用千问失败:', error)
      return null
    }
  }

  /**
   * 调用Python NLP Agent
   * @param query 自然语言查询字符串
   * @returns NLP Agent的分析结果
   */
  private async callNlpAgent(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // 构建Python脚本路径
        const pythonScriptPath = path.join(__dirname, '../../../agent-service/run_nlp_agent.py')
        
        // 启动Python进程
        const pythonProcess = spawn('python', [pythonScriptPath, query])
        
        let output = ''
        let error = ''
        
        // 收集标准输出
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString()
        })
        
        // 收集标准错误
        pythonProcess.stderr.on('data', (data) => {
          error += data.toString()
        })
        
        // 处理进程结束
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              // 解析Python脚本的输出
              const result = JSON.parse(output)
              resolve(result)
            } catch (parseError) {
              console.error('解析NLP Agent输出失败:', parseError)
              resolve(null)
            }
          } else {
            console.error('NLP Agent执行失败:', error)
            resolve(null)
          }
        })
        
        // 处理进程错误
        pythonProcess.on('error', (err) => {
          console.error('启动NLP Agent失败:', err)
          resolve(null)
        })
        
        // 设置超时
        setTimeout(() => {
          pythonProcess.kill()
          resolve(null)
        }, 10000) // 10秒超时
        
      } catch (err) {
        console.error('调用NLP Agent失败:', err)
        resolve(null)
      }
    })
  }
  private analyzeIntent(query: string): any {
    // 意图类型定义
    const intentTypes = {
      elderlyCount: /(有多少|统计|数量).*老人|老人.*数量/,
      elderlyByAge: /(年龄|多少岁).*老人|老人.*年龄/,
      elderlyByHealth: /(健康|身体状况).*老人|老人.*健康/,
      elderlyByRisk: /(风险|预警).*老人|老人.*风险/,
      elderlyDetails: /(详细|信息).*老人|老人.*详细/,
      warningCount: /(预警|警告).*数量|(有多少|统计).*预警/,
      warningByLevel: /(风险等级|级别).*预警|预警.*风险等级/,
      serviceCount: /(服务|记录).*数量|(有多少|统计).*服务/,
      serviceByType: /(服务类型|类型).*服务|服务.*服务类型/,
      healthRecords: /(健康档案|健康记录).*老人|老人.*健康档案/,
      help: /(帮助|使用|怎么|如何)/
    }

    // 匹配意图
    for (const [type, pattern] of Object.entries(intentTypes)) {
      if (pattern.test(query)) {
        return { type }
      }
    }

    // 默认意图
    return { type: 'general' }
  }

  /**
   * 生成SQL查询
   * @param intent 意图分析结果
   * @param query 处理后的查询字符串
   * @returns SQL查询字符串
   */
  private generateSqlQuery(intent: any, query: string): string {
    switch (intent.type) {
      case 'elderlyCount':
        return 'SELECT COUNT(*) as count FROM elderly'
      case 'elderlyByAge':
        if (query.includes('80')) {
          return 'SELECT * FROM elderly WHERE age > 80'
        } else if (query.includes('70')) {
          return 'SELECT * FROM elderly WHERE age > 70'
        }
        return 'SELECT * FROM elderly ORDER BY age DESC'
      case 'elderlyByHealth':
        return 'SELECT healthStatus, COUNT(*) as count FROM elderly GROUP BY healthStatus'
      case 'elderlyByRisk':
        return 'SELECT riskLevel, COUNT(*) as count FROM elderly GROUP BY riskLevel'
      case 'warningCount':
        return 'SELECT COUNT(*) as count FROM warnings'
      case 'warningByLevel':
        return 'SELECT riskLevel, COUNT(*) as count FROM warnings GROUP BY riskLevel'
      case 'serviceCount':
        return 'SELECT COUNT(*) as count FROM service_records'
      case 'serviceByType':
        return 'SELECT serviceType, COUNT(*) as count FROM service_records GROUP BY serviceType'
      case 'healthRecords':
        return 'SELECT * FROM health_records ORDER BY recordDate DESC LIMIT 10'
      default:
        return 'SELECT * FROM elderly LIMIT 10'
    }
  }

  /**
   * 执行查询
   * @param intent 意图分析结果
   * @param query 处理后的查询字符串
   * @returns 查询结果
   */
  private async executeQuery(intent: any, query: string): Promise<any> {
    // 处理来自NLP Agent的意图
    if (intent.intent) {
      switch (intent.intent) {
        case 'query_elderly_info':
          // 处理老人信息查询
          const elderlyName = intent.entities?.name
          let elderlyInfo
          if (elderlyName) {
            elderlyInfo = await Elderly.findAll({ 
              where: { name: { [Op.like]: `%${elderlyName}%` } } 
            })
          } else {
            elderlyInfo = await Elderly.findAll({ limit: 10 })
          }
          return {
            data: elderlyInfo,
            summary: `找到 ${elderlyInfo.length} 位老人的信息`
          }
        
        case 'query_health_status':
          // 处理健康状况查询
          const recordType = intent.entities?.record_type
          let healthRecords
          if (recordType) {
            healthRecords = await HealthRecord.findAll({ 
              where: { recordType },
              include: [{ model: Elderly, as: 'elderly' }],
              limit: 10
            })
          } else {
            healthRecords = await HealthRecord.findAll({ 
              include: [{ model: Elderly, as: 'elderly' }],
              order: [['recordDate', 'DESC']],
              limit: 10
            })
          }
          return {
            data: healthRecords,
            summary: `找到 ${healthRecords.length} 条健康记录`
          }
        
        case 'query_service_records':
          // 处理服务记录查询
          const serviceRecords = await ServiceRecord.findAll({ 
            include: [{ model: Elderly, as: 'elderly' }],
            order: [['serviceDate', 'DESC']],
            limit: 10
          })
          return {
            data: serviceRecords,
            summary: `找到 ${serviceRecords.length} 条服务记录`
          }
        
        case 'query_warnings':
          // 处理预警信息查询
          const riskLevel = intent.entities?.risk_level
          let warnings
          if (riskLevel) {
            warnings = await Warning.findAll({ 
              where: { riskLevel },
              include: [{ model: Elderly, as: 'elderly' }],
              limit: 10
            })
          } else {
            warnings = await Warning.findAll({ 
              include: [{ model: Elderly, as: 'elderly' }],
              order: [['createdAt', 'DESC']],
              limit: 10
            })
          }
          return {
            data: warnings,
            summary: `找到 ${warnings.length} 条预警信息`
          }
        
        case 'statistical_analysis':
          // 处理统计分析
          const stats = await Elderly.findAll({
            attributes: ['riskLevel', [Elderly.sequelize?.fn('COUNT', Elderly.sequelize?.col('id')), 'count']],
            group: ['riskLevel']
          })
          return {
            data: stats,
            summary: '老人风险等级分布统计'
          }
        
        default:
          // 默认处理
          const generalElderly = await Elderly.findAll({ limit: 10 })
          return {
            data: generalElderly,
            summary: '系统中的老人信息'
          }
      }
    }
    
    // 处理本地规则的意图
    switch (intent.type) {
      case 'elderlyCount':
        const elderlyCount = await Elderly.count()
        return {
          data: [{ count: elderlyCount }],
          summary: `系统中共有 ${elderlyCount} 位老人`
        }
      
      case 'elderlyByAge':
        let elderlyByAge
        if (query.includes('80')) {
          elderlyByAge = await Elderly.findAll({ where: { age: { [Op.gt]: 80 } } })
        } else if (query.includes('70')) {
          elderlyByAge = await Elderly.findAll({ where: { age: { [Op.gt]: 70 } } })
        } else {
          elderlyByAge = await Elderly.findAll({ order: [['age', 'DESC']] })
        }
        return {
          data: elderlyByAge,
          summary: `找到 ${elderlyByAge.length} 位符合条件的老人`
        }
      
      case 'elderlyByHealth':
        const healthStats = await Elderly.findAll({
          attributes: ['healthStatus', [Elderly.sequelize?.fn('COUNT', Elderly.sequelize?.col('id')), 'count']],
          group: ['healthStatus']
        })
        return {
          data: healthStats,
          summary: '老人健康状况分布统计'
        }
      
      case 'elderlyByRisk':
        const riskStats = await Elderly.findAll({
          attributes: ['riskLevel', [Elderly.sequelize?.fn('COUNT', Elderly.sequelize?.col('id')), 'count']],
          group: ['riskLevel']
        })
        return {
          data: riskStats,
          summary: '老人风险等级分布统计'
        }
      
      case 'warningCount':
        const warningCount = await Warning.count()
        return {
          data: [{ count: warningCount }],
          summary: `系统中共有 ${warningCount} 条预警记录`
        }
      
      case 'warningByLevel':
        const warningLevelStats = await Warning.findAll({
          attributes: ['riskLevel', [Warning.sequelize?.fn('COUNT', Warning.sequelize?.col('id')), 'count']],
          group: ['riskLevel']
        })
        return {
          data: warningLevelStats,
          summary: '预警风险等级分布统计'
        }
      
      case 'serviceCount':
        const serviceCount = await ServiceRecord.count()
        return {
          data: [{ count: serviceCount }],
          summary: `系统中共有 ${serviceCount} 条服务记录`
        }
      
      case 'serviceByType':
        const serviceTypeStats = await ServiceRecord.findAll({
          attributes: ['serviceType', [ServiceRecord.sequelize?.fn('COUNT', ServiceRecord.sequelize?.col('id')), 'count']],
          group: ['serviceType']
        })
        return {
          data: serviceTypeStats,
          summary: '服务类型分布统计'
        }
      
      case 'healthRecords':
        const healthRecords = await HealthRecord.findAll({
          include: [{ model: Elderly, as: 'elderly' }],
          order: [['recordDate', 'DESC']],
          limit: 10
        })
        return {
          data: healthRecords,
          summary: '最近的健康档案记录'
        }
      
      case 'help':
        return {
          data: [
            { example: '有多少位老人？', description: '统计系统中的老人数量' },
            { example: '80岁以上的老人有哪些？', description: '查询80岁以上的老人信息' },
            { example: '老人的健康状况如何？', description: '统计老人的健康状况分布' },
            { example: '有多少条预警记录？', description: '统计系统中的预警记录数量' },
            { example: '最近的健康档案有哪些？', description: '查询最近的健康档案记录' }
          ],
          summary: '您可以使用以下方式进行查询'
        }
      
      default:
        const generalElderly = await Elderly.findAll({ limit: 10 })
        return {
          data: generalElderly,
          summary: '系统中的老人信息'
        }
    }
  }

  /**
   * 处理高级搜索
   * @param filters 筛选条件
   * @returns 搜索结果
   */
  async processAdvancedSearch(filters: any): Promise<any> {
    try {
      // 构建查询条件
      const whereCondition: any = {}
      
      // 处理年龄范围
      if (filters.ageRange && filters.ageRange.length === 2) {
        const [minAge, maxAge] = filters.ageRange
        if (minAge) {
          whereCondition.age = { ...whereCondition.age, [Op.gte]: minAge }
        }
        if (maxAge) {
          whereCondition.age = { ...whereCondition.age, [Op.lte]: maxAge }
        }
      }
      
      // 处理性别
      if (filters.gender) {
        const genderMap: Record<string, string> = {
          '男': 'male',
          '女': 'female',
          male: 'male',
          female: 'female'
        }
        whereCondition.gender = genderMap[filters.gender] || filters.gender
      }
      
      // 处理健康状况
      if (filters.healthStatus) {
        whereCondition.healthStatus = filters.healthStatus
      }
      
      // 处理风险等级
      if (filters.riskLevel) {
        whereCondition.riskLevel = filters.riskLevel
      }
      
      // 处理住址
      if (filters.address) {
        whereCondition.address = { [Op.like]: `%${filters.address}%` }
      }
      
      // 执行查询
      const elderlyList = await Elderly.findAll({
        where: whereCondition,
        limit: 100
      })
      
      // 生成SQL查询
      let sqlQuery = 'SELECT * FROM elderly WHERE 1=1'
      if (filters.ageRange && filters.ageRange.length === 2) {
        const [minAge, maxAge] = filters.ageRange
        if (minAge) {
          sqlQuery += ` AND age >= ${minAge}`
        }
        if (maxAge) {
          sqlQuery += ` AND age <= ${maxAge}`
        }
      }
      if (filters.gender) {
        sqlQuery += ` AND gender = '${filters.gender}'`
      }
      if (filters.healthStatus) {
        sqlQuery += ` AND healthStatus = '${filters.healthStatus}'`
      }
      if (filters.riskLevel) {
        sqlQuery += ` AND riskLevel = '${filters.riskLevel}'`
      }
      if (filters.address) {
        sqlQuery += ` AND address LIKE '%${filters.address}%'`
      }
      
      return {
        success: true,
        data: elderlyList,
        summary: `找到 ${elderlyList.length} 位符合条件的老人`,
        sql: sqlQuery
      }
    } catch (error) {
      console.error('处理高级搜索失败:', error)
      return {
        success: false,
        error: '搜索处理失败'
      }
    }
  }

  /**
   * 获取查询建议
   * @param input 用户输入
   * @returns 查询建议列表
   */
  getQuerySuggestions(input: string): string[] {
    const suggestions = [
      '有多少位老人？',
      '80岁以上的老人有哪些？',
      '老人的健康状况如何？',
      '老人的风险等级分布？',
      '有多少条预警记录？',
      '预警的风险等级分布？',
      '有多少条服务记录？',
      '服务类型的分布？',
      '最近的健康档案有哪些？',
      '如何使用智能查询？'
    ]

    if (!input) {
      return suggestions
    }

    // 根据输入过滤建议
    return suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(input.toLowerCase())
    )
  }

  /**
   * 分析情感
   * @param data 输入数据（语音或文本）
   * @param type 分析类型（voice 或 text）
   * @returns 情感分析结果
   */
  async analyzeEmotion(data: string, type: 'voice' | 'text'): Promise<any> {
    try {
      // 模拟情感分析结果
      // 实际项目中应该调用真实的情感分析API
      const emotions = ['happy', 'sad', 'anxious', 'angry', 'neutral']
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
      const randomIntensity = Math.floor(Math.random() * 10) + 1

      return {
        emotionType: randomEmotion,
        intensity: randomIntensity,
        context: type === 'voice' ? '语音分析' : '文本分析'
      }
    } catch (error) {
      console.error('情感分析失败:', error)
      throw new Error('情感分析失败')
    }
  }
}

// 导出单例实例
export const agentService = new AgentService()
export default agentService
