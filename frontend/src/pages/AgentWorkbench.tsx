import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  message,
  Select,
  Drawer,
  Timeline,
  Typography,
  Alert,
  Descriptions,
  Tooltip,
  Divider,
  InputNumber
} from 'antd'
import axios from '../utils/axiosInstance'
import './AgentWorkbench.css'

const { Text, Title } = Typography

const AgentWorkbench: React.FC = () => {
  const [overview, setOverview] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined)
  const [quality, setQuality] = useState<any>(null)
  const [qualityDays, setQualityDays] = useState<number>(7)
  const [demoRunning, setDemoRunning] = useState(false)
  const [aiDecision, setAiDecision] = useState<any>(null)

  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [selectedElderlyName, setSelectedElderlyName] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [proactiveLoading, setProactiveLoading] = useState(false)
  const [proactiveForm, setProactiveForm] = useState({
    doorHours: 12,
    waterHours: 24,
    mattressHeartRate: 110,
    mattressTurnOver: 12,
    serviceGapDays: 3,
    selectedSensor: 'door_contact' as 'door_contact' | 'water_meter' | 'mattress' | 'service_gap'
  })

  const fetchData = useCallback(async (moduleValue?: string, daysValue?: number) => {
    setLoading(true)
    try {
      const currentDays = daysValue || qualityDays
      const [overviewRes, tasksRes, qualityRes] = await Promise.all([
        axios.get('/agent/overview'),
        axios.get('/agent/tasks', { params: { module: moduleValue || undefined } }),
        axios.get('/agent/quality-metrics', { params: { days: currentDays } })
      ])

      setOverview(overviewRes.data?.data || null)
      setTasks(tasksRes.data?.data || [])
      setQuality(qualityRes.data?.data || null)
    } catch (error) {
      message.error('加载总控工作台数据失败')
    } finally {
      setLoading(false)
    }
  }, [qualityDays])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resolveWarning = async (record: any) => {
    if (record.sourceType !== 'warning') return
    try {
      await axios.post(`/agent/warnings/${record.sourceId}/resolve`)
      message.success('预警已快速处理')
      fetchData(moduleFilter)
    } catch (error) {
      message.error('处理失败')
    }
  }

  const createDispatch = async (record: any) => {
    try {
      await axios.post('/agent/dispatch', {
        elderlyId: record.elderlyId,
        requestType: '紧急关怀',
        priority: record.priority === 'high' ? 'high' : 'medium',
        description: `由Agent工作台派单：${record.title}`,
        requiredSkills: '护理,紧急响应'
      })
      message.success('已创建派单任务')
      fetchData(moduleFilter)
    } catch (error) {
      message.error('派单失败')
    }
  }

  const showTimeline = async (record: any) => {
    if (!record.elderlyId) {
      message.warning('该任务未关联老人')
      return
    }

    setTimelineOpen(true)
    setTimelineLoading(true)
    setSelectedElderlyName(record.elderlyName || '老人')

    try {
      const res = await axios.get(`/agent/family-timeline/${record.elderlyId}`)
      setTimelineData(res.data?.data || [])
    } catch (error) {
      message.error('加载家属时间线失败')
    } finally {
      setTimelineLoading(false)
    }
  }

  const generateAIDecision = async (record: any) => {
    if (!record.elderlyId) {
      message.warning('该任务未关联老人，无法生成AI方案')
      return
    }

    setAiLoading(true)
    try {
      const payload = {
        triageInput: {
          elderlyName: record.elderlyName || '未知老人',
          age: 75,
          metrics: {
            priority: record.priority,
            module: record.module,
            latestTask: record.title
          },
          historySummary: record.description
        },
        dispatchInput: {
          riskLevel: record.priority,
          module: record.module,
          shift: '白班',
          availableRoles: ['白班值班医生', '白班护理员', '白班后勤专员'],
          eventSummary: `${record.title} - ${record.description}`
        },
        copilotQuestion: '请给出下一步最优先的3个动作与对家属沟通要点',
        context: {
          overview,
          quality
        }
      }

      const response = await axios.post('/ai-agent/full-decision', payload)
      setAiDecision(response.data?.data || null)
      message.success('AI方案生成成功')
    } catch (error: any) {
      const backendError = error?.response?.data?.error
      const status = error?.response?.status

      // 网络/接口异常时前端兜底，确保演示不断流
      setAiDecision({
        triage: {
          riskLevel: record.priority || 'medium',
          reason: 'AI服务暂不可用，已使用本地兜底策略生成建议',
          actions: ['10分钟内电话确认老人状态', '30分钟内安排随访', '同步家属当前处置进展']
        },
        dispatch: {
          assigneeRole: record.module === '医护' ? '当前班次值班医生' : '当前班次护理员',
          slaMinutes: record.priority === 'high' ? 20 : 60
        },
        copilot: {
          summary: '建议先处理高优先级预警，再处理超时任务。',
          communication: '已启动应急跟进，请家属保持电话畅通。'
        }
      })

      if (status === 404) {
        message.warning('AI接口未就绪，已使用本地兜底方案（请重启后端）')
      } else if (status === 401) {
        message.warning('登录状态失效，已使用本地兜底方案')
      } else {
        message.warning(backendError || 'AI服务暂不可用，已切换本地兜底方案')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const triggerProactiveSensor = async (sensorType: string, payload: Record<string, any>) => {
    if (!payload.elderlyId) return message.warning('该项未关联老人')
    setProactiveLoading(true)
    try {
      const res = await axios.post('/health/proactive/sensor', {
        elderlyId: payload.elderlyId,
        sensorType,
        ...payload
      })
      message.success(res.data?.message || '已触发主动感知预警')
      fetchData(moduleFilter)
    } catch (error: any) {
      message.error(error?.response?.data?.error || '触发主动感知失败')
    } finally {
      setProactiveLoading(false)
    }
  }

  const triggerSelectedProactive = async () => {
    const target = tasks?.[0]?.elderlyId
    if (!target) return message.warning('请先确保列表中存在关联老人，或先创建一条任务')

    const selected = proactiveForm.selectedSensor
    if (selected === 'door_contact') {
      return triggerProactiveSensor('door_contact', { elderlyId: target, value: proactiveForm.doorHours, meta: { inactiveHours: proactiveForm.doorHours } })
    }
    if (selected === 'water_meter') {
      return triggerProactiveSensor('water_meter', { elderlyId: target, value: 0, value2: proactiveForm.waterHours, meta: { noWaterHours: proactiveForm.waterHours } })
    }
    if (selected === 'mattress') {
      return triggerProactiveSensor('mattress', { elderlyId: target, value: proactiveForm.mattressHeartRate, value2: proactiveForm.mattressTurnOver, meta: { heartRate: proactiveForm.mattressHeartRate, turnOver: proactiveForm.mattressTurnOver } })
    }
    return triggerProactiveSensor('service_gap', { elderlyId: target, value: proactiveForm.serviceGapDays, meta: { gapDays: proactiveForm.serviceGapDays } })
  }

  const tableData = useMemo(() => (tasks || []).map((t: any, i: number) => ({
    ...t,
    __rowKey: t.id || `${t.sourceType || 'task'}-${t.sourceId || 'na'}-${i}`
  })), [tasks])

  const columns = useMemo(() => [
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      render: (v: string) => <Tag className="module-tag" color="blue">{v}</Tag>
    },
    { 
      title: '类型', 
      dataIndex: 'sourceType', 
      key: 'sourceType', 
      render: (v: string) => <Tag className="type-tag">{v}</Tag> 
    },
    { 
      title: '老人', 
      dataIndex: 'elderlyName', 
      key: 'elderlyName', 
      render: (v: string) => <Text className="elderly-name">{v || '-'}</Text> 
    },
    { 
      title: '标题', 
      dataIndex: 'title', 
      key: 'title',
      render: (v: string) => <Text className="task-title" ellipsis>{v}</Text> 
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description', 
      ellipsis: true,
      render: (v: string) => <Text className="task-description" ellipsis>{v}</Text> 
    },
    {
      title: '优先级', 
      dataIndex: 'priority', 
      key: 'priority', 
      render: (v: string) => {
        const color = v === 'high' ? 'red' : v === 'medium' ? 'orange' : 'green'
        return <Tag className="priority-tag" color={color}>{v}</Tag>
      }
    },
    {
      title: 'SLA',
      key: 'sla',
      render: (_: any, record: any) => {
        const color = record.slaStatus === 'overdue' ? 'red' : record.slaStatus === 'warning' ? 'orange' : 'green'
        return <Tag className="sla-tag" color={color}>{`${record.elapsedMinutes}/${record.slaMinutes}分钟`}</Tag>
      }
    },
    { 
      title: '建议动作', 
      dataIndex: 'suggestedAction', 
      key: 'suggestedAction',
      render: (v: string) => <Text className="suggested-action" ellipsis>{v}</Text> 
    },
    {
      title: '操作', 
      key: 'action', 
      render: (_: any, record: any) => (
        <Space size="small">
          {record.sourceType === 'warning' && <Button size="small" className="action-button" onClick={() => resolveWarning(record)}>快速处置</Button>}
          <Button size="small" type="primary" className="action-button primary" onClick={() => createDispatch(record)}>一键派单</Button>
          <Button size="small" className="action-button" onClick={() => showTimeline(record)}>家属时间线</Button>
          <Button size="small" loading={aiLoading} className="action-button ai" onClick={() => generateAIDecision(record)}>AI生成方案</Button>
        </Space>
      )
    }
  ], [aiLoading])

  return (
    <div className="agent-workbench">
      <Title level={4} className="page-title">社区养老 Agent 指挥中心</Title>
      
      <Row gutter={[24, 24]} className="overview-section">
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="stat-card warning-card">
            <Statistic 
              title="待处理预警" 
              value={overview?.pendingWarnings || 0} 
              prefix={<span className="stat-icon warning"></span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="stat-card processing-card">
            <Statistic 
              title="处理中预警" 
              value={overview?.processingWarnings || 0} 
              prefix={<span className="stat-icon processing"></span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="stat-card urgent-card">
            <Statistic 
              title="紧急通知" 
              value={overview?.urgentNotifications || 0} 
              prefix={<span className="stat-icon urgent"></span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="stat-card service-card">
            <Statistic 
              title="待分派服务" 
              value={overview?.pendingServiceRequests || 0} 
              prefix={<span className="stat-icon service"></span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card className="stat-card overdue-card">
            <Statistic 
              title="SLA超时" 
              value={overview?.overdueCount || 0} 
              valueStyle={{ color: '#cf1322' }}
              prefix={<span className="stat-icon overdue"></span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="quality-filter-section">
        <Col span={24}>
          <Space size="middle">
            <Text type="secondary">质量看板口径：</Text>
            <Select
              style={{ width: 160 }}
              value={qualityDays}
              onChange={(v) => {
                setQualityDays(v)
                fetchData(moduleFilter, v)
              }}
              options={[
                { label: '最近1天', value: 1 },
                { label: '最近7天', value: 7 },
                { label: '最近30天', value: 30 }
              ]}
              className="quality-select"
            />
            <Text type="secondary">{quality?.metricScope || ''}</Text>
          </Space>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="quality-section">
        <Col xs={24} sm={12} md={6}>
          <Card className="quality-card">
            <Statistic
              title="预警闭环率"
              suffix="%"
              value={quality?.closureRate || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="quality-card">
            <Statistic
              title="平均处置时长"
              suffix="分钟"
              value={quality?.avgWarningHandleMinutes || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="quality-card">
            <Statistic
              title="服务完成率"
              suffix="%"
              value={quality?.serviceCompletionRate || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="quality-card">
            <Statistic
              title="任务超时率"
              suffix="%"
              value={quality?.overdueRate || 0}
              valueStyle={{ color: quality?.overdueRate > 40 ? '#cf1322' : '#389e0d' }}
            />
            <div style={{ marginTop: 6 }}>
              <Tooltip title="超时=当前未关闭且超出SLA时限；统计窗口为上方所选最近N天。">
                <Text type="secondary" className="quality-hint">
                  口径：超时任务/时间窗口任务总数（{quality?.overdueCount || 0}/{quality?.totalWindowTasks || 0}）
                </Text>
              </Tooltip>
            </div>
          </Card>
        </Col>
      </Row>

      {aiDecision && (
        <Card className="ai-decision-card">
          <div className="ai-decision-header">
            <div className="ai-decision-title">
              <span className="ai-icon">🤖</span>
              <Text strong>AI Agent 决策结果</Text>
            </div>
            <Tag className="ai-source-tag">
              {aiDecision?.triage?._meta?.source || aiDecision?.dispatch?._meta?.source || aiDecision?.copilot?._meta?.source || 'local-fallback'}
            </Tag>
          </div>
          
          <Divider className="ai-decision-divider" />
          
          <Descriptions size="small" column={1} className="ai-decision-descriptions">
            <Descriptions.Item label="AI分诊等级">{aiDecision?.triage?.riskLevel || '-'}</Descriptions.Item>
            <Descriptions.Item label="分诊理由">{aiDecision?.triage?.reason || '-'}</Descriptions.Item>
            <Descriptions.Item label="派单角色">{aiDecision?.dispatch?.assigneeRole || '-'}</Descriptions.Item>
            <Descriptions.Item label="建议SLA(分钟)">{aiDecision?.dispatch?.slaMinutes || '-'}</Descriptions.Item>
            <Descriptions.Item label="运营副驾总结">{aiDecision?.copilot?.summary || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16 }}>
            <Alert
              type="info"
              showIcon
              message={`AI建议动作：${(aiDecision?.triage?.actions || []).join('；') || '无'}`}
              description={`沟通建议：${aiDecision?.copilot?.communication || '无'}`}
              className="ai-suggestion-alert"
            />
          </div>
        </Card>
      )}

      <Card className="tasks-card">
        <div className="tasks-header">
          <Text strong className="tasks-title">机构养老总控 Agent 工作台</Text>
          <Space size="middle" wrap>
            <Select
              style={{ width: 140 }}
              value={proactiveForm.selectedSensor}
              onChange={(value) => setProactiveForm((prev) => ({ ...prev, selectedSensor: value }))}
              options={[
                { label: '门磁', value: 'door_contact' },
                { label: '水表', value: 'water_meter' },
                { label: '床垫', value: 'mattress' },
                { label: '服务空窗', value: 'service_gap' }
              ]}
            />
            <InputNumber style={{ width: 90 }} value={proactiveForm.doorHours} min={1} max={72} onChange={(v) => setProactiveForm((prev) => ({ ...prev, doorHours: Number(v || 0) }))} addonBefore="未开门(h)" />
            <InputNumber style={{ width: 100 }} value={proactiveForm.waterHours} min={1} max={72} onChange={(v) => setProactiveForm((prev) => ({ ...prev, waterHours: Number(v || 0) }))} addonBefore="无用水(h)" />
            <InputNumber style={{ width: 110 }} value={proactiveForm.mattressHeartRate} min={40} max={180} onChange={(v) => setProactiveForm((prev) => ({ ...prev, mattressHeartRate: Number(v || 0) }))} addonBefore="床垫心率" />
            <InputNumber style={{ width: 110 }} value={proactiveForm.mattressTurnOver} min={0} max={60} onChange={(v) => setProactiveForm((prev) => ({ ...prev, mattressTurnOver: Number(v || 0) }))} addonBefore="翻身次" />
            <InputNumber style={{ width: 110 }} value={proactiveForm.serviceGapDays} min={1} max={30} onChange={(v) => setProactiveForm((prev) => ({ ...prev, serviceGapDays: Number(v || 0) }))} addonBefore="空窗天" />
            <Button loading={proactiveLoading} type="primary" onClick={triggerSelectedProactive}>触发主动感知预警</Button>
            <Select
              allowClear
              placeholder="筛选模块"
              style={{ width: 160 }}
              value={moduleFilter}
              onChange={(v) => {
                setModuleFilter(v)
                fetchData(v)
              }}
              options={[
                { label: '护理', value: '护理' },
                { label: '医护', value: '医护' },
                { label: '后勤', value: '后勤' },
                { label: '收费', value: '收费' },
                { label: '接待', value: '接待' }
              ]}
              className="module-select"
            />
            <Button className="refresh-button" onClick={() => fetchData(moduleFilter)}>刷新</Button>
            <Button danger className="escalate-button" onClick={async () => {
              try {
                const res = await axios.post('/agent/escalate-overdue', { limit: 20 })
                message.success(`${res.data?.data?.escalatedCount || 0} 条任务已升级`) 
                fetchData(moduleFilter)
              } catch (error) {
                message.error('超时升级失败')
              }
            }}>执行超时升级</Button>
            <Button type="primary" loading={demoRunning} className="demo-button" onClick={async () => {
              try {
                setDemoRunning(true)
                // 演示老人轮换：避免每次都命中同一个老人
                const elderlyRes = await axios.get('/elderly', { params: { page: 1, limit: 200 } })
                const list = elderlyRes.data?.data || elderlyRes.data?.elderly || []

                if (!list.length) {
                  message.warning('暂无老人数据，请先执行种子数据导入（npm run seed:china）')
                  return
                }

                const key = 'demoElderlyCursor'
                const currentCursor = Number(localStorage.getItem(key) || 0)
                const nextCursor = (currentCursor + 1) % list.length
                localStorage.setItem(key, String(nextCursor))
                const targetElderlyId = list[nextCursor]?.id

                const res = await axios.post('/ai-agent/demo/run', { elderlyId: targetElderlyId, rotate: true })
                setAiDecision(res.data?.data?.decision || null)
                const reused = res.data?.data?.reusedDispatch
                const selectedName = res.data?.data?.selectedElderly?.name || '未知老人'
                message.success(reused ? `演示已运行：复用 ${selectedName} 的已有任务` : `演示已运行：已为 ${selectedName} 创建新任务`)
                fetchData(moduleFilter)
              } catch (error: any) {
                const status = error?.response?.status
                const backendMsg = error?.response?.data?.error
                if (status === 404) {
                  message.error('演示接口不存在，请重启后端并确认 /api/ai-agent/demo/run 已加载')
                } else {
                  message.error(backendMsg || '演示模式执行失败')
                }
              } finally {
                setDemoRunning(false)
              }
            }}>演示模式一键运行</Button>
          </Space>
        </div>
        
        <Table 
          rowKey="__rowKey" 
          loading={loading} 
          dataSource={tableData} 
          columns={columns} 
          className="tasks-table"
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 条任务`,
            className: "table-pagination"
          }}
        />
      </Card>

      <Drawer
        title={`家属可见时间线 - ${selectedElderlyName}`}
        open={timelineOpen}
        width={520}
        onClose={() => setTimelineOpen(false)}
        className="timeline-drawer"
        placement="right"
      >
        {timelineLoading ? (
          <div className="timeline-loading">
            <Text>加载中...</Text>
          </div>
        ) : (
          <Timeline
            items={(timelineData || []).map((item: any) => ({
              color: item.type === '预警' ? 'red' : item.type === '服务' ? 'blue' : 'green',
              children: (
                <div className="timeline-item">
                  <Text strong className="timeline-item-title">{item.title}</Text>
                  <div className="timeline-item-time"><Text type="secondary">{new Date(item.time).toLocaleString()}</Text></div>
                  <div className="timeline-item-detail">{item.detail}</div>
                </div>
              )
            }))}
            className="timeline"
          />
        )}
      </Drawer>
    </div>
  )
}

export default AgentWorkbench
