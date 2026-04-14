import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import agentOrchestratorService from '../services/agentOrchestratorService'

const router = Router()

router.get('/overview', authenticate, async (_req, res) => {
  try {
    const data = await agentOrchestratorService.getWorkbenchOverview()
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, '获取总览失败', 500)
  }
})

router.get('/tasks', authenticate, async (req, res) => {
  try {
    const { limit = 50, module } = req.query
    const data = await agentOrchestratorService.getTaskCards(Number(limit), module as any)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, '获取任务失败', 500)
  }
})

router.get('/family-timeline/:elderlyId', authenticate, async (req, res) => {
  try {
    const data = await agentOrchestratorService.getFamilyTimeline(Number(req.params.elderlyId))
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, '获取时间线失败', 500)
  }
})

router.post('/dispatch', authenticate, async (req, res) => {
  try {
    const data = await agentOrchestratorService.quickDispatchFromElderly(req.body)
    return sendSuccess(res, data, '已创建派单任务', 201)
  } catch (error) {
    return sendError(res, (error as Error).message || '派单失败', 400)
  }
})

router.get('/quality-metrics', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query
    const data = await agentOrchestratorService.getQualityMetrics(Number(days))
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, '获取质量指标失败', 500)
  }
})

router.post('/escalate-overdue', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.body || {}
    const data = await agentOrchestratorService.escalateOverdueTasks(Number(limit))
    return sendSuccess(res, data, '超时任务已升级通知')
  } catch (error) {
    return sendError(res, (error as Error).message || '升级失败', 400)
  }
})

router.get('/command-center', authenticate, async (_req, res) => {
  try {
    const data = await agentOrchestratorService.getCommandCenterSnapshot()
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, '获取指挥中心数据失败', 500)
  }
})

router.post('/warnings/:id/resolve', authenticate, async (req, res) => {
  try {
    const data = await agentOrchestratorService.resolveWarning(Number(req.params.id))
    return sendSuccess(res, data, '预警已处理')
  } catch (error) {
    return sendError(res, (error as Error).message || '处理失败', 400)
  }
})

export default router
