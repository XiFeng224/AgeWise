import { Op } from 'sequelize'
import aiAgentService from './aiAgentService'
import agentOrchestratorService from './agentOrchestratorService'
import { Elderly, HealthData, Warning, ServiceRequest, Notification, User, ServiceRecord, ServiceProvider } from '../models'
import aiAgentQwenService from './aiAgentService'

type StrategyMode = 'conservative' | 'balanced' | 'aggressive'

type ToolName = 'create_dispatch' | 'resolve_warning' | 'notify_family' | 'append_timeline'

interface ToolCall {
  tool: ToolName
  args: Record<string, any>
}

interface PlannerOutput {
  summary: string
  timeline: Array<{ window: string; actions: string[] }>
  toolCalls: ToolCall[]
}

type PolicyByMode = Record<StrategyMode, { followUpMinutes: number; escalationMultiplier: number }>

const DEFAULT_POLICY_BY_MODE: PolicyByMode = {
  conservative: { followUpMinutes: 20, escalationMultiplier: 1.2 },
  balanced: { followUpMinutes: 30, escalationMultiplier: 1 },
  aggressive: { followUpMinutes: 45, escalationMultiplier: 0.9 }
}

class AgentVNextService {
  private policyByMode: PolicyByMode = { ...DEFAULT_POLICY_BY_MODE }
  private policyLoaded = false
  private planCache = new Map<string, { expireAt: number; value: any }>()

  private readonly supportedTools: ToolName[] = ['create_dispatch', 'resolve_warning', 'notify_family', 'append_timeline']

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }

  private safeParseJSON<T>(value: string | null | undefined): T | null {
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  private normalizePolicy(input: unknown): PolicyByMode {
    const base: PolicyByMode = { ...DEFAULT_POLICY_BY_MODE }
    const source = (input && typeof input === 'object') ? (input as Partial<PolicyByMode>) : {}

    ;(['conservative', 'balanced', 'aggressive'] as StrategyMode[]).forEach((mode) => {
      const row = source[mode]
      if (!row) return

      const followUpMinutes = Number(row.followUpMinutes)
      const escalationMultiplier = Number(row.escalationMultiplier)

      if (Number.isFinite(followUpMinutes)) {
        base[mode].followUpMinutes = this.clamp(Math.round(followUpMinutes), 5, 180)
      }
      if (Number.isFinite(escalationMultiplier)) {
        base[mode].escalationMultiplier = this.clamp(escalationMultiplier, 0.5, 2)
      }
    })

    return base
  }

  private sanitizeToolCalls(toolCalls: ToolCall[]): ToolCall[] {
    if (!Array.isArray(toolCalls)) return []

    return toolCalls
      .filter((c) => c && this.supportedTools.includes(c.tool))
      .map((c) => ({
        tool: c.tool,
        args: (c.args && typeof c.args === 'object') ? c.args : {}
      }))
      .slice(0, 8)
  }

  private buildPlanCacheKey(input: {
    elderlyId: number
    eventSummary: string
    strategyMode?: StrategyMode
    riskLevel?: 'low' | 'medium' | 'high'
    module?: '护理' | '医护' | '后勤' | '收费' | '接待'
  }) {
    return JSON.stringify({
      elderlyId: input.elderlyId,
      eventSummary: (input.eventSummary || '').trim().slice(0, 200),
      strategyMode: input.strategyMode || 'balanced',
      riskLevel: input.riskLevel || 'medium',
      module: input.module || '医护'
    })
  }

  private getPlanCache(key: string) {
    const item = this.planCache.get(key)
    if (!item) return null
    if (item.expireAt <= Date.now()) {
      this.planCache.delete(key)
      return null
    }
    return item.value
  }

  private setPlanCache(key: string, value: any, ttlMs = 20_000) {
    this.planCache.set(key, {
      value,
      expireAt: Date.now() + ttlMs
    })

    if (this.planCache.size > 200) {
      const firstKey = this.planCache.keys().next().value
      if (firstKey) this.planCache.delete(firstKey)
    }
  }

  private async ensurePolicyLoaded() {
    if (this.policyLoaded) return

    const latest = await Notification.findOne({
      where: { type: 'agent_policy' },
      order: [['createdAt', 'DESC']]
    })

    const parsed = this.safeParseJSON<{ note?: string; policyByMode?: PolicyByMode }>(latest?.content)
    if (parsed?.policyByMode) {
      this.policyByMode = this.normalizePolicy(parsed.policyByMode)
    }

    this.policyLoaded = true
  }

  private async persistPolicySnapshot(note: string) {
    const admin = await User.findOne({ where: { role: 'admin' }, attributes: ['id'] })
    if (!admin) return

    await Notification.create({
      userId: admin.id,
      title: `Agent策略快照-${new Date().toLocaleString()}`,
      content: JSON.stringify({ note, policyByMode: this.policyByMode }),
      type: 'agent_policy',
      relatedId: 0,
      isRead: false
    })
  }

  async getContextSnapshot(elderlyId: number) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [elderly, healthData, warnings, serviceRequests, timelineNotifications, providers] = await Promise.all([
      Elderly.findByPk(elderlyId),
      HealthData.findAll({ where: { elderlyId, createdAt: { [Op.gte]: since24h } }, order: [['createdAt', 'DESC']], limit: 80 }),
      Warning.findAll({ where: { elderlyId }, order: [['createdAt', 'DESC']], limit: 20 }),
      ServiceRequest.findAll({ where: { elderlyId }, order: [['createdAt', 'DESC']], limit: 20 }),
      Notification.findAll({ where: { relatedId: elderlyId }, order: [['createdAt', 'DESC']], limit: 30 }),
      ServiceProvider.findAll({ where: { availability: true }, attributes: ['id', 'name', 'type', 'skills', 'rating'], limit: 15 })
    ])

    if (!elderly) {
      throw new Error('老人不存在')
    }

    const groupedMetrics = healthData.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item.dataType
      if (!acc[key]) acc[key] = []
      acc[key].push({
        value: item.value,
        value2: item.value2,
        unit: item.unit,
        at: item.createdAt,
        isAbnormal: item.isAbnormal
      })
      return acc
    }, {})

    return {
      profile: {
        id: elderly.id,
        name: elderly.name,
        age: elderly.age,
        riskLevel: elderly.riskLevel,
        healthStatus: elderly.healthStatus,
        isAlone: elderly.isAlone,
        notes: elderly.notes
      },
      metrics24h: groupedMetrics,
      warningHistory: warnings,
      taskHistory: serviceRequests,
      familyCommunication: timelineNotifications.map((n: any) => ({
        title: n.title,
        content: n.content,
        type: n.type,
        at: n.createdAt
      })),
      availableProviders: providers
    }
  }

  private applyStrategy(mode: StrategyMode, riskLevel: 'low' | 'medium' | 'high') {
    if (mode === 'conservative') {
      if (riskLevel === 'low') return 'medium'
      return 'high'
    }
    if (mode === 'aggressive') {
      if (riskLevel === 'high') return 'medium'
      return riskLevel
    }
    return riskLevel
  }

  private async findReferenceCases(elderlyId: number, eventSummary: string) {
    const keyword = (eventSummary || '').trim().slice(0, 20)
    if (!keyword) {
      return { warnings: [], serviceRequests: [], serviceRecords: [] }
    }

    const like = `%${keyword}%`

    const [warnings, serviceRequests, serviceRecords] = await Promise.all([
      Warning.findAll({
        where: {
          elderlyId,
          [Op.or]: [
            { title: { [Op.like]: like } },
            { description: { [Op.like]: like } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      ServiceRequest.findAll({
        where: {
          elderlyId,
          [Op.or]: [
            { requestType: { [Op.like]: like } },
            { description: { [Op.like]: like } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      ServiceRecord.findAll({
        where: {
          elderlyId,
          [Op.or]: [
            { description: { [Op.like]: like } },
            { notes: { [Op.like]: like } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ])

    return {
      warnings: warnings.map((w: any) => ({
        type: w.warningType,
        riskLevel: w.riskLevel,
        title: w.title,
        description: w.description,
        at: w.createdAt
      })),
      serviceRequests: serviceRequests.map((s: any) => ({
        requestType: s.requestType,
        priority: s.priority,
        description: s.description,
        status: s.status,
        at: s.createdAt
      })),
      serviceRecords: serviceRecords.map((r: any) => ({
        serviceType: r.serviceType,
        description: r.description,
        notes: r.notes,
        at: r.createdAt
      }))
    }
  }

  async answerQuestion(input: { question: string; context?: Record<string, any> }) {
    const answer = await aiAgentService.answer(input)
    return answer
  }

  async planTask(input: {
    elderlyId: number
    eventSummary: string
    strategyMode?: StrategyMode
    riskLevel?: 'low' | 'medium' | 'high'
    module?: '护理' | '医护' | '后勤' | '收费' | '接待'
    modelPreference?: 'auto' | 'qwen' | 'deepseek' | 'moonshot' | 'nlp' | 'rule'
    sourceQuery?: string
    sourceAnswer?: string
    sourceSuggestedAction?: string[]
  }) {
    await this.ensurePolicyLoaded()

    const cacheKey = this.buildPlanCacheKey(input)
    const cached = this.getPlanCache(cacheKey)
    if (cached) {
      return {
        ...cached,
        cache: { hit: true }
      }
    }

    const strategyMode = input.strategyMode || 'balanced'
    const modelPreference = input.modelPreference || 'auto'
    const context = await this.getContextSnapshot(input.elderlyId)
    const references = await this.findReferenceCases(input.elderlyId, input.eventSummary)
    const risk = this.applyStrategy(strategyMode, input.riskLevel || 'medium') as 'low' | 'medium' | 'high'
    const module = input.module || '医护'
    const duty = agentOrchestratorService.getDutyRoutingSuggestion(module)
    const availableRoles = (context.availableProviders || [])
      .filter((p: any) => {
        if (module === '医护') return p.type === 'doctor' || p.type === 'nurse'
        if (module === '护理') return p.type === 'nurse' || p.type === 'volunteer'
        return true
      })
      .slice(0, 5)
      .map((p: any) => p.name)

    let decision: any
    try {
      const qwenSummary = await aiAgentQwenService.answer({
        question: `请为养老机构运行台生成任务规划摘要。事件：${input.eventSummary}`,
        context: {
          elderlyId: input.elderlyId,
          elderlyName: context.profile.name,
          age: context.profile.age,
          riskLevel: risk,
          strategyMode,
          module,
          sourceQuery: input.sourceQuery || '',
          sourceAnswer: input.sourceAnswer || '',
          sourceSuggestedAction: input.sourceSuggestedAction || []
        }
      }).catch((error: any) => ({
        answer: '模型摘要生成失败，已启用兜底规划。',
        summary: '模型摘要生成失败，已启用兜底规划。',
        _meta: { source: 'fallback', message: error?.message || 'unknown' }
      }))

      decision = await aiAgentService.fullDecision({
        triageInput: {
          elderlyName: context.profile.name,
          age: context.profile.age,
          metrics: context.metrics24h,
          historySummary: context.profile.notes || '暂无病史摘要'
        },
        dispatchInput: {
          riskLevel: risk,
          module,
          shift: duty.shift as '白班' | '晚班' | '夜班',
          availableRoles,
          eventSummary: input.eventSummary
        },
        copilotQuestion: '请给出步骤化执行计划（10分钟、30分钟、2小时、24小时），并输出重点行动。',
        context: {
          strategyMode,
          profile: context.profile,
          warnings: context.warningHistory.slice(0, 5),
          providers: availableRoles,
          references,
          sourceQuery: input.sourceQuery || '',
          sourceAnswer: input.sourceAnswer || '',
          sourceSuggestedAction: input.sourceSuggestedAction || [],
          modelPreference
        }
      }).catch((error: any) => ({
        triage: { actions: ['先完成关键体征复测并评估风险等级'] },
        dispatch: { steps: ['安排值班人员执行首轮处置', '2小时内完成复测复核'] },
        copilot: {
          summary: '模型服务暂时不可用，已给出规则化兜底处置建议。',
          communication: '已启动基础处置流程，请保持电话畅通。',
          _meta: { source: 'fallback', message: error?.message || 'unknown' }
        }
      }))
      decision.copilot = {
        ...decision.copilot,
        summary: qwenSummary?.answer || qwenSummary?.summary || decision?.copilot?.summary,
        _meta: { ...(decision?.copilot?._meta || {}), source: qwenSummary?._meta?.source || 'qwen' }
      }
    } catch {
      decision = {
        triage: { actions: ['先完成关键体征复测并评估风险等级'] },
        dispatch: { steps: ['安排值班人员执行首轮处置', '2小时内完成复测复核'] },
        copilot: {
          summary: '模型服务暂时不可用，已给出规则化兜底处置建议。',
          communication: '已启动基础处置流程，请保持电话畅通。',
          _meta: { source: 'fallback' }
        }
      }
    }

    const reactSteps: Array<{ reason: string; action: string; observation: string }> = [
      {
        reason: '先确认老人当前生命体征与主诉，避免误分级。',
        action: '10分钟内完成电话核实与关键指标复测。',
        observation: '得到首轮风险确认结果，用于后续派单。'
      },
      {
        reason: '风险已确认，需要快速落到执行动作。',
        action: `30分钟内路由${duty.suggestedRole}并启动随访。`,
        observation: '形成已派单/已接单状态与处置回执。'
      },
      {
        reason: '需验证处置是否有效，避免复发。',
        action: `2小时内按${strategyMode}策略完成复测与复核。`,
        observation: '记录复测结果并更新风险等级。'
      }
    ]

    const planner: PlannerOutput = {
      summary: decision?.copilot?.summary || '建议先执行快速确认，再进行分级处置。',
      timeline: [
        {
          window: '10分钟内',
          actions: [
            '电话核实老人当前状态与主诉',
            `通知${duty.suggestedRole}进入待命`,
            decision?.triage?.actions?.[0] || '复测关键指标并确认风险等级'
          ]
        },
        {
          window: '30分钟内',
          actions: [
            '安排上门或视频随访',
            decision?.dispatch?.steps?.[0] || '完成首轮处置并记录'
          ]
        },
        {
          window: '2小时内',
          actions: [
            `按${strategyMode}策略完成复测并回填`,
            decision?.dispatch?.steps?.[1] || '复核并确认处置有效性'
          ]
        },
        {
          window: '24小时内',
          actions: [
            '进行家属沟通与满意度回访',
            `${this.policyByMode[strategyMode].followUpMinutes}分钟后触发自动复核提醒`
          ]
        }
      ],
      toolCalls: [
        {
          tool: 'create_dispatch',
          args: {
            elderlyId: input.elderlyId,
            requestType: 'AI计划派单',
            priority: risk,
            description: `事件：${input.eventSummary}；策略：${strategyMode}；班次：${duty.shift}`,
            requiredSkills: module === '医护' ? '急救评估,慢病护理,家属沟通' : '护理,沟通,随访'
          }
        },
        {
          tool: 'notify_family',
          args: {
            elderlyId: input.elderlyId,
            title: `处置计划通知-${context.profile.name}`,
            content: decision?.copilot?.communication || '已启动分级处置流程，请保持电话畅通。'
          }
        },
        {
          tool: 'append_timeline',
          args: {
            elderlyId: input.elderlyId,
            note: `已生成并确认${strategyMode}策略计划（${module}/${risk}）`
          }
        }
      ]
    }

    planner.toolCalls = this.sanitizeToolCalls(planner.toolCalls)

    const result = {
      strategyMode,
      context,
      decision,
      references,
      reactSteps,
      planner,
      plan: {
        eventSummary: input.eventSummary,
        steps: planner.timeline.map(t => `${t.window}:${t.actions.join('；')}`),
        toolCalls: planner.toolCalls
      },
      cache: { hit: false }
    }

    this.setPlanCache(cacheKey, result)
    return result
  }

  async executeTools(calls: ToolCall[]) {
    const validCalls = this.sanitizeToolCalls(calls)
    const results: Array<{ tool: ToolName; success: boolean; result?: any; error?: string }> = []

    for (const call of validCalls) {
      try {
        if (call.tool === 'create_dispatch') {
          const elderlyId = Number(call.args.elderlyId)
          if (!Number.isFinite(elderlyId)) throw new Error('elderlyId无效')

          const data = await agentOrchestratorService.quickDispatchFromElderly({
            elderlyId,
            requestType: call.args.requestType || 'AI自动派单',
            priority: call.args.priority || 'medium',
            description: call.args.description || '由Agent工具调用创建',
            requiredSkills: call.args.requiredSkills || '护理,随访'
          })
          results.push({ tool: call.tool, success: true, result: data })
          continue
        }

        if (call.tool === 'resolve_warning') {
          const warningId = Number(call.args.warningId)
          if (!Number.isFinite(warningId)) throw new Error('warningId无效')

          const data = await agentOrchestratorService.resolveWarning(warningId)
          results.push({ tool: call.tool, success: true, result: data })
          continue
        }

        if (call.tool === 'notify_family') {
          const elderlyId = Number(call.args.elderlyId)
          if (!Number.isFinite(elderlyId)) throw new Error('elderlyId无效')

          const elderly = await Elderly.findByPk(elderlyId)
          if (!elderly) throw new Error('老人不存在')

          const receivers = await User.findAll({ where: { role: { [Op.in]: ['admin', 'manager', 'grid'] } }, attributes: ['id'] })
          await Promise.all(
            receivers.map((u: any) => Notification.create({
              userId: u.id,
              title: call.args.title || `家属沟通提醒-${elderly.name}`,
              content: call.args.content || '请与家属同步当前处置进度',
              type: 'agent_family_notify',
              relatedId: elderly.id,
              isRead: false
            }))
          )
          results.push({ tool: call.tool, success: true, result: { sent: receivers.length } })
          continue
        }

        if (call.tool === 'append_timeline') {
          const elderlyId = Number(call.args.elderlyId)
          if (!Number.isFinite(elderlyId)) throw new Error('elderlyId无效')

          const elderly = await Elderly.findByPk(elderlyId)
          if (!elderly) throw new Error('老人不存在')

          const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'manager'] } }, attributes: ['id'] })
          await Promise.all(
            admins.map((u: any) => Notification.create({
              userId: u.id,
              title: `Agent时间线记录-${elderly.name}`,
              content: call.args.note || 'Agent追加处置记录',
              type: 'agent_timeline',
              relatedId: elderly.id,
              isRead: false
            }))
          )
          results.push({ tool: call.tool, success: true, result: { appended: true } })
          continue
        }

        results.push({ tool: call.tool, success: false, error: '不支持的工具' })
      } catch (error: any) {
        results.push({ tool: call.tool, success: false, error: error?.message || '执行失败' })
      }
    }

    return results
  }

  async autonomousDecision(input: {
    elderlyId: number
    eventSummary: string
    strategyMode?: StrategyMode
    riskLevel?: 'low' | 'medium' | 'high'
    module?: '护理' | '医护' | '后勤' | '收费' | '接待'
    autoExecute?: boolean
    modelPreference?: 'auto' | 'qwen' | 'deepseek' | 'moonshot' | 'nlp' | 'rule'
    sourceQuery?: string
    sourceAnswer?: string
    sourceSuggestedAction?: string[]
  }) {
    const plan = await this.planTask(input)

    let execution: any[] = []
    const executionTrace: Array<{ step: number; thought: string; action: string; observation: string; success?: boolean }> = []

    if (input.autoExecute !== false) {
      const toolCalls = plan.plan.toolCalls as ToolCall[]
      for (let i = 0; i < toolCalls.length; i += 1) {
        const call = toolCalls[i]
        executionTrace.push({
          step: i + 1,
          thought: `执行${call.tool}以推进处置闭环。`,
          action: `${call.tool}(${JSON.stringify(call.args)})`,
          observation: '执行中...'
        })

        const result = await this.executeTools([call])
        const one = result[0]
        execution.push(one)

        executionTrace[i].observation = one?.success ? '执行成功并已回写业务数据。' : `执行失败：${one?.error || '未知错误'}`
        executionTrace[i].success = !!one?.success
      }
    }

    return {
      plan,
      execution,
      executionTrace,
      executed: input.autoExecute !== false,
      planningAnswer: plan?.copilot?.summary || plan?.planner?.summary || '已生成任务规划'
    }
  }

  async recordOutcome(input: {
    elderlyId: number
    strategyMode: StrategyMode
    isOverdue: boolean
    isRelapse: boolean
    familySatisfaction: number
    followUpResult: string
    warningId?: number
    serviceRequestId?: number
  }) {
    const description = `Agent结果追踪(strategy=${input.strategyMode})`
    const notes = JSON.stringify({
      isOverdue: input.isOverdue,
      isRelapse: input.isRelapse,
      familySatisfaction: input.familySatisfaction,
      followUpResult: input.followUpResult,
      warningId: input.warningId,
      serviceRequestId: input.serviceRequestId
    })

    const record = await ServiceRecord.create({
      elderlyId: input.elderlyId,
      serviceType: 'agent_outcome',
      serviceDate: new Date(),
      serviceProvider: 'agent-vnext',
      description,
      notes,
      rating: Math.max(1, Math.min(5, Math.round((input.familySatisfaction || 5) / 2)))
    })

    return record
  }

  async weeklyPolicyUpdate() {
    await this.ensurePolicyLoaded()
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const rows = await ServiceRecord.findAll({
      where: {
        serviceType: 'agent_outcome',
        createdAt: { [Op.gte]: since }
      },
      order: [['createdAt', 'DESC']],
      limit: 1000
    })

    const parsed = rows.map((r: any) => this.safeParseJSON<any>(r.notes || '{}') || {})

    const count = parsed.length || 1
    const overdueRate = parsed.filter((p: any) => p.isOverdue).length / count
    const relapseRate = parsed.filter((p: any) => p.isRelapse).length / count
    const avgSat = parsed.reduce((sum: number, p: any) => sum + Number(p.familySatisfaction || 0), 0) / count

    if (overdueRate > 0.35 || relapseRate > 0.2) {
      this.policyByMode.conservative.followUpMinutes = 15
      this.policyByMode.balanced.followUpMinutes = 25
    } else if (avgSat >= 4.5 && overdueRate < 0.15) {
      this.policyByMode.balanced.followUpMinutes = 35
      this.policyByMode.aggressive.followUpMinutes = 50
    }

    this.policyByMode = this.normalizePolicy(this.policyByMode)
    await this.persistPolicySnapshot('weekly_update')

    return {
      windowDays: 7,
      sampleSize: parsed.length,
      overdueRate: Number((overdueRate * 100).toFixed(1)),
      relapseRate: Number((relapseRate * 100).toFixed(1)),
      avgSatisfaction: Number(avgSat.toFixed(2)),
      policyByMode: this.policyByMode
    }
  }
}

export default new AgentVNextService()
