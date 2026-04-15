import { Router, Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { authenticate, authorize } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import agentVNextService from '../services/agentVNextService'
import { validateBody } from '../middleware/validate'
import { tokenService } from '../services/tokenService'

const router = Router()

type RuntimeStatus = 'queued' | 'planning' | 'pending_approval' | 'executing' | 'tracking' | 'done' | 'failed' | 'rejected'

interface RuntimeTask {
  id: string
  createdAt: string
  updatedAt: string
  traceId?: string
  status: RuntimeStatus
  payload: {
    elderlyId: number
    eventSummary: string
    strategyMode: 'conservative' | 'balanced' | 'aggressive'
    riskLevel: 'low' | 'medium' | 'high'
    module: '护理' | '医护' | '后勤' | '收费' | '接待'
    autoExecute?: boolean
    modelPreference?: 'auto' | 'qwen' | 'deepseek' | 'rule'
    sourceQuery?: string
    sourceAnswer?: string
    sourceSuggestedAction?: string[]
  }
  plan?: any
  autonomous?: any
  outcome?: any
  events: Array<{ at: string; type: string; message: string; data?: any }>
}

const runtimeTasks = new Map<string, RuntimeTask>()
const runtimeSubscribers = new Map<string, Set<Response>>()

function pushRuntimeEvent(taskId: string, event: { type: string; message: string; data?: any }) {
  const task = runtimeTasks.get(taskId)
  if (!task) return

  const item = {
    at: new Date().toISOString(),
    type: event.type,
    message: event.message,
    data: event.data
  }

  task.events.push(item)
  task.updatedAt = item.at
  runtimeTasks.set(taskId, task)

  const subs = runtimeSubscribers.get(taskId)
  if (!subs || subs.size === 0) return

  const payload = `data: ${JSON.stringify(item)}\n\n`
  subs.forEach((res) => {
    try {
      res.write(payload)
    } catch {
      // ignore dead connection
    }
  })
}

function withTimeout(handler: (req: Request, res: Response, next: NextFunction) => Promise<any>, timeoutMs = 25_000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let finished = false
    const timer = setTimeout(() => {
      if (!finished && !res.headersSent) {
        finished = true
        sendError(res, '请求处理超时，请稍后重试', 504, { traceId: req.traceId })
      }
    }, timeoutMs)

    try {
      await handler(req, res, next)
    } catch (error) {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        next(error)
      }
      return
    }

    if (!finished) {
      finished = true
      clearTimeout(timer)
    }
  }
}

function normalizeMode(value: any): 'conservative' | 'balanced' | 'aggressive' {
  if (value === 'conservative' || value === 'aggressive' || value === 'balanced') return value
  return 'balanced'
}

function normalizeRisk(value: any): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'high' || value === 'medium') return value
  return 'medium'
}

function normalizeModule(value: any): '护理' | '医护' | '后勤' | '收费' | '接待' {
  if (value === '护理' || value === '后勤' || value === '收费' || value === '接待' || value === '医护') return value
  return '医护'
}

function ensurePositiveInt(value: any, field: string) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${field}必须为正整数`)
  }
  return n
}

router.post('/tasks', authenticate, validateBody({
  elderlyId: { type: 'number', required: true, min: 1 },
  eventSummary: { type: 'string', required: true, min: 1, max: 500, trim: true },
  strategyMode: { type: 'string', required: false, enum: ['conservative', 'balanced', 'aggressive'], trim: true },
  riskLevel: { type: 'string', required: false, enum: ['low', 'medium', 'high'], trim: true },
  module: { type: 'string', required: false, enum: ['护理', '医护', '后勤', '收费', '接待'], trim: true }
}), withTimeout(async (req, res) => {
  const body = req.body || {}

  const taskId = randomUUID()
  const task: RuntimeTask = {
    id: taskId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    traceId: req.traceId,
    status: 'queued',
    payload: {
      elderlyId: ensurePositiveInt(body.elderlyId, 'elderlyId'),
      eventSummary: String(body.eventSummary || '').trim(),
      strategyMode: normalizeMode(body.strategyMode),
      riskLevel: normalizeRisk(body.riskLevel),
      module: normalizeModule(body.module),
      autoExecute: body.autoExecute !== false
    },
    events: []
  }

  runtimeTasks.set(taskId, task)
  pushRuntimeEvent(taskId, { type: 'TASK_CREATED', message: '任务已创建，等待规划' })

  task.status = 'planning'
  runtimeTasks.set(taskId, task)
  pushRuntimeEvent(taskId, { type: 'TASK_PLANNING', message: 'Agent 正在生成计划' })

  try {
    const plan = await agentVNextService.planTask(task.payload)
    task.plan = plan
    runtimeTasks.set(taskId, task)
    pushRuntimeEvent(taskId, { type: 'TASK_PLANNED', message: '计划生成完成', data: { summary: plan?.planner?.summary } })

    if (task.payload.autoExecute) {
      task.status = 'executing'
      task.updatedAt = new Date().toISOString()
      runtimeTasks.set(taskId, task)
      pushRuntimeEvent(taskId, { type: 'TASK_EXECUTING', message: '自动执行已启动' })

      void (async () => {
        try {
          const autonomous = await agentVNextService.autonomousDecision({
            ...task.payload,
            autoExecute: true
          })

          task.autonomous = autonomous
          task.status = 'tracking'
          task.updatedAt = new Date().toISOString()
          runtimeTasks.set(taskId, task)
          pushRuntimeEvent(taskId, { type: 'TASK_TRACKING', message: '自动执行完成，进入结果追踪' })

          const outcome = await agentVNextService.recordOutcome({
            elderlyId: task.payload.elderlyId,
            strategyMode: task.payload.strategyMode,
            isOverdue: false,
            isRelapse: false,
            familySatisfaction: 4,
            followUpResult: '自动追踪：已完成一次闭环回写'
          })

          task.outcome = outcome
          task.status = 'done'
          task.updatedAt = new Date().toISOString()
          runtimeTasks.set(taskId, task)
          pushRuntimeEvent(taskId, { type: 'TASK_DONE', message: '任务已完成闭环', data: { outcomeId: outcome?.id } })
        } catch (error: any) {
          task.status = 'failed'
          task.updatedAt = new Date().toISOString()
          runtimeTasks.set(taskId, task)
          pushRuntimeEvent(taskId, { type: 'TASK_FAILED', message: error?.message || '自动执行失败' })
        }
      })()

      return sendSuccess(res, {
        taskId,
        status: task.status,
        traceId: req.traceId,
        summary: plan?.planner?.summary,
        requiresApproval: false,
        autoExecute: true
      }, '任务已创建，自动执行已在后台进行', 201)
    }

    task.status = 'pending_approval'
    runtimeTasks.set(taskId, task)
    pushRuntimeEvent(taskId, { type: 'TASK_PENDING_APPROVAL', message: '计划生成完成，等待审批', data: { summary: plan?.planner?.summary } })

    return sendSuccess(res, {
      taskId,
      status: task.status,
      traceId: req.traceId,
      summary: plan?.planner?.summary,
      requiresApproval: true
    }, '任务已创建并完成规划', 201)
  } catch (error: any) {
    task.status = 'failed'
    runtimeTasks.set(taskId, task)
    pushRuntimeEvent(taskId, { type: 'TASK_FAILED', message: error?.message || '规划失败' })
    return sendError(res, error?.message || '任务规划失败', 400, { taskId, traceId: req.traceId })
  }
}, 60_000))

router.post('/tasks/:taskId/approve', authenticate, authorize(['admin', 'manager']), withTimeout(async (req, res) => {
  const task = runtimeTasks.get(req.params.taskId)
  if (!task) return sendError(res, '任务不存在', 404, { traceId: req.traceId })
  if (task.status !== 'pending_approval') return sendError(res, '当前任务状态不可审批执行', 400, { status: task.status, traceId: req.traceId })

  task.status = 'executing'
  task.updatedAt = new Date().toISOString()
  runtimeTasks.set(task.id, task)
  pushRuntimeEvent(task.id, { type: 'TASK_EXECUTING', message: '审批通过，开始执行工具' })

  try {
    const autonomous = await agentVNextService.autonomousDecision({
      ...task.payload,
      autoExecute: true
    })

    task.autonomous = autonomous
    task.status = 'tracking'
    runtimeTasks.set(task.id, task)
    pushRuntimeEvent(task.id, { type: 'TASK_TRACKING', message: '工具执行完成，进入结果追踪' })

    const outcome = await agentVNextService.recordOutcome({
      elderlyId: task.payload.elderlyId,
      strategyMode: task.payload.strategyMode,
      isOverdue: false,
      isRelapse: false,
      familySatisfaction: 4,
      followUpResult: '自动追踪：已完成一次闭环回写'
    })

    task.outcome = outcome
    task.status = 'done'
    task.updatedAt = new Date().toISOString()
    runtimeTasks.set(task.id, task)
    pushRuntimeEvent(task.id, { type: 'TASK_DONE', message: '任务已完成闭环', data: { outcomeId: outcome?.id } })

    return sendSuccess(res, {
      taskId: task.id,
      status: task.status,
      autonomousSummary: autonomous?.plan?.planner?.summary,
      toolExecution: autonomous?.execution || []
    }, '任务审批并执行完成')
  } catch (error: any) {
    task.status = 'failed'
    task.updatedAt = new Date().toISOString()
    runtimeTasks.set(task.id, task)
    pushRuntimeEvent(task.id, { type: 'TASK_FAILED', message: error?.message || '执行失败' })
    return sendError(res, error?.message || '任务执行失败', 400, { taskId: task.id, traceId: req.traceId })
  }
}, 45_000))

router.post('/tasks/:taskId/reject', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  const task = runtimeTasks.get(req.params.taskId)
  if (!task) return sendError(res, '任务不存在', 404, { traceId: req.traceId })

  task.status = 'rejected'
  task.updatedAt = new Date().toISOString()
  runtimeTasks.set(task.id, task)
  pushRuntimeEvent(task.id, { type: 'TASK_REJECTED', message: '计划已驳回，等待重新提交' })

  return sendSuccess(res, { taskId: task.id, status: task.status }, '任务已驳回')
})

router.get('/tasks/:taskId', authenticate, (req, res) => {
  const task = runtimeTasks.get(req.params.taskId)
  if (!task) return sendError(res, '任务不存在', 404, { traceId: req.traceId })

  return sendSuccess(res, {
    id: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    traceId: task.traceId,
    payload: task.payload,
    summary: task.plan?.planner?.summary,
    toolExecution: task.autonomous?.execution || [],
    outcome: task.outcome || null,
    events: task.events.slice(-50)
  })
})

router.get('/tasks/:taskId/events', async (req, res) => {
  try {
    const runtimeTask = runtimeTasks.get(req.params.taskId)
    if (!runtimeTask) return sendError(res, '任务不存在', 404, { traceId: req.traceId })

    const authHeader = req.headers.authorization
    const queryToken = String(req.query.token || '')

    let token = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (queryToken) {
      token = queryToken
    } else {
      return sendError(res, '访问令牌缺失或格式错误', 401)
    }
    if (await tokenService.isTokenBlacklisted(token)) {
      return sendError(res, '访问令牌已被注销', 401)
    }

    const decoded = tokenService.verifyAccessToken(token)
    if (!decoded) {
      return sendError(res, '访问令牌无效或已过期', 401)
    }

    const task = runtimeTasks.get(req.params.taskId)
    if (!task) return sendError(res, '任务不存在', 404, { traceId: req.traceId })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    if (!runtimeSubscribers.has(task.id)) {
      runtimeSubscribers.set(task.id, new Set<Response>())
    }
    runtimeSubscribers.get(task.id)?.add(res)

    const warmup = { type: 'INIT', message: '事件流已连接', at: new Date().toISOString() }
    res.write(`data: ${JSON.stringify(warmup)}\n\n`)

    task.events.slice(-20).forEach((evt) => {
      res.write(`data: ${JSON.stringify(evt)}\n\n`)
    })

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`)
      } catch {
        clearInterval(heartbeat)
      }
    }, 15000)

    const cleanup = () => {
      clearInterval(heartbeat)
      runtimeSubscribers.get(runtimeTask.id)?.delete(res)
      if (runtimeSubscribers.get(runtimeTask.id)?.size === 0) {
        runtimeSubscribers.delete(runtimeTask.id)
      }
      try {
        res.end()
      } catch {
        // ignore already closed response
      }
    }

    req.on('close', cleanup)
    res.on('close', cleanup)
    res.on('error', cleanup)
  } catch (error: any) {
    return sendError(res, error?.message || '事件流连接失败', 500)
  }
})

router.get('/context/:elderlyId', authenticate, withTimeout(async (req, res) => {
  try {
    const elderlyId = ensurePositiveInt(req.params.elderlyId, 'elderlyId')
    const data = await agentVNextService.getContextSnapshot(elderlyId)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '获取上下文快照失败', 400, { traceId: req.traceId })
  }
}, 12_000))

router.post('/plan', authenticate, validateBody({
  elderlyId: { type: 'number', required: true, min: 1 },
  eventSummary: { type: 'string', required: true, min: 1, max: 500, trim: true },
  strategyMode: { type: 'string', required: false, enum: ['conservative', 'balanced', 'aggressive'], trim: true },
  riskLevel: { type: 'string', required: false, enum: ['low', 'medium', 'high'], trim: true },
  module: { type: 'string', required: false, enum: ['护理', '医护', '后勤', '收费', '接待'], trim: true }
}), withTimeout(async (req, res) => {
  try {
    const body = req.body || {}
    const elderlyId = ensurePositiveInt(body.elderlyId, 'elderlyId')
    const eventSummary = String(body.eventSummary || '').trim()
    if (!eventSummary) {
      return sendError(res, 'eventSummary不能为空', 400, { traceId: req.traceId })
    }

    const data = await agentVNextService.planTask({
      elderlyId,
      eventSummary,
      strategyMode: normalizeMode(body.strategyMode),
      riskLevel: normalizeRisk(body.riskLevel),
      module: normalizeModule(body.module),
      modelPreference: body.modelPreference,
      sourceQuery: body.sourceQuery,
      sourceAnswer: body.sourceAnswer,
      sourceSuggestedAction: Array.isArray(body.sourceSuggestedAction) ? body.sourceSuggestedAction : []
    })

    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '规划失败', 400, { traceId: req.traceId })
  }
}, 25_000))

router.post('/tools/execute', authenticate, authorize(['admin', 'manager']), withTimeout(async (req, res) => {
  try {
    const { calls = [] } = req.body || {}
    if (!Array.isArray(calls) || calls.length === 0) {
      return sendError(res, 'calls不能为空且必须为数组', 400, { traceId: req.traceId })
    }

    const data = await agentVNextService.executeTools(calls)
    const successCount = data.filter((x: any) => x.success).length
    return sendSuccess(res, {
      total: data.length,
      successCount,
      failedCount: data.length - successCount,
      items: data
    })
  } catch (error) {
    return sendError(res, (error as Error).message || '工具执行失败', 400, { traceId: req.traceId })
  }
}, 20_000))

router.post('/autonomous', authenticate, authorize(['admin', 'manager']), validateBody({
  elderlyId: { type: 'number', required: true, min: 1 },
  eventSummary: { type: 'string', required: true, min: 1, max: 500, trim: true },
  strategyMode: { type: 'string', required: false, enum: ['conservative', 'balanced', 'aggressive'], trim: true },
  riskLevel: { type: 'string', required: false, enum: ['low', 'medium', 'high'], trim: true },
  module: { type: 'string', required: false, enum: ['护理', '医护', '后勤', '收费', '接待'], trim: true }
}), withTimeout(async (req, res) => {
  try {
    const body = req.body || {}
    const elderlyId = ensurePositiveInt(body.elderlyId, 'elderlyId')
    const eventSummary = String(body.eventSummary || '').trim()
    if (!eventSummary) {
      return sendError(res, 'eventSummary不能为空', 400, { traceId: req.traceId })
    }

    const data = await agentVNextService.autonomousDecision({
      elderlyId,
      eventSummary,
      strategyMode: normalizeMode(body.strategyMode),
      riskLevel: normalizeRisk(body.riskLevel),
      module: normalizeModule(body.module),
      autoExecute: body.autoExecute !== false,
      modelPreference: body.modelPreference,
      sourceQuery: body.sourceQuery,
      sourceAnswer: body.sourceAnswer,
      sourceSuggestedAction: Array.isArray(body.sourceSuggestedAction) ? body.sourceSuggestedAction : []
    })

    return sendSuccess(res, {
      strategyMode: data.plan?.strategyMode,
      summary: data.plan?.planner?.summary,
      executed: data.executed,
      toolExecution: {
        total: data.execution?.length || 0,
        success: (data.execution || []).filter((x: any) => x.success).length,
        failed: (data.execution || []).filter((x: any) => !x.success).length
      },
      executionTrace: data.executionTrace,
      planner: data.plan?.planner,
      execution: data.execution
    })
  } catch (error) {
    return sendError(res, (error as Error).message || '自主决策失败', 400, { traceId: req.traceId })
  }
}, 30_000))

router.post('/outcome', authenticate, validateBody({
  elderlyId: { type: 'number', required: true, min: 1 },
  strategyMode: { type: 'string', required: true, enum: ['conservative', 'balanced', 'aggressive'], trim: true },
  isOverdue: { type: 'boolean', required: true },
  isRelapse: { type: 'boolean', required: true },
  familySatisfaction: { type: 'number', required: true, min: 0, max: 10 },
  followUpResult: { type: 'string', required: true, min: 1, max: 1000, trim: true }
}), withTimeout(async (req, res) => {
  try {
    const body = req.body || {}
    const elderlyId = ensurePositiveInt(body.elderlyId, 'elderlyId')
    const familySatisfaction = Number(body.familySatisfaction)

    const data = await agentVNextService.recordOutcome({
      elderlyId,
      strategyMode: normalizeMode(body.strategyMode),
      isOverdue: !!body.isOverdue,
      isRelapse: !!body.isRelapse,
      familySatisfaction: Number.isFinite(familySatisfaction) ? familySatisfaction : 5,
      followUpResult: String(body.followUpResult || ''),
      warningId: body.warningId ? Number(body.warningId) : undefined,
      serviceRequestId: body.serviceRequestId ? Number(body.serviceRequestId) : undefined
    })

    return sendSuccess(res, data, '结果追踪已记录', 201)
  } catch (error) {
    return sendError(res, (error as Error).message || '结果追踪记录失败', 400, { traceId: req.traceId })
  }
}, 10_000))

router.post('/policy/weekly-update', authenticate, authorize(['admin']), withTimeout(async (_req, res) => {
  try {
    const data = await agentVNextService.weeklyPolicyUpdate()
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || '策略更新失败', 400)
  }
}, 20_000))

export default router
