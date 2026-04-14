import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, message } from 'antd'
import axios from '../utils/axiosInstance'

const { Text } = Typography

const AgentCommandCenter: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="待处理总量" value={data?.overview?.totalToHandle || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="SLA超时" value={data?.overview?.overdueCount || 0} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="预警闭环率" value={data?.quality?.closureRate || 0} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="服务完成率" value={data?.quality?.serviceCompletionRate || 0} suffix="%" /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card><Statistic title="待派单" value={data?.dispatchRealtime?.pendingDispatch || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="已指派" value={data?.dispatchRealtime?.assignedDispatch || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="处置中" value={data?.dispatchRealtime?.processingDispatch || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="超时任务" value={data?.dispatchRealtime?.overdueDispatch || 0} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="高风险任务" value={data?.dispatchRealtime?.highRiskDispatch || 0} valueStyle={{ color: '#d4380d' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="平均事件分" value={data?.dispatchRealtime?.avgEventScore || 0} /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {(data?.moduleStats || []).map((m: any) => (
          <Col span={4} key={m.module}>
            <Card title={m.module}>
              <div>任务总数：<Text strong>{m.total}</Text></div>
              <div>高优先级：<Text strong>{m.highPriority}</Text></div>
              <div>超时数：<Text strong type={m.overdue > 0 ? 'danger' : 'secondary'}>{m.overdue}</Text></div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="风险热力列表（高优先级/超时）" extra={<Button onClick={load}>刷新</Button>}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data?.riskHeat || []}
          columns={[
            { title: '老人', dataIndex: 'elderlyName', key: 'elderlyName' },
            { title: '模块', dataIndex: 'module', key: 'module', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '风险等级', dataIndex: 'risk', key: 'risk', render: (v: string) => <Tag color={v === 'high' ? 'red' : 'orange'}>{v}</Tag> },
            { title: 'SLA状态', dataIndex: 'slaStatus', key: 'slaStatus', render: (v: string) => <Tag color={v === 'overdue' ? 'red' : v === 'warning' ? 'orange' : 'green'}>{v}</Tag> },
            { title: '事件', dataIndex: 'title', key: 'title' },
            { title: '事件分', dataIndex: 'eventScore', key: 'eventScore' }
          ]}
        />
      </Card>
    </div>
  )
}

export default AgentCommandCenter
