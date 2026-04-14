import express from 'express'
import { Op } from 'sequelize'
import { authenticate } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import medicalAssistantService from '../services/medicalAssistantService'
import medicalKnowledgeService from '../services/medicalKnowledgeService'
import healthDataService from '../services/healthDataService'
import { Elderly, HealthRecord } from '../models'
import { generateHealthReport } from '../utils/healthAnalysis'

const router = express.Router()

// 实时监测接入
router.post('/realtime/ingest', authenticate, async (req, res) => {
  try {
    const { elderlyId, points } = req.body
    if (!elderlyId || !Array.isArray(points) || points.length === 0) {
      return sendError(res, '参数错误：请提供 elderlyId 与 points[]', 400)
    }
    const result = await medicalAssistantService.ingestRealtimeData(Number(elderlyId), points)
    return sendSuccess(res, result, '实时监测数据接入成功')
  } catch (error) {
    return sendError(res, (error as Error).message || '服务器内部错误', 500)
  }
})

router.get('/realtime/:elderlyId/summary', authenticate, async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { hours = 24 } = req.query
    const summary = await medicalAssistantService.getRealtimeSummary(Number(elderlyId), Number(hours))
    return sendSuccess(res, summary)
  } catch (error) {
    return sendError(res, (error as Error).message || '服务器内部错误', 500)
  }
})

// 医疗知识（低门槛）
router.get('/knowledge/topics', authenticate, async (_req, res) => {
  return sendSuccess(res, medicalKnowledgeService.getTopics())
})

router.get('/knowledge', authenticate, async (req, res) => {
  const { topic } = req.query
  return sendSuccess(res, medicalKnowledgeService.getKnowledge(topic as string | undefined))
})

// 设备健康数据接入
router.post('/health-data', authenticate, async (req, res) => {
  try {
    const result = await healthDataService.processDeviceData(req.body)
    if (result.success) return sendSuccess(res, result.data, result.message)
    return sendError(res, result.message, 400)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.get('/health-data/:elderlyId', authenticate, async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { dataType, days = 7 } = req.query
    const history = await healthDataService.getElderlyHealthHistory(Number(elderlyId), dataType as string, Number(days))
    return sendSuccess(res, history)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.get('/health-data/:elderlyId/trend', authenticate, async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { dataType, days = 30 } = req.query
    if (!dataType) return sendError(res, 'dataType 不能为空', 400)
    const trend = await healthDataService.analyzeHealthTrend(Number(elderlyId), String(dataType), Number(days))
    return sendSuccess(res, trend)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

// 健康档案 CRUD
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, elderlyId, recordType } = req.query
    const whereClause: any = {}
    if (elderlyId) whereClause.elderlyId = Number(elderlyId)
    if (recordType) whereClause.recordType = recordType

    const pageNum = Number(page)
    const size = Number(limit)
    const offset = (pageNum - 1) * size

    const { count, rows } = await HealthRecord.findAndCountAll({
      where: whereClause,
      limit: size,
      offset,
      order: [['recordDate', 'DESC']]
    })

    return res.status(200).json({
      healthRecords: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: size,
        totalPages: Math.ceil(count / size)
      }
    })
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const healthRecord = await HealthRecord.create(req.body)
    return sendSuccess(res, healthRecord, '健康档案创建成功', 201)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await HealthRecord.findByPk(Number(req.params.id))
    if (!item) return sendError(res, '健康档案不存在', 404)
    return sendSuccess(res, item)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await HealthRecord.findByPk(Number(req.params.id))
    if (!item) return sendError(res, '健康档案不存在', 404)
    await item.update(req.body)
    return sendSuccess(res, item, '健康档案更新成功')
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await HealthRecord.findByPk(Number(req.params.id))
    if (!item) return sendError(res, '健康档案不存在', 404)
    await item.destroy()
    return sendSuccess(res, null, '健康档案删除成功')
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.get('/reports/health/:elderlyId', authenticate, async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { days = 7 } = req.query
    const history = await healthDataService.getElderlyHealthHistory(Number(elderlyId), undefined, Number(days))
    const elderly = await Elderly.findByPk(Number(elderlyId))
    if (!elderly) return sendError(res, '老人不存在', 404)

    const report = generateHealthReport({
      name: elderly.name,
      age: elderly.age,
      healthData: history
    })

    return sendSuccess(res, report)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

export default router
