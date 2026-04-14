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

  private get apiKey() {
    return process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || ''
  }

  private get enabled() {
    return process.env.AI_AGENT_ENABLED === 'true' || Boolean(this.apiKey)
  }

  private get model() {
    return process.env.QWEN_MODEL || 'qwen-plus'
  }

  private get baseURL() {
    return process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }

  private async callQwen(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    if (!this.enabled || !this.apiKey) {
      throw new Error('AI_AGENT 未启用或缺少 QWEN_API_KEY')
    }

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages,
        extra_body: { enable_thinking: false }
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const content = response.data?.choices?.[0]?.message?.content
    if (!content) throw new Error('模型返回为空')

    return this.parseModelJson(content)
  }

  async triage(input: TriageInput) {
    const system = `你是社区养老医疗分诊AI。输出JSON：{riskLevel,reason,actions,followUpMinutes,familyNotify}`
    const user = `请根据数据分诊，要求平衡风格（避免误报也避免漏报）。\n${JSON.stringify(input)}`

    try {
      const result = await this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ])
      return {
        ...result,
        _meta: { source: 'qwen' }
      }
    } catch (error: any) {
      console.error('Qwen triage 调用失败:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })

      return {
        riskLevel: 'medium',
        reason: 'AI不可用，已回退规则建议',
        actions: ['复测关键指标', '联系社区护士核实', '30分钟内回访'],
        followUpMinutes: 30,
        familyNotify: false,
        _meta: {
          source: 'fallback',
          status: error?.response?.status || null,
          message: error?.message || 'unknown_error'
        }
      }
    }
  }

  async dispatch(input: DispatchInput) {
    const system = `你是养老机构调度AI。输出JSON：{assigneeRole,priority,steps,slaMinutes,escalationRule}`
    const user = `请生成派单方案（平衡风格）。\n${JSON.stringify(input)}`

    try {
      const result = await this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ])
      return {
        ...result,
        _meta: { source: 'qwen' }
      }
    } catch (error: any) {
      console.error('Qwen dispatch 调用失败:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })

      return {
        assigneeRole: input.module === '医护' ? `${input.shift}值班医生` : `${input.shift}护理员`,
        priority: input.riskLevel,
        steps: ['10分钟内电话确认', '30分钟内上门或视频随访', '完成后回填记录'],
        slaMinutes: input.riskLevel === 'high' ? 20 : 60,
        escalationRule: '超时自动升级至运营经理',
        _meta: {
          source: 'fallback',
          status: error?.response?.status || null,
          message: error?.message || 'unknown_error'
        }
      }
    }
  }

  async copilot(question: string, context?: Record<string, any>) {
    const system = `你是机构养老运营副驾AI。输出JSON：{summary,todo,risks,communication}`
    const user = `问题：${question}\n上下文：${JSON.stringify(context || {})}`

    try {
      const result = await this.callQwen([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ])
      return {
        ...result,
        _meta: { source: 'qwen' }
      }
    } catch (error: any) {
      console.error('Qwen copilot 调用失败:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })

      return {
        summary: '当前建议先处理高优先级任务并检查超时SLA。',
        todo: ['先处置高风险预警', '执行超时升级', '同步家属进展'],
        risks: ['夜班人手不足可能导致延迟'],
        communication: '建议向家属说明已启动紧急跟进流程。',
        _meta: {
          source: 'fallback',
          status: error?.response?.status || null,
          message: error?.message || 'unknown_error'
        }
      }
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
      model: this.model,
      provider: 'qwen'
    }
  }
}

export default new AIAgentService()
