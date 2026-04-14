import { Op } from 'sequelize'
import { Elderly, Notification, ServiceRequest, User, Warning } from '../models'
import resourceSchedulingService from './resourceSchedulingService'

export interface AgentTaskCard {
  id: string
  module: '护理' | '医护' | '后勤' | '收费' | '接待'
  sourceType: 'warning' | 'notification' | 'service_request'
  sourceId: number
  elderlyId?: number
  elderlyName?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'processing' | 'resolved' | 'assigned' | 'completed'
  suggestedAction: string
  slaMinutes: number
  elapsedMinutes: number
  slaStatus: 'normal' | 'warning' | 'overdue'
  escalationTarget: '护理组长' | '值班医生' | '运营经理'
  eventScore: number
  createdAt: Date
}

class AgentOrchestratorService {
  private cache = new Map<string, { expiresAt: number; value: any }>()

  private getCache<T>(key: string): T | null {
    const hit = this.cache.get(key)
    if (!hit) return null
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return hit.value as T
  }

  private setCache<T>(key: string, value: T, ttlMs = 8000) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  private clearCache() {
    this.cache.clear()
  }

  private getSlaMinutes(module: AgentTaskCard['module'], priority: AgentTaskCard['priority']) {
    const table: Record<AgentTaskCard['module'], { low: number; medium: number; high: number }> = {
      护理: { low: 240, medium: 120, high: 30 },
      医护: { low: 180, medium: 90, high: 20 },
      后勤: { low: 480, medium: 240, high: 60 },
      收费: { low: 720, medium: 360, high: 120 },
      接待: { low: 180, medium: 90, high: 30 }
    }
    return table[module][priority]
  }

  private buildSla(createdAt: Date, slaMinutes: number) {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    const ratio = elapsedMinutes / slaMinutes
    const slaStatus: AgentTaskCard['slaStatus'] = ratio >= 1 ? 'overdue' : ratio >= 0.8 ? 'warning' : 'normal'
    return { elapsedMinutes, slaStatus }
  }

  private getEscalationTarget(module: AgentTaskCard['module']): AgentTaskCard['escalationTarget'] {
    if (module === '医护') return '值班医生'
    if (module === '护理') return '护理组长'
    return '运营经理'
  }

  private computeEventScore(input: {
    sourceType: AgentTaskCard['sourceType']
    priority: AgentTaskCard['priority']
    slaStatus: AgentTaskCard['slaStatus']
    elapsedMinutes: number
    slaMinutes: number
  }) {
    const baseByPriority = input.priority === 'high' ? 70 : input.priority === 'medium' ? 45 : 20
    const sourceWeight = input.sourceType === 'warning' ? 12 : input.sourceType === 'service_request' ? 8 : 5
    const slaWeight = input.slaStatus === 'overdue' ? 25 : input.slaStatus === 'warning' ? 12 : 0
    const elapsedRatio = Math.min(2, input.elapsedMinutes / Math.max(1, input.slaMinutes))
    const urgency = Math.round(elapsedRatio * 8)
    return Math.min(100, baseByPriority + sourceWeight + slaWeight + urgency)
  }

  getDutyRoutingSuggestion(module: AgentTaskCard['module']) {
    const hour = new Date().getHours()
    const shift = hour >= 8 && hour < 16 ? '白班' : hour >= 16 && hour < 24 ? '晚班' : '夜班'

    const roleByModule: Record<AgentTaskCard['module'], string> = {
      护理: `${shift}护理员`,
      医护: `${shift}值班医生`,
      后勤: `${shift}后勤专员`,
      收费: `${shift}收费专员`,
      接待: `${shift}接待专员`
    }

    return { shift, suggestedRole: roleByModule[module] }
  }

  async getWorkbenchOverview() {
    const key = 'overview'
    const cached = this.getCache<any>(key)
    if (cached) return cached

    const [pendingWarnings, processingWarnings, urgentNotifications, pendingServiceRequests] = await Promise.all([
      Warning.count({ where: { status: 'pending' } }),
      Warning.count({ where: { status: 'processing' } }),
      Notification.count({ where: { type: 'medical_urgent', isRead: false } }),
      ServiceRequest.count({ where: { status: 'pending' } })
    ])

    const allTasks = await this.getTaskCards(200)
    const overdueCount = allTasks.filter(t => t.slaStatus === 'overdue').length

    const payload = {
      pendingWarnings,
      processingWarnings,
      urgentNotifications,
      pendingServiceRequests,
      overdueCount,
      totalToHandle: pendingWarnings + processingWarnings + urgentNotifications + pendingServiceRequests,
      pendingTaskCount: allTasks.filter(t => t.status === 'pending').length,
      assignedTaskCount: allTasks.filter(t => t.status === 'assigned').length,
      processingTaskCount: allTasks.filter(t => t.status === 'processing').length,
      highRiskTaskCount: allTasks.filter(t => t.priority === 'high').length,
      avgEventScore: allTasks.length ? Number((allTasks.reduce((sum, t) => sum + t.eventScore, 0) / allTasks.length).toFixed(1)) : 0
    }
    this.setCache(key, payload, 8000)
    return payload
  }

  async getTaskCards(limit = 50, module?: AgentTaskCard['module']): Promise<AgentTaskCard[]> {
    const key = `tasks:${limit}:${module || 'all'}`
    const cached = this.getCache<AgentTaskCard[]>(key)
    if (cached) return cached

    const [warnings, serviceRequests] = await Promise.all([
      Warning.findAll({
        where: { status: { [Op.in]: ['pending', 'processing'] } },
        include: [{ model: Elderly, as: 'elderly', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']],
        limit
      }),
      ServiceRequest.findAll({
        where: { status: { [Op.in]: ['pending', 'assigned'] } },
        include: [{ model: Elderly, as: 'elderly', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']],
        limit
      })
    ])

    const warningCards: AgentTaskCard[] = warnings.map((item: any) => {
      const selectedModule: AgentTaskCard['module'] = item.warningType?.includes('medical') || item.warningType?.includes('health') ? '医护' : '护理'
      const slaMinutes = this.getSlaMinutes(selectedModule, item.riskLevel)
      const { elapsedMinutes, slaStatus } = this.buildSla(item.createdAt, slaMinutes)
      const duty = this.getDutyRoutingSuggestion(selectedModule)
      const escalationTarget = this.getEscalationTarget(selectedModule)

      const eventScore = this.computeEventScore({
        sourceType: 'warning',
        priority: item.riskLevel,
        slaStatus,
        elapsedMinutes,
        slaMinutes
      })

      return {
        id: `warning-${item.id}`,
        module: selectedModule,
        sourceType: 'warning',
        sourceId: item.id,
        elderlyId: item.elderlyId,
        elderlyName: item.elderly?.name,
        title: item.title,
        description: item.description,
        priority: item.riskLevel,
        status: item.status,
        source: '风险预警',
        suggestedAction: slaStatus === 'overdue'
          ? `已超时，建议升级给${escalationTarget}并立即回访；当前建议路由：${duty.suggestedRole}`
          : `建议路由：${duty.suggestedRole}。${item.riskLevel === 'high' ? '立即联系家属并安排就医。' : '尽快复核数据并安排随访。'}`,
        slaMinutes,
        elapsedMinutes,
        slaStatus,
        escalationTarget,
        eventScore,
        createdAt: item.createdAt
      }
    })

    const serviceCards: AgentTaskCard[] = serviceRequests.map((item: any) => {
      const selectedModule: AgentTaskCard['module'] = item.requestType?.includes('维修') ? '后勤' : item.requestType?.includes('收费') ? '收费' : '护理'
      const slaMinutes = this.getSlaMinutes(selectedModule, item.priority)
      const { elapsedMinutes, slaStatus } = this.buildSla(item.createdAt, slaMinutes)
      const duty = this.getDutyRoutingSuggestion(selectedModule)
      const escalationTarget = this.getEscalationTarget(selectedModule)

      const eventScore = this.computeEventScore({
        sourceType: 'service_request',
        priority: item.priority,
        slaStatus,
        elapsedMinutes,
        slaMinutes
      })

      return {
        id: `service-${item.id}`,
        module: selectedModule,
        sourceType: 'service_request',
        sourceId: item.id,
        elderlyId: item.elderlyId,
        elderlyName: item.elderly?.name,
        title: `服务请求：${item.requestType}`,
        description: item.description,
        priority: item.priority,
        status: item.status,
        source: '手动创建',
        suggestedAction: slaStatus === 'overdue'
          ? `服务已超时，建议升级给${escalationTarget}；当前建议路由：${duty.suggestedRole}`
          : item.status === 'pending' ? `为该请求匹配${duty.suggestedRole}。` : '跟进执行进度并反馈结果。',
        slaMinutes,
        elapsedMinutes,
        slaStatus,
        escalationTarget,
        eventScore,
        createdAt: item.createdAt
      }
    })

    let cards = [...warningCards, ...serviceCards]
      .sort((a, b) => b.eventScore - a.eventScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (module) {
      cards = cards.filter(c => c.module === module)
    }

    // 去重：根据来源类型和来源ID去重，确保每个预警或服务请求只显示一次
    const uniqueCards = cards.filter((card, index, self) => {
      return index === self.findIndex((c) => {
        return c.sourceType === card.sourceType && c.sourceId === card.sourceId
      })
    })

    const payload = uniqueCards.slice(0, limit)
    this.setCache(key, payload, 8000)
    return payload
  }

  async getFamilyTimeline(elderlyId: number) {
    const [warnings, serviceRequests, notifications] = await Promise.all([
      Warning.findAll({ where: { elderlyId }, order: [['createdAt', 'DESC']], limit: 20 }),
      ServiceRequest.findAll({ where: { elderlyId }, order: [['createdAt', 'DESC']], limit: 20 }),
      Notification.findAll({ where: { relatedId: elderlyId }, order: [['createdAt', 'DESC']], limit: 20 })
    ])

    const events = [
      ...warnings.map((w: any) => ({
        time: w.createdAt,
        type: '预警',
        title: w.title,
        detail: `${w.description}（状态：${w.status}）`
      })),
      ...serviceRequests.map((s: any) => ({
        time: s.createdAt,
        type: '服务',
        title: s.requestType,
        detail: `${s.description}（状态：${s.status}）`
      })),
      ...notifications.map((n: any) => ({
        time: n.createdAt,
        type: '通知',
        title: n.title,
        detail: n.content
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return events
  }

  async getQualityMetrics(days = 7) {
    const key = `quality:${days}`
    const cached = this.getCache<any>(key)
    if (cached) return cached

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [totalWarnings, resolvedWarnings, totalServiceRequests, completedServiceRequests] = await Promise.all([
      Warning.count({ where: { createdAt: { [Op.gte]: since } } }),
      Warning.findAll({ where: { createdAt: { [Op.gte]: since }, status: 'resolved', handleTime: { [Op.not]: null } } }),
      ServiceRequest.count({ where: { createdAt: { [Op.gte]: since } } }),
      ServiceRequest.count({ where: { createdAt: { [Op.gte]: since }, status: 'completed' } })
    ])

    const avgWarningHandleMinutes = resolvedWarnings.length
      ? Math.round(
        resolvedWarnings.reduce((sum: number, item: any) => {
          const created = new Date(item.createdAt).getTime()
          const handled = new Date(item.handleTime).getTime()
          return sum + (handled - created) / 60000
        }, 0) / resolvedWarnings.length
      )
      : 0

    // 超时率采用“时间窗口内产生的任务”口径（包含已完成），更符合运营评估
    const [windowWarnings, windowServiceRequests] = await Promise.all([
      Warning.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['id', 'createdAt', 'status', 'riskLevel', 'warningType'] }),
      ServiceRequest.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['id', 'createdAt', 'status', 'priority', 'requestType'] })
    ])

    const warningOverdueCount = windowWarnings.filter((w: any) => {
      const module: AgentTaskCard['module'] = w.warningType?.includes('medical') || w.warningType?.includes('health') ? '医护' : '护理'
      const sla = this.getSlaMinutes(module, w.riskLevel)
      const elapsed = (Date.now() - new Date(w.createdAt).getTime()) / 60000
      const closed = w.status === 'resolved'
      return !closed && elapsed > sla
    }).length

    const serviceOverdueCount = windowServiceRequests.filter((s: any) => {
      const module: AgentTaskCard['module'] = s.requestType?.includes('维修') ? '后勤' : s.requestType?.includes('收费') ? '收费' : '护理'
      const sla = this.getSlaMinutes(module, s.priority)
      const elapsed = (Date.now() - new Date(s.createdAt).getTime()) / 60000
      const closed = s.status === 'completed'
      return !closed && elapsed > sla
    }).length

    const totalWindowTasks = windowWarnings.length + windowServiceRequests.length
    const overdueRate = totalWindowTasks
      ? Number((((warningOverdueCount + serviceOverdueCount) / totalWindowTasks) * 100).toFixed(1))
      : 0
    const closureRate = totalWarnings ? Number(((resolvedWarnings.length / totalWarnings) * 100).toFixed(1)) : 100
    const serviceCompletionRate = totalServiceRequests ? Number(((completedServiceRequests / totalServiceRequests) * 100).toFixed(1)) : 100

    const payload = {
      days,
      totalWarnings,
      resolvedWarnings: resolvedWarnings.length,
      closureRate,
      avgWarningHandleMinutes,
      totalServiceRequests,
      completedServiceRequests,
      serviceCompletionRate,
      overdueRate,
      overdueCount: warningOverdueCount + serviceOverdueCount,
      totalWindowTasks,
      metricScope: `最近${days}天（含已完成任务）`
    }

    this.setCache(key, payload, 8000)
    return payload
  }

  async getCommandCenterSnapshot() {
    const key = 'command-center'
    const cached = this.getCache<any>(key)
    if (cached) return cached

    const [tasks, quality, overview] = await Promise.all([
      this.getTaskCards(500),
      this.getQualityMetrics(30),
      this.getWorkbenchOverview()
    ])

    const moduleBuckets = ['护理', '医护', '后勤', '收费', '接待'] as const
    const moduleStats = moduleBuckets.map((module) => {
      const moduleTasks = tasks.filter(t => t.module === module)
      return {
        module,
        total: moduleTasks.length,
        highPriority: moduleTasks.filter(t => t.priority === 'high').length,
        overdue: moduleTasks.filter(t => t.slaStatus === 'overdue').length
      }
    })

    const riskHeat = tasks
      .filter(t => t.priority === 'high' || t.slaStatus === 'overdue')
      .slice(0, 20)
      .map(t => ({
        elderlyName: t.elderlyName || '未知',
        module: t.module,
        risk: t.priority,
        slaStatus: t.slaStatus,
        title: t.title,
        eventScore: t.eventScore
      }))
      // 去重：根据老人姓名和事件标题去重
      .filter((item, index, self) => {
        return index === self.findIndex((t) => {
          return t.elderlyName === item.elderlyName && t.title === item.title
        })
      })

    const dispatchRealtime = {
      pendingDispatch: tasks.filter(t => t.status === 'pending').length,
      assignedDispatch: tasks.filter(t => t.status === 'assigned').length,
      processingDispatch: tasks.filter(t => t.status === 'processing').length,
      overdueDispatch: tasks.filter(t => t.slaStatus === 'overdue').length,
      highRiskDispatch: tasks.filter(t => t.priority === 'high').length,
      avgEventScore: tasks.length ? Number((tasks.reduce((sum, t) => sum + t.eventScore, 0) / tasks.length).toFixed(1)) : 0
    }

    const payload = {
      generatedAt: new Date(),
      overview,
      quality,
      moduleStats,
      dispatchRealtime,
      riskHeat
    }

    this.setCache(key, payload, 8000)
    return payload
  }

  async escalateOverdueTasks(limit = 20) {
    const tasks = await this.getTaskCards(300)
    const overdue = tasks.filter(t => t.slaStatus === 'overdue').slice(0, limit)

    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] })
    const adminIds = admins.map(a => a.id)

    let escalatedCount = 0
    for (const item of overdue) {
      if (!adminIds.length) break

      const title = `任务超时升级：${item.title}`
      const content = `${item.module}模块任务已超时，建议升级至${item.escalationTarget}。关联老人：${item.elderlyName || '未知'}`
      await Promise.all(adminIds.map(userId => Notification.create({ userId, title, content, type: 'agent_escalation', relatedId: item.elderlyId || item.sourceId, isRead: false })))
      escalatedCount += 1
    }

    this.clearCache()
    return { escalatedCount, sample: overdue }
  }

  async quickDispatchFromElderly(input: {
    elderlyId: number
    requestType: string
    priority: 'low' | 'medium' | 'high'
    description: string
    requiredSkills: string
  }) {
    const elderly = await Elderly.findByPk(input.elderlyId)
    if (!elderly) {
      throw new Error('老人不存在')
    }

    const created = await resourceSchedulingService.createServiceRequest(
      elderly.id,
      input.requestType,
      input.priority,
      input.description,
      input.requiredSkills
    )

    this.clearCache()
    return created.data
  }

  async resolveWarning(warningId: number) {
    const warning = await Warning.findByPk(warningId)
    if (!warning) {
      throw new Error('预警不存在')
    }

    await warning.update({
      status: 'resolved',
      handleTime: new Date(),
      handleNotes: warning.handleNotes || '由总控Agent工作台快速处理'
    })

    this.clearCache()
    return warning
  }
}

export default new AgentOrchestratorService()
