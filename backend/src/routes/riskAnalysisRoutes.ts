import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import riskAnalysisService from '../services/riskAnalysisService'
import { validateParams, validateQuery } from '../middleware/validate'

const router = Router()

router.get('/:elderlyId', authenticate,
  validateParams({ elderlyId: { type: 'number', required: true, min: 1 } }),
  validateQuery({ days: { type: 'number', required: false, min: 1, max: 90 } }),
  async (req, res) => {
  try {
    const elderlyId = Number(req.params.elderlyId)
    const days = Number(req.query.days || 7)


    const data = await riskAnalysisService.analyze(elderlyId, days)
    return sendSuccess(res, data)
  } catch (error) {
    const msg = (error as Error).message || '风险分析失败'
    if (msg.includes('老人不存在')) {
      return sendError(res, msg, 404, { traceId: req.traceId })
    }
    return sendError(res, msg, 500, { traceId: req.traceId })
  }
})

export default router
