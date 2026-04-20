import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Descriptions,
  Tag,
  Timeline,
  Statistic,
  Collapse,
  List,
  Divider,
  Progress,
  Switch,
  App
} from 'antd'
import axios from '../utils/axiosInstance'
import { useLocation } from 'react-router-dom'

const { TextArea } = Input
const { Title, Text } = Typography

type TaskStatus = 'idle' | 'queued' | 'planning' | 'pending_approval' | 'executing' | 'tracking' | 'done' | 'failed' | 'rejected'

interface QueueTask {
  id: string
  title: string
  status: TaskStatus
  createdAt: string
  traceId?: string
}

const AgentVNext: React.FC = () => {
  const location = useLocation()
  const { message } = App.useApp()

  const toRiskLevelZh = (level?: string) => level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'

  const [elderlyId, setElderlyId] = useState<number | undefined>(undefined)
  const [elderlyOptions, setElderlyOptions] = useState<Array<{ label: string; value: number }>>([])
  const [strategyMode, setStrategyMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced')
  const [module, setModule] = useState<'护理' | '医护' | '后勤' | '收费' | '接待'>('医护')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('high')
  const [eventSummary, setEventSummary] = useState('血压危急，需立即干预')

  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [autonomous, setAutonomous] = useState<any>(null)
  const [outcomeRes, setOutcomeRes] = useState<any>(null)
  const [policyRes, setPolicyRes] = useState<any>(null)
  const [riskReport, setRiskReport] = useState<any>(null)
  const [lastTraceId, setLastTraceId] = useState<string>('')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle')
  const [queue, setQueue] = useState<QueueTask[]>([])
  const [queueCollapsed, setQueueCollapsed] = useState<boolean>(false)
  const [autoPilot, setAutoPilot] = useState<boolean>(true)
  const [maxRetries, setMaxRetries] = useState<number>(2)
  const [runtimeTaskId, setRuntimeTaskId] = useState<string>('')
  const [runtimeEvents, setRuntimeEvents] = useState<Array<{ at: string; type: string; message: string; data?: any }>>([])
  const [taskSource, setTaskSource] = useState<'manual' | 'query' | 'warning' | 'unknown'>('manual')
  const [modelPreference, setModelPreference] = useState<'auto' | 'qwen' | 'deepseek' | 'rule'>('auto')

  const pollRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const onGlobalError = (evt: Event) => {
      const detail = (evt as CustomEvent<string>)?.detail
      if (detail) {
        message.error(detail)
      }
    }

    window.addEventListener('app:error', onGlobalError as EventListener)

    try {
      const savedQueue = localStorage.getItem('agent_vnext_queue')
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue)
        if (Array.isArray(parsed)) setQueue(parsed.slice(0, 20))
      }

      const queryContext = localStorage.getItem('agent_query_context')
      if (queryContext) {
        const parsedContext = JSON.parse(queryContext)
        if (parsedContext?.query) {
          setEventSummary(parsedContext.query)
          setTaskSource(parsedContext.escalate ? 'warning' : 'query')
        }
        if (parsedContext?.traceId) {
          setLastTraceId(parsedContext.traceId)
        }
      }
    } catch {}

    const loadElders = async () => {
      try {
        const res = await axios.get('/elderly', { params: { page: 1, limit: 200 } })
        const list = res.data?.data || []
        const options = list.map((item: any) => ({ label: `${item.name}（ID:${item.id}，${item.age || '-'}岁）`, value: item.id }))
        setElderlyOptions(options)
        if (!elderlyId && options.length) setElderlyId(options[0].value)
        if (options[0]?.value) fetchRiskReport(options[0].value)
      } catch {
        message.warning('老人列表加载失败，请先检查老人数据')
      }
    }

    loadElders()

    return () => {
      window.removeEventListener('app:error', onGlobalError as EventListener)
      if (pollRef.current) window.clearInterval(pollRef.current)
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [message])

  useEffect(() => {
    const state = (location.state as any) || {}
    if (state?.elderlyId && !elderlyId) setElderlyId(Number(state.elderlyId))
    if (state?.riskAnalysis) setRiskReport(state.riskAnalysis)
    if (state?.elderlyId) fetchRiskReport(Number(state.elderlyId))
  }, [location.state])

  useEffect(() => {
    if (!runtimeTaskId) return
    if (eventSourceRef.current) eventSourceRef.current.close()
    if (pollRef.current) window.clearInterval(pollRef.current)

    let disposed = false
    let reconnectTimer: number | null = null
    let retryCount = 0

    const token = localStorage.getItem('token') || ''
    const sseUrl = `/api/agent-vnext/tasks/${runtimeTaskId}/events?token=${encodeURIComponent(token)}`

    const startPolling = () => {
      if (pollRef.current) return
      pollRef.current = window.setInterval(() => {
        fetchTaskSnapshot(runtimeTaskId)
      }, 3000)
    }

    const stopPolling = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const scheduleReconnect = async () => {
      if (disposed) return
      retryCount += 1

      try {
        await axios.get(`/agent-vnext/tasks/${runtimeTaskId}`, {
          timeout: 2500,
          suppressGlobalError: true
        } as any)
      } catch (probeError: any) {
        if (probeError?.response?.status === 401) {
          message.warning('事件流连接失败：登录已过期，请重新登录')
          return
        }
        if (!probeError?.response) {
          message.warning('事件流连接失败：后端服务不可达（请检查后端是否启动/端口是否正确）')
        }
      }

      const backoffMs = Math.min(10000, 1000 * Math.pow(2, Math.min(retryCount, 4)))
      reconnectTimer = window.setTimeout(() => {
        if (!disposed) connectSSE()
      }, backoffMs)
    }

    const connectSSE = () => {
      if (disposed) return
      if (eventSourceRef.current) eventSourceRef.current.close()

      const es = new EventSource(sseUrl)
      eventSourceRef.current = es

      es.onopen = () => {
        retryCount = 0
        startPolling()
      }

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data || '{}')
          if (data?.type === 'INIT') return
          setRuntimeEvents((prev) => [...prev, data].slice(-100))
          if (data?.type === 'TASK_PLANNED') setTaskStatus('pending_approval')
          if (data?.type === 'TASK_EXECUTING') setTaskStatus('executing')
          if (data?.type === 'TASK_TRACKING') setTaskStatus('tracking')
          if (data?.type === 'TASK_DONE') {
            setTaskStatus('done')
            stopPolling()
          }
          if (data?.type === 'TASK_FAILED') {
            setTaskStatus('failed')
            stopPolling()
          }
          if (data?.type === 'TASK_REJECTED') {
            setTaskStatus('rejected')
            stopPolling()
          }
        } catch {}
      }

      es.onerror = () => {
        if (eventSourceRef.current) eventSourceRef.current.close()
        eventSourceRef.current = null
        scheduleReconnect()
      }
    }

    connectSSE()

    return () => {
      disposed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (eventSourceRef.current) eventSourceRef.current.close()
      stopPolling()
    }
  }, [runtimeTaskId, message])

  const payload = useMemo(() => ({ elderlyId, strategyMode, module, riskLevel, eventSummary }), [elderlyId, strategyMode, module, riskLevel, eventSummary])

  const demoScenarios = [
    { label: '高血压告警', value: '血压危急，需立即干预', risk: 'high' as const, module: '医护' as const },
    { label: '跌倒风险', value: '老人近24小时活动异常，疑似跌倒风险升高', risk: 'high' as const, module: '护理' as const },
    { label: '随访中断', value: '连续三次随访未完成，可能存在服务中断', risk: 'medium' as const, module: '后勤' as const }
  ]

  const pushQueue = (status: TaskStatus, title?: string, traceId?: string) => {
    setQueue((prev) => {
      const next = [{ id: `${Date.now()}`, title: title || eventSummary, status, createdAt: new Date().toLocaleTimeString(), traceId }, ...prev].slice(0, 20)
      localStorage.setItem('agent_vnext_queue', JSON.stringify(next))
      return next
    })
  }

  const fetchTaskSnapshot = async (taskId: string) => {
    try {
      const res = await axios.get(`/agent-vnext/tasks/${taskId}`)
      const d = res.data?.data
      if (!d) return
      setTaskStatus((d.status || 'idle') as TaskStatus)
      setPlan((prev: any) => prev || (d.summary ? { planner: { summary: d.summary } } : null))
      setAutonomous((prev: any) => ({ ...(prev || {}), execution: d.toolExecution || [] }))
      setOutcomeRes(d.outcome || null)
      setLastTraceId(d.traceId || '')
      setRuntimeEvents(d.events || [])
    } catch {
      // ignore polling read errors
    }
  }

  const fetchRiskReport = async (elderlyTargetId?: number) => {
    if (!elderlyTargetId) return
    try {
      const res = await axios.get(`/risk-analysis/${elderlyTargetId}`, { params: { days: 7 } })
      setRiskReport(res.data?.data || null)
      return res.data?.data || null
    } catch {
      setRiskReport(null)
      return null
    }
  }

  const createRuntimeTask = async () => {
    if (!elderlyId) return message.warning('请先选择老人')
    if (loading) return
    setLoading(true)
    setTaskStatus('planning')
    try {
      const queryContext = (() => {
        try {
          const raw = localStorage.getItem('agent_query_context')
          return raw ? JSON.parse(raw) : null
        } catch {
          return null
        }
      })()
      const currentRisk = riskReport || await fetchRiskReport(elderlyId)
      const enhancedPayload = {
        ...payload,
        modelPreference,
        source: queryContext ? 'question-answer' : 'manual',
        sourceQuery: queryContext?.query || '',
        sourceAnswer: queryContext?.answer || '',
        sourceTraceId: queryContext?.traceId || '',
        sourceSuggestedAction: queryContext?.suggestedAction || [],
        riskAnalysis: currentRisk
      }
      const res = await axios.post('/agent-vnext/tasks', enhancedPayload, { timeout: 70000 })
      const data = res.data?.data || {}
      const createdTaskId = data.taskId || ''
      setRuntimeTaskId(createdTaskId)
      setTaskStatus((data.status || 'pending_approval') as TaskStatus)
      setLastTraceId(data.traceId || '')
      setPlan({ planner: { summary: data.summary || '计划已生成' } })
      setRuntimeEvents([])
      pushQueue((data.status || 'pending_approval') as TaskStatus, `任务已创建: ${eventSummary}`, data.traceId)
      message.success('任务已创建')

      if (createdTaskId) {
        fetchTaskSnapshot(createdTaskId)
      }
    } catch (error: any) {
      const aborted = error?.code === 'ERR_CANCELED' || error?.message === 'canceled'
      const backendMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || '任务创建失败'
      const fallbackMsg = aborted
        ? '请求已中止：请检查是否页面跳转、重复点击或网络中断'
        : /timeout|超时|Model|模型|Qwen|DeepSeek/i.test(backendMsg)
          ? '模型暂时不可用，已切换规则兜底，请稍后重试'
          : backendMsg
      setTaskStatus('failed')
      pushQueue('failed', `任务创建失败: ${eventSummary}`, lastTraceId)
      message.error(fallbackMsg)
    } finally {
      setLoading(false)
    }
  }

  const approveAndExecute = async () => {
    if (!runtimeTaskId) return message.warning('请先创建任务')
    setLoading(true)
    setTaskStatus('executing')
    try {
      const res = await axios.post(`/agent-vnext/tasks/${runtimeTaskId}/approve`)
      const data = res.data?.data || {}
      setTaskStatus((data.status || 'done') as TaskStatus)
      setAutonomous((prev: any) => ({ ...(prev || {}), execution: data.toolExecution || [] }))
      pushQueue('done', `任务执行完成: ${eventSummary}`, lastTraceId)
      message.success('任务审批并执行完成')
      return true
    } catch (error: any) {
      setTaskStatus('failed')
      pushQueue('failed', `任务执行失败: ${eventSummary}`, lastTraceId)
      message.error(error?.response?.data?.error || '审批执行失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const rejectTask = async () => {
    if (!runtimeTaskId) return message.warning('请先创建任务')
    setLoading(true)
    try {
      const res = await axios.post(`/agent-vnext/tasks/${runtimeTaskId}/reject`)
      setTaskStatus((res.data?.data?.status || 'rejected') as TaskStatus)
      pushQueue('rejected', `任务已驳回: ${eventSummary}`, lastTraceId)
      message.info('计划已驳回')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '驳回失败')
    } finally {
      setLoading(false)
    }
  }

  const runWeeklyUpdate = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/agent-vnext/policy/weekly-update')
      setPolicyRes(res.data?.data || null)
      setLastTraceId(res.data?.traceId || '')
      message.success('每周策略更新完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '策略更新失败（需管理员权限）')
    } finally {
      setLoading(false)
    }
  }

  const retryFailed = async () => {
    if (!runtimeTaskId) return message.warning('暂无可重试任务')
    if (taskStatus !== 'failed') return message.info('当前任务非失败状态，无需重试')
    for (let i = 0; i < maxRetries; i += 1) {
      const ok = await approveAndExecute()
      if (ok) return message.success(`重试成功（第${i + 1}次）`)
    }
    handoffToHuman()
  }

  const handoffToHuman = () => {
    const handoff = { id: `${Date.now()}`, title: `人工接管: ${eventSummary}`, status: 'tracking' as TaskStatus, createdAt: new Date().toLocaleTimeString(), traceId: lastTraceId }
    setQueue((prev) => {
      const next = [handoff, ...prev].slice(0, 20)
      localStorage.setItem('agent_vnext_queue', JSON.stringify(next))
      return next
    })
    message.warning('已触发人工接管，请值班人员接手处理')
  }

  const exportDemoJson = () => {
    const data = { exportedAt: new Date().toISOString(), traceId: lastTraceId, status: taskStatus, runtimeTaskId, input: payload, queue, plan, autonomous, outcomeRes, policyRes, runtimeEvents }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-runtime-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const failedExecutions = (autonomous?.execution || []).filter((x: any) => !x?.success)
  const toolExecutions = autonomous?.execution || []

  const statusConsistency = useMemo(() => {
    const latestEvent = runtimeEvents?.length ? runtimeEvents[runtimeEvents.length - 1] : null
    const eventImpliesDone = latestEvent?.type === 'TASK_DONE'
    const eventImpliesFailed = latestEvent?.type === 'TASK_FAILED'

    const hasExecutionButIdle = toolExecutions.length > 0 && (taskStatus === 'idle' || taskStatus === 'queued' || taskStatus === 'planning')
    const doneButNoOutcome = taskStatus === 'done' && !outcomeRes
    const eventAndStatusConflict = (eventImpliesDone && taskStatus !== 'done') || (eventImpliesFailed && taskStatus !== 'failed')

    const mismatch = hasExecutionButIdle || doneButNoOutcome || eventAndStatusConflict

    const reasons: string[] = []
    if (hasExecutionButIdle) reasons.push('已存在执行记录，但任务状态仍处于未执行阶段')
    if (doneButNoOutcome) reasons.push('任务状态已完成，但尚未读取到结果回写')
    if (eventAndStatusConflict) reasons.push('事件流最新状态与页面状态不一致')

    return {
      mismatch,
      reasons,
      latestEventType: latestEvent?.type || '-'
    }
  }, [runtimeEvents, toolExecutions.length, taskStatus, outcomeRes])

  const statusMeta: Record<TaskStatus, { text: string; color: string }> = {
    idle: { text: '待命', color: 'default' }, queued: { text: '排队中', color: 'processing' }, planning: { text: '规划中', color: 'processing' }, pending_approval: { text: '待审批', color: 'warning' }, executing: { text: '执行中', color: 'processing' }, tracking: { text: '追踪中', color: 'processing' }, done: { text: '已完成', color: 'success' }, failed: { text: '失败', color: 'error' }, rejected: { text: '已驳回', color: 'default' }
  }

  const queryContext = useMemo(() => {
    try {
      const raw = localStorage.getItem('agent_query_context')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [lastTraceId])

  const memoryFacts = [
    `短期记忆：当前任务「${eventSummary}」`,
    `长期偏好：策略模式=${strategyMode}，模块=${module}`,
    `最近traceId：${lastTraceId || '暂无'}`,
    `任务来源：${taskSource === 'query' ? '问答升级' : taskSource === 'warning' ? '风险预警' : taskSource === 'manual' ? '手动创建' : '未知'}`,
    `来源上下文：${queryContext ? '来自问答页' : '手动创建'}`
  ]

  const stageProgress = taskStatus === 'done' ? 100 : taskStatus === 'tracking' ? 80 : taskStatus === 'executing' ? 60 : taskStatus === 'pending_approval' ? 40 : taskStatus === 'planning' ? 20 : 0

  useEffect(() => {
    if (!runtimeTaskId) return
    if (!statusConsistency.mismatch) return

    fetchTaskSnapshot(runtimeTaskId)
  }, [runtimeTaskId, statusConsistency.mismatch])

  return (
    <div style={{ paddingBottom: 24 }}>
      <Title level={2}>社区养老 Agent 运行台</Title>
      <Alert showIcon type="info" message="核心范式：感知任务 → 规划编排 → 审批执行 → 工具调用 → 结果回写（含重试/接管）" style={{ marginBottom: 16 }} />

      <Card size="small" style={{ marginBottom: 16, borderRadius: 18, background: 'linear-gradient(135deg, #4b5563 0%, #7a8594 100%)', color: '#fff', border: 'none' }}>
        <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Text strong style={{ color: '#fff', fontSize: 16 }}>当前任务状态</Text>
            <Tag color="geekblue">{statusMeta[taskStatus].text}</Tag>
            {runtimeTaskId ? <Tag color="purple">taskId: {runtimeTaskId.slice(0, 8)}...</Tag> : null}
            {lastTraceId ? <Tag color="cyan">traceId: {lastTraceId}</Tag> : null}
          </Space>
          <Text style={{ color: '#e6fff5' }}>运行中 Agent 控制台</Text>
        </Space>
        <div style={{ marginTop: 10 }}>
          <Progress percent={stageProgress} size="small" strokeColor="#ffffff" trailColor="rgba(255,255,255,0.25)" status={taskStatus === 'failed' ? 'exception' : 'active'} />
        </div>
      </Card>

      {statusConsistency.mismatch ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 12 }}
          message={`检测到状态不一致，已自动触发同步（最新事件：${statusConsistency.latestEventType}）`}
          description={
            <div>
              {(statusConsistency.reasons || []).map((reason, idx) => (
                <div key={idx}>- {reason}</div>
              ))}
            </div>
          }
        />
      ) : null}

      {riskReport ? (
        <Card style={{ marginBottom: 16 }} title={`最新风险分析 - ${riskReport.elderly?.name || '未知老人'}`}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="风险分数" value={riskReport.summary?.riskScore || 0} /></Col>
            <Col span={6}><Statistic title="风险等级" value={riskReport.summary?.riskLevelZh || toRiskLevelZh(riskReport.summary?.riskLevel)} /></Col>
            <Col span={6}><Statistic title="趋势" value={riskReport.summary?.trend === 'worsening' ? '恶化' : riskReport.summary?.trend === 'improving' ? '改善' : '稳定'} /></Col>
            <Col span={6}><Statistic title="置信度" value={riskReport.summary?.confidence || 0} suffix="%" /></Col>
          </Row>
          <Divider />
          <Alert
            showIcon
            type={riskReport.summary?.riskLevel === 'high' ? 'error' : riskReport.summary?.riskLevel === 'medium' ? 'warning' : 'success'}
            message={`综合判断：${riskReport.summary?.riskLevelZh || toRiskLevelZh(riskReport.summary?.riskLevel)}`}
            description={
              <div>
                {(riskReport.analysis?.healthAbnormalities || []).slice(0, 2).map((item: string, idx: number) => <div key={`h-${idx}`}>- {item}</div>)}
                {(riskReport.analysis?.activityAbnormalities || []).slice(0, 2).map((item: string, idx: number) => <div key={`a-${idx}`}>- {item}</div>)}
                {(riskReport.analysis?.serviceGaps || []).map((item: string, idx: number) => <div key={`s-${idx}`}>- {item}</div>)}
              </div>
            }
          />
        </Card>
      ) : null}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={5}>
          <Card
            title="会话列表"
            style={{ borderRadius: 18, height: '100%' }}
            extra={<Button size="small" onClick={() => setQueueCollapsed((v) => !v)}>{queueCollapsed ? '展开' : '收起'}</Button>}
          >
            {queueCollapsed ? (
              <Text type="secondary">会话列表已收起，点击右上角展开查看。</Text>
            ) : (
              <List
                dataSource={queue}
                locale={{ emptyText: '暂无会话' }}
                renderItem={(q, index) => (
                  <List.Item style={{
                    padding: '10px 12px',
                    marginBottom: 8,
                    borderRadius: 12,
                    border: q.id === runtimeTaskId ? '1px solid #1890ff' : '1px solid #f0f0f0',
                    background: q.id === runtimeTaskId ? '#e6f4ff' : '#fff'
                  }}>
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text strong>{index === 0 ? '当前会话' : `历史会话 ${index}`}</Text>
                        <Tag color={statusMeta[q.status].color}>{statusMeta[q.status].text}</Tag>
                      </Space>
                      <Text>{q.title}</Text>
                      <Text type="secondary">{q.createdAt}</Text>
                      {q.traceId ? <Text type="secondary">{q.traceId}</Text> : null}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Agent 主舞台" style={{ borderRadius: 18, boxShadow: '0 10px 30px rgba(15,61,53,0.06)', minHeight: 620 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card size="small" variant="borderless" style={{ background: 'linear-gradient(135deg, #fafbfc 0%, #eef2f6 100%)', borderRadius: 16 }}>
                <Space wrap><Tag color="blue">感知</Tag><Tag color="gold">规划</Tag><Tag color="green">行动</Tag><Tag color="purple">记忆</Tag></Space>
                <div style={{ marginTop: 8 }}><Text type="secondary">提交任务后，Agent 会自动拆解、执行、追踪，并在事件流中持续反馈当前进度。</Text></div>
              </Card>

              {riskReport ? (
                <Card title="当前老人风险分析摘要" style={{ borderRadius: 16, marginTop: 12 }} extra={<Button size="small" onClick={() => fetchRiskReport(elderlyId)}>刷新分析</Button>}>
                  <Row gutter={12}>
                    <Col span={6}><Statistic title="风险分数" value={riskReport.summary?.riskScore || 0} /></Col>
                    <Col span={6}><Statistic title="风险等级" value={riskReport.summary?.riskLevelZh || toRiskLevelZh(riskReport.summary?.riskLevel)} /></Col>
                    <Col span={6}><Statistic title="趋势" value={riskReport.summary?.trend === 'worsening' ? '恶化' : riskReport.summary?.trend === 'improving' ? '改善' : '稳定'} /></Col>
                    <Col span={6}><Statistic title="异常项" value={(riskReport.analysis?.healthAbnormalities?.length || 0) + (riskReport.analysis?.activityAbnormalities?.length || 0)} /></Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text strong>建议动作：</Text>
                  <List
                    size="small"
                    dataSource={(riskReport.recommendations || []).slice(0, 3)}
                    renderItem={(item: any) => <List.Item>{item.timeWindow} · {item.owner} · {item.action}</List.Item>}
                  />
                </Card>
              ) : null}

              <Card title="输入参数（感知层）" style={{ borderRadius: 16 }}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12} xl={5}><Text>选择老人</Text><Select showSearch optionFilterProp="label" placeholder="请选择老人" style={{ width: '100%' }} value={elderlyId} onChange={(v) => setElderlyId(v)} options={elderlyOptions} /></Col>
                  <Col xs={24} md={12} xl={4}><Text>策略模式</Text><Select style={{ width: '100%' }} value={strategyMode} onChange={setStrategyMode} options={[{ label: '保守', value: 'conservative' }, { label: '平衡', value: 'balanced' }, { label: '灵敏', value: 'aggressive' }]} /></Col>
                  <Col xs={24} md={12} xl={4}><Text>模块</Text><Select style={{ width: '100%' }} value={module} onChange={setModule} options={[{ label: '护理', value: '护理' }, { label: '医护', value: '医护' }, { label: '后勤', value: '后勤' }, { label: '收费', value: '收费' }, { label: '接待', value: '接待' }]} /></Col>
                  <Col xs={24} md={12} xl={4}><Text>风险级别</Text><Select style={{ width: '100%' }} value={riskLevel} onChange={setRiskLevel} options={[{ label: '低风险', value: 'low' }, { label: '中风险', value: 'medium' }, { label: '高风险', value: 'high' }]} /></Col>
                  <Col xs={24} xl={7}><Text>模型偏好</Text><Select style={{ width: '100%' }} value={modelPreference} onChange={setModelPreference} options={[{ label: '自动（千问失败切DeepSeek）', value: 'auto' }, { label: '千问优先（失败切DeepSeek）', value: 'qwen' }, { label: 'DeepSeek优先（失败切千问）', value: 'deepseek' }, { label: '规则兜底', value: 'rule' }]} /></Col>
                </Row>
                <div style={{ marginTop: 12 }}>
                  <Text>事件摘要</Text>
                  <TextArea rows={3} value={eventSummary} onChange={(e) => setEventSummary(e.target.value)} placeholder="请输入任务事件摘要，例如：血压危急，需立即干预" />
                </div>
                <Space style={{ marginTop: 12 }} wrap>
                  {demoScenarios.map((s) => <Button key={s.label} onClick={() => { setEventSummary(s.value); setRiskLevel(s.risk); setModule(s.module) }}>场景：{s.label}</Button>)}
                </Space>
              </Card>

              <Card title="Agent 操作" style={{ borderRadius: 16, marginTop: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Button type="primary" loading={loading} onClick={createRuntimeTask}>启动任务</Button>
                    <Button loading={loading} disabled={!runtimeTaskId || (taskStatus !== 'pending_approval' && taskStatus !== 'planning' && taskStatus !== 'queued')} onClick={approveAndExecute}>批准执行</Button>
                    <Button danger loading={loading} disabled={!runtimeTaskId || (taskStatus !== 'pending_approval' && taskStatus !== 'planning' && taskStatus !== 'queued')} onClick={rejectTask}>驳回任务</Button>
                    <Button loading={loading} onClick={retryFailed}>重试执行</Button>
                    <Button danger onClick={handoffToHuman}>人工接管</Button>
                    <Button loading={loading} onClick={runWeeklyUpdate}>更新策略</Button>
                    <Button onClick={exportDemoJson}>导出运行报告</Button>
                  </Space>
                  <Card size="small" style={{ marginTop: 8, borderRadius: 12, background: '#fafcff' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="processing">模型规划</Tag>
                        <Tag color={plan?.cache?.hit ? 'success' : 'blue'}>{plan?.cache?.hit ? '缓存命中' : '实时生成'}</Tag>
                        <Tag color={modelPreference === 'deepseek' ? 'purple' : modelPreference === 'auto' ? 'cyan' : 'geekblue'}>当前偏好：{modelPreference === 'auto' ? '自动双模型' : modelPreference === 'qwen' ? '千问优先' : modelPreference === 'deepseek' ? 'DeepSeek优先' : '规则兜底'}</Tag>
                      </Space>
                      <Text strong>运行台大模型规划结果</Text>
                      <Text type="secondary">{plan?.planner?.summary || '尚未生成规划，请先启动任务'}</Text>
                    </Space>
                  </Card>
                </Space>
              </Card>

              <Card title="运行事件流（Runtime Events）" style={{ borderRadius: 16, marginTop: 12 }}>
                {(runtimeEvents || []).length ? <Timeline items={runtimeEvents.slice(-20).map((evt: any) => ({ color: evt.type?.includes('FAILED') ? 'red' : evt.type?.includes('DONE') ? 'green' : 'blue', children: <div><b>{evt.type}</b>｜{evt.message}<div><Text type="secondary">{evt.at}</Text></div></div> }))} /> : <Text type="secondary">暂无运行事件</Text>}
              </Card>

              <Row gutter={16}>
                <Col span={6}><Card><Statistic title="缓存命中" value={plan?.cache?.hit ? '是' : '否'} /></Card></Col>
                <Col span={6}><Card><Statistic title="规划工具数" value={(plan?.planner?.toolCalls || plan?.plan?.toolCalls || []).length || 0} /></Card></Col>
                <Col span={6}><Card><Statistic title="执行成功数" value={(toolExecutions || []).filter((x: any) => x?.success).length || 0} /></Card></Col>
                <Col span={6}><Card><Statistic title="执行失败数" value={(toolExecutions || []).filter((x: any) => !x?.success).length || 0} /></Card></Col>
              </Row>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={5}>
          <Card title="记忆与治理" style={{ borderRadius: 18, height: '100%' }}>
            <List dataSource={memoryFacts} renderItem={(item) => <List.Item>{item}</List.Item>} />
            <Divider style={{ margin: '12px 0' }} />
            <Space>
              <Text>自动驾驶</Text>
              <Switch checked={autoPilot} onChange={setAutoPilot} checkedChildren="开" unCheckedChildren="关" />
            </Space>
            <div style={{ marginTop: 10 }}>
              <Text>最大重试次数：</Text>
              <Select style={{ width: 90, marginLeft: 8 }} value={maxRetries} onChange={setMaxRetries} options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]} />
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <List
              size="small"
              dataSource={[
                'Planner Agent：负责任务拆解与计划生成',
                'Executor Agent：负责工具调用与执行回写',
                'Reviewer Agent：负责结果追踪与复盘'
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16, alignItems: 'stretch' }}>
        <Col span={12}>
          <Card title="规划结果（规划层）" style={{ marginBottom: 16, borderRadius: 16, minHeight: 260, height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={plan?.cache?.hit ? 'success' : 'blue'}>{plan?.cache?.hit ? '缓存命中' : '实时规划'}</Tag>
                <Tag color={taskStatus === 'failed' ? 'error' : taskStatus === 'pending_approval' ? 'warning' : 'processing'}>{statusMeta[taskStatus].text}</Tag>
                {lastTraceId ? <Tag color="cyan">traceId: {lastTraceId}</Tag> : null}
              </Space>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="计划摘要">{plan?.planner?.summary || plan?.summary || '-'}</Descriptions.Item>
                <Descriptions.Item label="阶段计划">{(plan?.planner?.timeline || []).map((t: any) => `${t.window}: ${(t.actions || []).join('；')}`).join(' ｜ ') || '-'}</Descriptions.Item>
                <Descriptions.Item label="工具建议">{(plan?.planner?.toolCalls || plan?.plan?.toolCalls || []).length ? (plan?.planner?.toolCalls || plan?.plan?.toolCalls || []).map((t: any) => t.tool).join('、') : '暂无工具建议'}</Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="运行阶段摘要" style={{ marginBottom: 16, borderRadius: 16, minHeight: 260, height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="blue">感知</Tag>
                <Tag color="gold">规划</Tag>
                <Tag color="green">行动</Tag>
                <Tag color="purple">记忆</Tag>
              </Space>
              <Timeline
                items={[
                  { color: 'blue', children: '感知层：输入任务、选择老人、设置策略' },
                  { color: 'gold', children: '规划层：Agent 生成计划并等待审批' },
                  { color: 'green', children: '行动层：审批后调用工具执行闭环' },
                  { color: 'purple', children: '记忆层：回写结果并更新策略' }
                ]}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16, alignItems: 'stretch' }}>
        <Col span={12}>
          <Card title="结果回写与策略更新" style={{ borderRadius: 16, minHeight: 180, height: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="记录ID">{outcomeRes?.id || '-'}</Descriptions.Item>
              <Descriptions.Item label="服务类型">{outcomeRes?.serviceType || '-'}</Descriptions.Item>
              <Descriptions.Item label="时间">{outcomeRes?.createdAt ? new Date(outcomeRes.createdAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="样本量">{policyRes?.sampleSize || '-'}</Descriptions.Item>
              <Descriptions.Item label="超时率">{policyRes?.overdueRate ?? '-'}%</Descriptions.Item>
              <Descriptions.Item label="复发率">{policyRes?.relapseRate ?? '-'}%</Descriptions.Item>
              <Descriptions.Item label="满意度">{policyRes?.avgSatisfaction ?? '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="执行失败项（高亮）" style={{ borderRadius: 16, minHeight: 180, height: '100%' }}>
            {failedExecutions.length === 0 ? <Text type="secondary">当前无失败项</Text> : failedExecutions.map((item: any, idx: number) => <Alert key={idx} type="error" showIcon style={{ marginBottom: 8 }} message={`工具：${item.tool || 'unknown'}`} description={item.error || '执行失败'} />)}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="工具执行日志（可展开）" style={{ marginBottom: 16, borderRadius: 16, minHeight: 220 }}>
            {(toolExecutions || []).length === 0 ? <Text type="secondary">暂无工具执行记录，请先审批并执行任务</Text> : <Collapse items={toolExecutions.map((item: any, idx: number) => ({ key: String(idx + 1), label: `${item?.tool || 'unknown'} ｜ ${item?.success ? '成功' : '失败'}`, children: (<div><div><b>状态：</b>{item?.success ? '成功' : '失败'}</div><div><b>结果：</b><pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{JSON.stringify(item?.result || {}, null, 2)}</pre></div>{!item?.success ? <Alert type="error" showIcon message="执行失败" description={item?.error || '未知错误'} /> : null}</div>) }))} />}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AgentVNext
