import express from 'express'
import { Op } from 'sequelize'
import { authenticate } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import medicalAssistantService from '../services/medicalAssistantService'
import medicalKnowledgeService from '../services/medicalKnowledgeService'
import healthDataService from '../services/healthDataService'
import warningManagementService from '../services/warningManagementService'
import { Elderly, HealthRecord } from '../models'
import { generateHealthReport } from '../utils/healthAnalysis'
import { validateBody, validateParams, validateQuery } from '../middleware/validate'

const router = express.Router()

// 实时监测接入
router.post('/realtime/ingest', authenticate,
  validateBody({ elderlyId: { type: 'number', required: true, min: 1 } }),
  async (req, res) => {
  try {
    const { elderlyId, points } = req.body
    if (!Array.isArray(points) || points.length === 0) {
      return sendError(res, '参数错误：请提供 points[] 且至少包含一个监测点', 400, { traceId: req.traceId })
    }
    const result = await medicalAssistantService.ingestRealtimeData(Number(elderlyId), points)
    return sendSuccess(res, result, '实时监测数据接入成功')
  } catch (error) {
    return sendError(res, (error as Error).message || '服务器内部错误', 500)
  }
})

router.get('/realtime/:elderlyId/summary', authenticate,
  validateParams({ elderlyId: { type: 'number', required: true, min: 1 } }),
  validateQuery({ hours: { type: 'number', required: false, min: 1, max: 168 } }),
  async (req, res) => {
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

router.get('/health-data/:elderlyId', authenticate,
  validateParams({ elderlyId: { type: 'number', required: true, min: 1 } }),
  validateQuery({ days: { type: 'number', required: false, min: 1, max: 365 } }),
  async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { dataType, days = 7 } = req.query
    const history = await healthDataService.getElderlyHealthHistory(Number(elderlyId), dataType as string, Number(days))
    return sendSuccess(res, history)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

router.get('/health-data/:elderlyId/trend', authenticate,
  validateParams({ elderlyId: { type: 'number', required: true, min: 1 } }),
  validateQuery({
    dataType: { type: 'string', required: true, enum: ['heart_rate', 'blood_pressure', 'blood_sugar', 'temperature', 'steps', 'sleep'], trim: true },
    days: { type: 'number', required: false, min: 1, max: 365 }
  }),
  async (req, res) => {
  try {
    const { elderlyId } = req.params
    const { dataType, days = 30 } = req.query
    const trend = await healthDataService.analyzeHealthTrend(Number(elderlyId), String(dataType), Number(days))
    return sendSuccess(res, trend)
  } catch (error) {
    return sendError(res, '服务器内部错误', 500)
  }
})

// 主动感知设备预警接入
router.post('/proactive/sensor', authenticate,
  validateBody({
    elderlyId: { type: 'number', required: true, min: 1 },
    sensorType: { type: 'string', required: true, enum: ['door_contact', 'water_meter', 'mattress', 'activity', 'service_gap'], trim: true }
  }),
  async (req, res) => {
  try {
    const { elderlyId, sensorType, value, value2, textValue, observedAt, meta } = req.body || {}

    const observed = observedAt ? new Date(observedAt) : new Date()
    if (Number.isNaN(observed.getTime())) {
      return sendError(res, 'observedAt 时间格式不合法', 400, { traceId: req.traceId })
    }

    const warning = await warningManagementService.analyzeProactiveSensorAndGenerateWarning({
      elderlyId: Number(elderlyId),
      sensorType,
      value: value !== undefined ? Number(value) : undefined,
      value2: value2 !== undefined ? Number(value2) : undefined,
      textValue,
      observedAt: observed,
      meta: meta || {}
    })

    return sendSuccess(res, warning, warning ? '主动感知预警已触发' : '数据正常，无需预警')
  } catch (error) {
    const msg = (error as Error).message || '主动感知预警失败'
    if (msg.includes('老人不存在')) {
      return sendError(res, msg, 404, { traceId: req.traceId })
    }
    return sendError(res, msg, 500, { traceId: req.traceId })
  }
})

// 健康档案 CRUD
router.get('/', authenticate,
  validateQuery({
    page: { type: 'number', required: false, min: 1 },
    limit: { type: 'number', required: false, min: 1, max: 100 },
    elderlyId: { type: 'number', required: false, min: 1 },
    recordType: { type: 'string', required: false, trim: true }
  }),
  async (req, res) => {
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

    return sendSuccess(res, {
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

export default router
