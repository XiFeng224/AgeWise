import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { statisticsService } from '../services/statisticsService'
import { Elderly, ServiceRecord, Warning } from '../models'
import { cacheService } from '../services/cacheService'
import { sendError, sendSuccess } from '../utils/response'

const isDemoMode = process.env.DEMO_MODE === 'true'
const STATS_CACHE_TTL = 60
const DIST_CACHE_TTL = 120

const buildCacheKey = (prefix: string, req: Request) => {
  const queryKey = JSON.stringify(req.query || {})
  return `stats:${prefix}:${queryKey}`
}

const getStatistics = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('overview', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    let data: any

    if (isDemoMode) {
      data = {
        totalElderly: 156,
        highRiskElderly: 12,
        todayWarnings: 8,
        pendingWarnings: 11,
        totalServices: 210,
        completedServices: 198,
        satisfactionRate: 98.5,
        mode: 'demo'
      }
    } else {
      const [
        totalElderly,
        highRiskElderly,
        todayWarnings,
        pendingWarnings,
        totalServices,
        completedServices
      ] = await Promise.all([
        Elderly.count(),
        Elderly.count({ where: { riskLevel: 'high' } }),
        Warning.count({
          where: {
            created_at: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        Warning.count({ where: { status: 'pending' } }),
        ServiceRecord.count(),
        ServiceRecord.count({ where: { rating: { [Op.gte]: 4 } } })
      ])

      const satisfactionRate = totalServices > 0
        ? Number(((completedServices / totalServices) * 100).toFixed(1))
        : 100

      data = {
        totalElderly,
        highRiskElderly,
        todayWarnings,
        pendingWarnings,
        totalServices,
        completedServices,
        satisfactionRate,
        mode: 'live'
      }
    }

    await cacheService.set(cacheKey, data, STATS_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取统计数据错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getRiskStatistics = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('risk-overview', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    let data: any

    if (isDemoMode) {
      data = {
        total: 45,
        high: 8,
        medium: 12,
        low: 25,
        trend: [
          { date: '2026-04-04', count: 4 },
          { date: '2026-04-05', count: 5 },
          { date: '2026-04-06', count: 6 },
          { date: '2026-04-07', count: 7 },
          { date: '2026-04-08', count: 6 },
          { date: '2026-04-09', count: 8 },
          { date: '2026-04-10', count: 9 }
        ],
        mode: 'demo'
      }
    } else {
      const [high, medium, low] = await Promise.all([
        Warning.count({ where: { riskLevel: 'high' } }),
        Warning.count({ where: { riskLevel: 'medium' } }),
        Warning.count({ where: { riskLevel: 'low' } })
      ])

      const total = high + medium + low

      data = {
        total,
        high,
        medium,
        low,
        trend: [],
        mode: 'live'
      }
    }

    await cacheService.set(cacheKey, data, STATS_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取风险统计错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getAgeDistribution = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('age-distribution', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    const data = await statisticsService.getAgeDistribution()
    await cacheService.set(cacheKey, data, DIST_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取年龄分布错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getHealthStatusDistribution = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('health-distribution', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    const data = await statisticsService.getHealthStatusDistribution()
    await cacheService.set(cacheKey, data, DIST_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取健康状况分布错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getRiskDistribution = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('risk-distribution', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    const data = await statisticsService.getRiskDistribution()
    await cacheService.set(cacheKey, data, DIST_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取风险等级分布错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getServiceTrend = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('service-trend', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    const { months = 6 } = req.query
    const data = await statisticsService.getServiceTrend(parseInt(months as string))
    await cacheService.set(cacheKey, data, DIST_CACHE_TTL)
    return sendSuccess(res, data)
  } catch (error) {
    console.error('获取服务趋势错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const predictRiskTrend = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query
    const data = await statisticsService.predictRiskTrend(parseInt(days as string))
    return sendSuccess(res, data)
  } catch (error) {
    console.error('预测风险趋势错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const predictHealthTrend = async (req: Request, res: Response) => {
  try {
    const { elderlyId, days = 30 } = req.query
    if (!elderlyId) {
      return sendError(res, '老人ID不能为空', 400)
    }
    const data = await statisticsService.predictHealthTrend(parseInt(elderlyId as string), parseInt(days as string))
    return sendSuccess(res, data)
  } catch (error) {
    console.error('预测健康趋势错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const cacheKey = buildCacheKey('monthly-report', req)
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

    const { year, month } = req.query

    let report
    if (!year || !month) {
      const now = new Date()
      report = await statisticsService.getMonthlyReport(now.getFullYear(), now.getMonth() + 1)
    } else {
      report = await statisticsService.getMonthlyReport(parseInt(year as string), parseInt(month as string))
    }

    await cacheService.set(cacheKey, report, DIST_CACHE_TTL)
    return sendSuccess(res, report)
  } catch (error) {
    console.error('获取月度报告错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

export {
  getStatistics,
  getRiskStatistics,
  getAgeDistribution,
  getHealthStatusDistribution,
  getRiskDistribution,
  getServiceTrend,
  predictRiskTrend,
  predictHealthTrend,
  getMonthlyReport
}
