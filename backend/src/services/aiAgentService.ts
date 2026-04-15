import axios from 'axios'

interface TriageInput {
  elderlyName: string
  age: number
  metrics: Record<string, any>
  historySummary?: string
}

interface DispatchInput {
  riskLevel: 'low' | 'medium' | 'high'
  module: '护理' | '医护' | '后勤' | '收费' | '接待'
  shift: '白班' | '晚班' | '夜班'
  availableRoles?: string[]
  eventSummary: string
}

interface AnswerInput {
  question: string
  context?: Record<string, any>
}

class AIAgentService {
  private parseModelJson(content: string) {
    const raw = String(content || '').trim()
    try {
      return JSON.parse(raw)
    } catch {
      const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i)
      if (fenced?.[1]) {
        return JSON.parse(fenced[1])
      }

      const objStart = raw.indexOf('{')
      const objEnd = raw.lastIndexOf('}')
      if (objStart >= 0 && objEnd > objStart) {
        const maybe = raw.slice(objStart, objEnd + 1)
        return JSON.parse(maybe)
      }

      throw new Error('模型返回不是有效JSON')
    }
  }

  private get qwenApiKey() {
    return process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || ''
  }

  private get enabled() {
    return process.env.AI_AGENT_ENABLED === 'true' || Boolean(this.qwenApiKey)
  }

  private get qwenModel() {
    return process.env.QWEN_MODEL || 'qwen-plus'
  }

  private get qwenBaseURL() {
    return process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }

  private get qwenTimeoutMs() {
    return Number(process.env.QWEN_TIMEOUT_MS || 5000)
  }

  private async callQwen(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    if (!this.enabled || !this.qwenApiKey) {
      throw new Error('AI_AGENT 未启用或缺少 QWEN_API_KEY')
    }

    const requestBody = {
      model: this.qwenModel,
      temperature: 0.3,
      messages
    }

    const startedAt = Date.now()
    console.info('[AIAgentService] Qwen request start', {
      baseURL: this.qwenBaseURL,
      model: this.qwenModel,
      messageCount: messages.length,
      timeoutMs: this.qwenTimeoutMs,
      firstMessagePreview: messages[0]?.content?.slice(0, 120)
    })

    try {
      const response = await axios.post(
        `${this.qwenBaseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.qwenApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.qwenTimeoutMs
        }
      )

      const content = response.data?.choices?.[0]?.message?.content
      console.info('[AIAgentService] Qwen request success', {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        hasContent: Boolean(content)
      })

      if (!content) throw new Error('模型返回为空')

      return this.parseModelJson(content)
    } catch (error: any) {
      console.error('[AIAgentService] Qwen request failed', {
        elapsedMs: Date.now() - startedAt,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        baseURL: this.qwenBaseURL,
        model: this.qwenModel
      })
      throw error
    }
  }

  private async tryQwenWithFallback<T>(
    fallbackName: string,
    runner: () => Promise<T>,
    fallbackValue: T,
    meta: Record<string, any>
  ): Promise<T> {
    try {
      return await runner()
    } catch (error: any) {
      console.error(`[AIAgentService] ${fallbackName} 调用失败，直接使用规则兜底:`, {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        ...meta
      })
      return fallbackValue
    }
  }

  async triage(input: TriageInput) {
    const system = `你是社区养老医疗分诊AI。输出JSON：{riskLevel,reason,actions,followUpMinutes,familyNotify}`
    const user = `请根据数据分诊，要求平衡风格（避免误报也避免漏报）。\n${JSON.stringify(input)}`

    const fallback = {
      riskLevel: 'medium' as const,
      reason: 'AI不可用，已回退规则建议',
      actions: ['复测关键指标', '联系社区护士核实', '30分钟内回访'],
      followUpMinutes: 30,
      familyNotify: false,
      _meta: {
        source: 'fallback',
        status: null,
        message: 'unknown_error'
      }
    }

    const result = await this.tryQwenWithFallback(
      'Qwen triage',
      () => this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]),
      fallback,
      { input }
    )

    return result._meta?.source === 'fallback'
      ? result
      : { ...result, _meta: { source: 'qwen' } }
  }

  async dispatch(input: DispatchInput) {
    const system = `你是养老机构调度AI。输出JSON：{assigneeRole,priority,steps,slaMinutes,escalationRule}`
    const user = `请生成派单方案（平衡风格）。\n${JSON.stringify(input)}`

    const fallback = {
      assigneeRole: input.module === '医护' ? `${input.shift}值班医生` : `${input.shift}护理员`,
      priority: input.riskLevel,
      steps: ['10分钟内电话确认', '30分钟内上门或视频随访', '完成后回填记录'],
      slaMinutes: input.riskLevel === 'high' ? 20 : 60,
      escalationRule: '超时自动升级至运营经理',
      _meta: {
        source: 'fallback',
        status: null,
        message: 'unknown_error'
      }
    }

    const result = await this.tryQwenWithFallback(
      'Qwen dispatch',
      () => this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]),
      fallback,
      { input }
    )

    return result._meta?.source === 'fallback'
      ? result
      : { ...result, _meta: { source: 'qwen' } }
  }

  async answer(input: AnswerInput) {
    const system = `你是社区养老场景的智能问答助手。请先直接回答用户问题，再给出是否需要执行动作的判断。输出JSON：{answer,analysis,needAction,actionSuggestion,followUpQuestions}`
    const user = `问题：${input.question}\n上下文：${JSON.stringify(input.context || {})}`

    const q = String(input.question || '')
    const riskKeywords = ['血压', '跌倒', '胸痛', '呼吸', '高危', '发烧', '意识']
    const likelyRisk = riskKeywords.some((k) => q.includes(k))

    const fallback = {
      answer: likelyRisk
        ? '从当前描述看，这可能属于需要优先关注的健康风险。建议先确认生命体征，再根据结果决定是否升级处置。'
        : '根据当前信息，建议先补充关键背景，再做进一步判断。',
      analysis: likelyRisk
        ? '问题包含潜在健康风险关键词，建议以安全优先的方式处理。'
        : '当前问题更偏信息不充分的咨询，建议先补充具体情况。',
      needAction: likelyRisk,
      actionSuggestion: likelyRisk
        ? '建议立即安排电话确认或现场复测，并视情况创建Agent任务。'
        : '如需落地执行，可继续补充信息后创建任务。',
      followUpQuestions: ['老人目前是否清醒？', '是否有生命体征数据？', '最近是否有类似情况？'],
      _meta: {
        source: 'fallback',
        status: null,
        message: 'unknown_error'
      }
    }

    const result = await this.tryQwenWithFallback(
      'Qwen answer',
      () => this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]),
      fallback,
      { input }
    ) as typeof fallback

    return result._meta?.source === 'fallback'
      ? result
      : { ...result, _meta: { source: 'qwen' } }
  }

  async copilot(question: string, context?: Record<string, any>) {
    const answer = await this.answer({ question, context })
    return {
      summary: answer.answer,
      todo: answer.actionSuggestion ? [answer.actionSuggestion] : [],
      risks: answer.analysis ? [answer.analysis] : [],
      communication: answer.needAction ? '建议尽快进行下一步处置。' : '可先观察并补充信息。',
      answer,
      _meta: answer._meta
    }
  }

  async fullDecision(payload: {
    triageInput: TriageInput
    dispatchInput: DispatchInput
    copilotQuestion: string
    context?: Record<string, any>
  }) {
    const [triage, dispatch, copilot] = await Promise.all([
      this.triage(payload.triageInput),
      this.dispatch(payload.dispatchInput),
      this.copilot(payload.copilotQuestion, payload.context)
    ])

    return {
      triage,
      dispatch,
      copilot,
      model: this.qwenModel,
      provider: 'qwen'
    }
  }
}

export default new AIAgentService()
