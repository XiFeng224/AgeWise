import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, message, Space, Progress, Empty, Divider } from 'antd'
import axios from '../utils/axiosInstance'

const { Title, Text } = Typography

const AgentCommandCenter: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({})

  const riskHeat = useMemo(() => (data?.riskHeat || []).slice().sort((a: any, b: any) => (b.eventScore || 0) - (a.eventScore || 0)), [data])
  const moduleStats = useMemo(() => data?.moduleStats || [], [data])

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/agent/command-center')
      const data = res.data?.data || null
      // 为riskHeat数组中的每个记录添加唯一ID
      if (data?.riskHeat) {
        data.riskHeat = data.riskHeat.map((item: any, index: number) => ({
          ...item,
          id: `risk-${index}-${Date.now()}`
        }))
      }

      const stats = {
        qn: 0,
        query: 0,
        warning: 0,
        manual: 0
      }
      ;(data?.riskHeat || []).forEach((item: any) => {
        const source = String(item?.source || item?.origin || '手动创建')
        if (source.includes('模型') || source.includes('路由') || source.includes('q')) stats.qn += 1
        else if (source.includes('问答')) stats.query += 1
        else if (source.includes('预警')) stats.warning += 1
        else stats.manual += 1
      })
      setSourceStats({
        问答升级: stats.query,
        风险预警: stats.warning,
        手动创建: stats.manual,
        模型路由: stats.qn
      })
      setData(data)
    } catch (error) {
      message.error('加载指挥中心数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [])

  const progress = Math.min(100, Math.max(0, Number(data?.quality?.closureRate || 0)))

  return (
    <div>
      <Card style={{ marginBottom: 16, borderRadius: 18, background: 'linear-gradient(135deg, #4b5563 0%, #7a8594 100%)', color: '#fff', border: 'none' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={3} style={{ color: '#fff', marginBottom: 0 }}>Agent 平台指挥中心</Title>
          <Text style={{ color: 'rgba(255,255,255,0.88)' }}>任务编排、风险调度、闭环治理的总控面板</Text>
          <Progress percent={progress} strokeColor="#ffffff" trailColor="rgba(255,255,255,0.24)" />
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card style={{ borderRadius: 16 }}><Statistic title="待处理总量" value={data?.overview?.totalToHandle || 0} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card style={{ borderRadius: 16 }}><Statistic title="SLA超时" value={data?.overview?.overdueCount || 0} valueStyle={{ color: '#9f4e4e' }} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card style={{ borderRadius: 16 }}><Statistic title="预警闭环率" value={data?.quality?.closureRate || 0} suffix="%" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card style={{ borderRadius: 16 }}><Statistic title="服务完成率" value={data?.quality?.serviceCompletionRate || 0} suffix="%" /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(sourceStats).length ? Object.entries(sourceStats).map(([label, value]) => (
          <Col xs={24} sm={12} xl={6} key={label}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic title={label} value={value} />
            </Card>
          </Col>
        )) : (
          <Col span={24}>
            <Card style={{ borderRadius: 16 }}>
              <Empty description="暂无来源统计数据" />
            </Card>
          </Col>
        )}
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待派单" value={data?.dispatchRealtime?.pendingDispatch || 0} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="已指派" value={data?.dispatchRealtime?.assignedDispatch || 0} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="处置中" value={data?.dispatchRealtime?.processingDispatch || 0} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="超时任务" value={data?.dispatchRealtime?.overdueDispatch || 0} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="高风险任务" value={data?.dispatchRealtime?.highRiskDispatch || 0} valueStyle={{ color: '#d4380d' }} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="平均事件分" value={data?.dispatchRealtime?.avgEventScore || 0} /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {(moduleStats || []).length ? (moduleStats || []).map((m: any) => (
          <Col xs={24} sm={12} xl={4} key={m.module}>
            <Card title={m.module} style={{ borderRadius: 16 }}>
              <div>任务总数：<Text strong>{m.total}</Text></div>
              <div>高优先级：<Text strong>{m.highPriority}</Text></div>
              <div>超时数：<Text strong type={m.overdue > 0 ? 'danger' : 'secondary'}>{m.overdue}</Text></div>
            </Card>
          </Col>
        )) : (
          <Col span={24}>
            <Card style={{ borderRadius: 16 }}>
              <Empty description="暂无模块统计数据" />
            </Card>
          </Col>
        )}
      </Row>

      <Card title="风险热力列表（高优先级/超时）" style={{ borderRadius: 18 }} extra={<Button onClick={load}>刷新</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={riskHeat}
          pagination={{ pageSize: 8, showSizeChanger: true, showQuickJumper: true }}
          scroll={{ x: 900 }}
          columns={[
            { title: '老人', dataIndex: 'elderlyName', key: 'elderlyName', fixed: 'left' as const, width: 120 },
            { title: '来源', dataIndex: 'source', key: 'source', width: 100, render: (v: string) => <Tag color={v?.includes('问答') ? 'blue' : v?.includes('预警') ? 'red' : 'purple'}>{v || '手动'}</Tag> },
            { title: '模块', dataIndex: 'module', key: 'module', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '风险等级', dataIndex: 'risk', key: 'risk', width: 100, render: (v: string) => <Tag color={v === 'high' ? 'red' : 'orange'}>{v}</Tag> },
            { title: 'SLA状态', dataIndex: 'slaStatus', key: 'slaStatus', width: 110, render: (v: string) => <Tag color={v === 'overdue' ? 'red' : v === 'warning' ? 'orange' : 'green'}>{v}</Tag> },
            { title: '事件', dataIndex: 'title', key: 'title', ellipsis: true },
            { title: '事件分', dataIndex: 'eventScore', key: 'eventScore', width: 100, sorter: (a: any, b: any) => (a.eventScore || 0) - (b.eventScore || 0) }
          ]}
        />
        <Divider />
        <Space wrap>
          <Button onClick={load}>刷新数据</Button>
          <Button onClick={() => message.info('建议先导入 Agent 演示包，填充总控面板数据')}>导入提示</Button>
        </Space>
      </Card>
    </div>
  )
}

export default AgentCommandCenter
