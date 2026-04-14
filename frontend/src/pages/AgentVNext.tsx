import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Select, Input, Button, Space, Typography, Alert, Descriptions, message } from 'antd'
import axios from '../utils/axiosInstance'

const { TextArea } = Input
const { Title, Text } = Typography

const AgentVNext: React.FC = () => {
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

  useEffect(() => {
    const loadElders = async () => {
      try {
        const res = await axios.get('/elderly', { params: { page: 1, limit: 200 } })
        const list = res.data?.data || []
        const options = list.map((item: any) => ({
          label: `${item.name}（ID:${item.id}，${item.age || '-'}岁）`,
          value: item.id
        }))
        setElderlyOptions(options)
        if (!elderlyId && options.length) {
          setElderlyId(options[0].value)
        }
      } catch {
        message.warning('老人列表加载失败，请先检查老人数据')
      }
    }

    loadElders()
  }, [])

  const payload = useMemo(() => ({
    elderlyId,
    strategyMode,
    module,
    riskLevel,
    eventSummary
  }), [elderlyId, strategyMode, module, riskLevel, eventSummary])

  const runPlan = async () => {
    if (!elderlyId) {
      message.warning('请先选择老人')
      return
    }

    const timeoutMs = 25000
    const timeoutTimer = setTimeout(() => {
      message.warning('规划耗时较长，系统仍在尝试，请稍候...')
    }, 10000)

    setLoading(true)
    try {
      const res = await axios.post('/agent-vnext/plan', payload, { suppressGlobalError: true, timeout: timeoutMs } as any)
      setPlan(res.data?.data || null)
      message.success('规划器已生成计划')
    } catch (error: any) {
      const status = error?.response?.status
      const backendError = error?.response?.data?.error
      const timeout = error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')
      if (timeout) {
        message.error('规划超时：AI推理较慢或后端繁忙，请重试（建议先点“演示模式一键运行”后再规划）')
      } else {
        message.error(`规划失败${status ? `(${status})` : ''}：${backendError || error?.message || '未知错误'}`)
      }
    } finally {
      clearTimeout(timeoutTimer)
      setLoading(false)
    }
  }

  const runAutonomous = async () => {
    if (!elderlyId) {
      message.warning('请先选择老人')
      return
    }

    const timeoutMs = 25000
    const timeoutTimer = setTimeout(() => {
      message.warning('自主执行耗时较长，系统仍在尝试，请稍候...')
    }, 10000)

    setLoading(true)
    try {
      const res = await axios.post('/agent-vnext/autonomous', { ...payload, autoExecute: true }, { suppressGlobalError: true, timeout: timeoutMs } as any)
      setAutonomous(res.data?.data || null)
      message.success('自主决策已执行')
    } catch (error: any) {
      const status = error?.response?.status
      const backendError = error?.response?.data?.error
      const timeout = error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')

      if (timeout) {
        message.error('自主执行超时：AI推理或工具执行较慢，请重试')
      } else if (status === 403) {
        message.error('自主执行失败(403)：当前账号无权限，请使用管理员/经理账号')
      } else if (status === 401) {
        message.error('自主执行失败(401)：登录已过期，请重新登录')
      } else {
        message.error(`自主执行失败${status ? `(${status})` : ''}：${backendError || error?.message || '未知错误'}`)
      }
    } finally {
      clearTimeout(timeoutTimer)
      setLoading(false)
    }
  }

  const submitOutcome = async () => {
    if (!elderlyId) {
      message.warning('请先选择老人')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post('/agent-vnext/outcome', {
        elderlyId,
        strategyMode,
        isOverdue: false,
        isRelapse: false,
        familySatisfaction: 4,
        followUpResult: '生命体征趋于稳定，家属已知情'
      })
      setOutcomeRes(res.data?.data || null)
      message.success('结果追踪已记录')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '记录失败')
    } finally {
      setLoading(false)
    }
  }

  const runWeeklyUpdate = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/agent-vnext/policy/weekly-update')
      setPolicyRes(res.data?.data || null)
      message.success('每周策略更新完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '策略更新失败（需管理员权限）')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={2}>智能体VNext（可答辩交付面板）</Title>
      <Alert showIcon type="info" message="流程：上下文感知 → 任务规划 → 工具执行 → 结果追踪 → 每周策略更新" style={{ marginBottom: 16 }} />

      <Card title="输入参数" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={7}>
            <Text>选择老人</Text>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="请选择老人"
              style={{ width: '100%' }}
              value={elderlyId}
              onChange={(v) => setElderlyId(v)}
              options={elderlyOptions}
            />
          </Col>
          <Col span={5}><Text>策略模式</Text><Select style={{ width: '100%' }} value={strategyMode} onChange={setStrategyMode} options={[{ label: '保守', value: 'conservative' }, { label: '平衡', value: 'balanced' }, { label: '灵敏', value: 'aggressive' }]} /></Col>
          <Col span={5}><Text>模块</Text><Select style={{ width: '100%' }} value={module} onChange={setModule} options={[{ label: '护理', value: '护理' }, { label: '医护', value: '医护' }, { label: '后勤', value: '后勤' }, { label: '收费', value: '收费' }, { label: '接待', value: '接待' }]} /></Col>
          <Col span={4}><Text>风险级别</Text><Select style={{ width: '100%' }} value={riskLevel} onChange={setRiskLevel} options={[{ label: '低', value: 'low' }, { label: '中', value: 'medium' }, { label: '高', value: 'high' }]} /></Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <Text>事件摘要</Text>
          <TextArea rows={2} value={eventSummary} onChange={(e) => setEventSummary(e.target.value)} />
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button loading={loading} onClick={runPlan}>1) 生成计划</Button>
          <Button type="primary" loading={loading} onClick={runAutonomous}>2) 自主执行</Button>
          <Button loading={loading} onClick={submitOutcome}>3) 记录结果</Button>
          <Button danger loading={loading} onClick={runWeeklyUpdate}>4) 每周策略更新</Button>
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="规划结果（完整计划）" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="诊断结论">
                {plan?.decision?.triage?.reason || plan?.planner?.summary || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                {plan?.decision?.triage?.riskLevel || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="首要动作">
                {(plan?.decision?.triage?.actions || [])[0] || '10分钟内电话确认老人状态'}
              </Descriptions.Item>
              <Descriptions.Item label="责任角色">
                {plan?.decision?.dispatch?.assigneeRole || '当前班次值班人员'}
              </Descriptions.Item>
              <Descriptions.Item label="目标时限(SLA)">
                {plan?.decision?.dispatch?.slaMinutes ? `${plan.decision.dispatch.slaMinutes} 分钟` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="策略模式">{plan?.strategyMode || '-'}</Descriptions.Item>
              <Descriptions.Item label="可用人员数">{plan?.context?.availableProviders?.length || 0}</Descriptions.Item>
              <Descriptions.Item label="可用人员前3">
                {(plan?.context?.availableProviders || []).slice(0, 3).map((p: any) => `${p.name}/${p.type}`).join('；') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="阶段计划">
                {(plan?.planner?.timeline || []).map((t: any) => `${t.window}: ${((t.actions || []).join('；'))}`).join(' ｜ ') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="参考案例命中数">
                {Number(plan?.references?.warnings?.length || 0) + Number(plan?.references?.serviceRequests?.length || 0) + Number(plan?.references?.serviceRecords?.length || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="执行清单">
                {(plan?.planner?.toolCalls || plan?.plan?.toolCalls || []).length
                  ? (plan?.planner?.toolCalls || plan?.plan?.toolCalls || []).map((c: any, idx: number) => {
                      const text = c?.tool === 'create_dispatch'
                        ? `创建派单：${c?.args?.requestType || 'AI计划派单'}（优先级：${c?.args?.priority || '-'}）`
                        : c?.tool === 'notify_family'
                          ? `通知家属：${c?.args?.title || '家属沟通提醒'}`
                          : c?.tool === 'append_timeline'
                            ? `写入时间线：${c?.args?.note || '追加处置记录'}`
                            : `执行工具：${c?.tool || 'unknown'}`
                      return <div key={idx}>- {text}</div>
                    })
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="自主执行结果" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="已执行">{autonomous?.executed ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="执行结果">{JSON.stringify(autonomous?.execution || [])}</Descriptions.Item>
              <Descriptions.Item label="ReAct执行轨迹">
                {(autonomous?.executionTrace || []).map((s: any) => `步骤${s.step}｜思考:${s.thought}｜动作:${s.action}｜观察:${s.observation}`).join(' \n ') || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="结果追踪">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="记录ID">{outcomeRes?.id || '-'}</Descriptions.Item>
              <Descriptions.Item label="服务类型">{outcomeRes?.serviceType || '-'}</Descriptions.Item>
              <Descriptions.Item label="时间">{outcomeRes?.createdAt ? new Date(outcomeRes.createdAt).toLocaleString() : '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="每周策略更新">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="样本量">{policyRes?.sampleSize || '-'}</Descriptions.Item>
              <Descriptions.Item label="超时率">{policyRes?.overdueRate ?? '-'}%</Descriptions.Item>
              <Descriptions.Item label="复发率">{policyRes?.relapseRate ?? '-'}%</Descriptions.Item>
              <Descriptions.Item label="满意度">{policyRes?.avgSatisfaction ?? '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AgentVNext
