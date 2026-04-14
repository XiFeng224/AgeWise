import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import agentVNextService from '../services/agentVNextService'

const router = Router()

router.get('/context/:elderlyId', authenticate, async (req, res) => {
  try {
    const data = await agentVNextService.getContextSnapshot(Number(req.params.elderlyId))
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '获取上下文快照失败', 400)
  }
})

router.post('/plan', authenticate, async (req, res) => {
  try {
    const data = await agentVNextService.planTask(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '规划失败', 400)
  }
})

router.post('/tools/execute', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { calls = [] } = req.body || {}
    const data = await agentVNextService.executeTools(calls)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '工具执行失败', 400)
  }
})

router.post('/autonomous', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const data = await agentVNextService.autonomousDecision(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '自主决策失败', 400)
  }
})

router.post('/outcome', authenticate, async (req, res) => {
  try {
    const data = await agentVNextService.recordOutcome(req.body)
    return sendSuccess(res, data, '结果追踪已记录', 201)
  } catch (error) {
    return sendError(res, (error as Error).message || '结果追踪记录失败', 400)
  }
})

router.post('/policy/weekly-update', authenticate, authorize(['admin']), async (_req, res) => {
  try {
    const data = await agentVNextService.weeklyPolicyUpdate()
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '策略更新失败', 400)
  }
})

export default router
