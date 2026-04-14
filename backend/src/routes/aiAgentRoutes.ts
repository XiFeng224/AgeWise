import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import aiAgentService from '../services/aiAgentService'
import medicalAssistantService from '../services/medicalAssistantService'
import agentOrchestratorService from '../services/agentOrchestratorService'
import { Elderly, ServiceRequest } from '../models'
import { Op } from 'sequelize'

const router = Router()
let demoCursor = 0

router.post('/triage', authenticate, async (req, res) => {
  try {
    const data = await aiAgentService.triage(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || 'AI分诊失败', 500)
  }
})

router.post('/dispatch', authenticate, async (req, res) => {
  try {
    const data = await aiAgentService.dispatch(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || 'AI派单失败', 500)
  }
})

router.post('/copilot', authenticate, async (req, res) => {
  try {
    const { question, context } = req.body
    const data = await aiAgentService.copilot(question, context)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || 'AI副驾失败', 500)
  }
})

router.post('/full-decision', authenticate, async (req, res) => {
  try {
    const data = await aiAgentService.fullDecision(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    return sendError(res, (error as Error).message || 'AI决策失败', 500)
  }
})

// 演示模式：一键注入高危数据 + AI决策 + 自动派单
router.post('/demo/run', authenticate, async (req, res) => {
  try {
    const { elderlyId, rotate } = req.body || {}

    let selectedElderly: any = null

    if (elderlyId) {
      selectedElderly = await Elderly.findByPk(Number(elderlyId))
      if (!selectedElderly) {
        return sendError(res, '老人不存在', 404)
      }
    } else {
      const allElders = await Elderly.findAll({ attributes: ['id', 'name', 'age', 'notes'], order: [['id', 'ASC']] })
      if (!allElders.length) {
        return sendError(res, '暂无老人数据', 404)
      }

      if (rotate === true) {
        selectedElderly = allElders[demoCursor % allElders.length]
        demoCursor += 1
      } else {
        selectedElderly = allElders[0]
      }
    }

    const elderly = selectedElderly
    const runId = Date.now()

    // 0) 防重复：2小时内同一老人的演示派单若未完成，则复用而不重复创建
    const existingDemoDispatch = await ServiceRequest.findOne({
      where: {
        elderlyId: elderly.id,
        requestType: 'AI演示-紧急关怀',
        status: { [Op.in]: ['pending', 'assigned'] },
        created_at: { [Op.gte]: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      },
      order: [['created_at', 'DESC']]
    })

    // 1) 注入高危数据
    const ingestResult = await medicalAssistantService.ingestRealtimeData(Number(elderly.id), [
      { dataType: 'blood_pressure', value: 188, value2: 122, deviceId: `demo-ai-agent-${runId}` },
      { dataType: 'heart_rate', value: 126, deviceId: `demo-ai-agent-${runId}` },
      { dataType: 'temperature', value: 38.7, deviceId: `demo-ai-agent-${runId}` }
    ])

    // 2) AI 生成完整方案
    const shift = agentOrchestratorService.getDutyRoutingSuggestion('医护').shift as '白班' | '晚班' | '夜班'
    const decision = await aiAgentService.fullDecision({
      triageInput: {
        elderlyName: elderly.name,
        age: elderly.age,
        metrics: {
          blood_pressure: '188/122',
          heart_rate: 126,
          temperature: 38.7
        },
        historySummary: elderly.notes || '暂无病史摘要'
      },
      dispatchInput: {
        riskLevel: 'high',
        module: '医护',
        shift,
        availableRoles: [`${shift}值班医生`, `${shift}护理员`],
        eventSummary: '演示模式触发：血压危急 + 发热 + 心率偏快'
      },
      copilotQuestion: '请给出接下来30分钟内最优先动作',
      context: {
        elderlyId: elderly.id,
        name: elderly.name
      }
    })

    // 3) 自动派单（防重复）
    let dispatch: any = existingDemoDispatch
    let reused = false

    if (!existingDemoDispatch) {
      dispatch = await agentOrchestratorService.quickDispatchFromElderly({
        elderlyId: elderly.id,
        requestType: 'AI演示-紧急关怀',
        priority: 'high',
        description: `AI建议：${(decision.dispatch?.steps || []).join('；') || '立即电话确认并上门评估'}`,
        requiredSkills: '急救评估,慢病护理,家属沟通'
      })
    } else {
      reused = true
      await existingDemoDispatch.update({
        description: `AI建议(复用更新)：${(decision.dispatch?.steps || []).join('；') || existingDemoDispatch.description}`
      })
      dispatch = existingDemoDispatch
    }

    return sendSuccess(res, {
      ingestResult,
      decision,
      dispatch,
      reusedDispatch: reused,
      selectedElderly: {
        id: elderly.id,
        name: elderly.name
      },
      timelineHint: '可在总控Agent中点击家属时间线查看完整闭环'
    }, reused ? '演示模式已执行（复用已有派单）' : '演示模式已执行')
  } catch (error) {
    return sendError(res, (error as Error).message || '演示模式执行失败', 500)
  }
})

export default router
