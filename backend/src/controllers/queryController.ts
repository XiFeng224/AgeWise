import { Request, Response } from 'express'
import { agentService } from '../services/agentService'
import { cacheService } from '../services/cacheService'
import { aiMetricsService } from '../services/aiMetricsService'

const isDemoMode = process.env.DEMO_MODE === 'true'

const buildExplainability = (query: string, result: any) => {
  const lowered = query.toLowerCase()
  const data = Array.isArray(result?.data) ? result.data : []

  if (lowered.includes('风险') || lowered.includes('预警')) {
    return {
      riskLevel: data.length > 0 ? 'high' : 'medium',
      confidence: data.length > 0 ? 0.9 : 0.72,
      riskScore: data.length > 0 ? 86 : 68,
      factors: [
        '近期预警触发频次',
        '老人基础风险等级',
        '健康记录异常项数量'
      ],
      factorWeights: [
        { name: '预警触发频次', weight: 0.4 },
        { name: '基础风险等级', weight: 0.35 },
        { name: '健康异常项', weight: 0.25 }
      ],
      recommendedActions: [
        '立即电话回访并确认状态',
        '安排网格员2小时内上门核查',
        '将处理进度更新到预警工单'
      ]
    }
  }

  if (lowered.includes('健康') || lowered.includes('血压') || lowered.includes('血糖')) {
    return {
      riskLevel: 'medium',
      confidence: 0.84,
      riskScore: 62,
      factors: ['健康指标波动趋势', '慢病历史记录', '随访间隔时长'],
      factorWeights: [
        { name: '指标波动', weight: 0.45 },
        { name: '慢病史', weight: 0.35 },
        { name: '随访间隔', weight: 0.2 }
      ],
      recommendedActions: ['安排本周复测', '更新健康档案', '同步家属注意事项']
    }
  }

  return {
    riskLevel: 'low',
    confidence: 0.78,
    riskScore: 34,
    factors: ['基础档案信息', '历史服务记录'],
    factorWeights: [
      { name: '基础档案', weight: 0.6 },
      { name: '服务记录', weight: 0.4 }
    ],
    recommendedActions: ['继续日常跟踪', '按周更新服务记录']
  }
}

// 自然语言查询
export const naturalLanguageQuery = async (req: Request, res: Response) => {
  try {
    const { query, modelPreference, deepThink, searchMode } = req.body

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '查询内容不能为空'
      })
    }

    // 尝试从缓存获取
    const cacheKey = `query:${query}:mode:${isDemoMode ? 'demo' : 'live'}`
    const cachedResult = await cacheService.get(cacheKey)
    if (cachedResult) {
      return res.json(cachedResult)
    }

    const startedAt = Date.now()

    // 处理自然语言查询
    const result = await agentService.processNaturalLanguageQuery(query, {
      modelPreference,
      deepThink: Boolean(deepThink),
      searchMode: Boolean(searchMode)
    })

    const modelSource = (result as any)?.modelSource || 'unknown'
    const resultAny = result as any
    const enrichedResult = {
      ...(result as Record<string, unknown>),
      explainability: buildExplainability(query, result),
      mode: isDemoMode ? 'demo' : 'live',
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      success: Boolean(resultAny?.success),
      answer: resultAny?.answer || '',
      shouldEscalate: Boolean(resultAny?.shouldEscalate),
      suggestedAction: resultAny?.suggestedAction || [],
      modelSource
    }

    // 缓存结果
    await cacheService.set(cacheKey, enrichedResult, 300)

    aiMetricsService.recordQuery({
      success: Boolean(enrichedResult.success),
      usedFallback: (result as any)?.modelSource !== 'qwen',
      confidence: enrichedResult.explainability?.confidence,
      riskLevel: enrichedResult.explainability?.riskLevel,
      source: (result as any)?.modelSource || 'unknown',
      query,
      latencyMs: enrichedResult.latencyMs
    })

    return res.json(enrichedResult)
  } catch (error) {
    console.error('自然语言查询失败:', error)
    return res.status(500).json({
      success: false,
      error: '查询处理失败'
    })
  }
}

// 高级搜索
export const advancedSearch = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body

    if (!filters) {
      return res.status(400).json({
        success: false,
        error: '筛选条件不能为空'
      })
    }

    // 处理高级搜索
    const result = await agentService.processAdvancedSearch(filters)

    return res.json(result)
  } catch (error) {
    console.error('高级搜索失败:', error)
    return res.status(500).json({
      success: false,
      error: '搜索处理失败'
    })
  }
}

// 获取查询建议
export const getQuerySuggestions = (req: Request, res: Response) => {
  try {
    const { input } = req.query
    const suggestions = agentService.getQuerySuggestions(input as string)

    return res.json({
      success: true,
      data: suggestions
    })
  } catch (error) {
    console.error('获取查询建议失败:', error)
    return res.status(500).json({
      success: false,
      error: '获取查询建议失败'
    })
  }
}

// 获取查询历史
export const getQueryHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId

    // 这里可以实现真实的查询历史记录功能
    // 暂时返回模拟数据
    const history = [
      {
        id: 1,
        userId,
        query: '有多少位老人？',
        resultCount: 1,
        executionTime: '0.02s',
        createdAt: new Date('2025-03-29 10:00:00')
      },
      {
        id: 2,
        query: '80岁以上的老人有哪些？',
        resultCount: 5,
        executionTime: '0.03s',
        createdAt: new Date('2025-03-29 09:30:00')
      },
      {
        id: 3,
        query: '有多少条预警记录？',
        resultCount: 1,
        executionTime: '0.01s',
        createdAt: new Date('2025-03-29 09:00:00')
      }
    ]

    return res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('获取查询历史失败:', error)
    return res.status(500).json({
      success: false,
      error: '获取查询历史失败'
    })
  }
}
