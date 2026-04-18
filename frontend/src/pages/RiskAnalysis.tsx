import React, { useEffect, useState } from 'react'
import { Alert, Card, Col, Divider, Row, Spin, Statistic, Tag, Typography, List, Space, Button, App } from 'antd'
import { useNavigate } from 'react-router-dom'
import axios from '../utils/axiosInstance'

const { Title, Text } = Typography

const RiskAnalysis: React.FC = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [elderlyList, setElderlyList] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/elderly', { params: { page: 1, limit: 200 } })
        setElderlyList(res.data?.data || [])
        const first = res.data?.data?.[0]?.id
        if (first) setSelectedId(first)
      } catch {
        message.error('老人列表加载失败')
      }
    }
    load()
  }, [message])

  const runAnalysis = async (id = selectedId) => {
    if (!id) return message.warning('请先选择老人')
    setLoading(true)
    try {
      const res = await axios.get(`/risk-analysis/${id}`, { params: { days: 7 } })
      setResult(res.data?.data || null)
      message.success('风险分析完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '风险分析失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) runAnalysis(selectedId)
  }, [selectedId])

  const riskColor = result?.summary?.riskLevel === 'high' ? 'red' : result?.summary?.riskLevel === 'medium' ? 'orange' : 'green'

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>社区养老风险分析 Agent</Title>
      <Text type="secondary">基于健康、活动、预警、情绪、认知与服务数据，自动生成风险分析、解释与处置建议。</Text>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="老人列表">
            <List
              dataSource={elderlyList}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', background: selectedId === item.id ? '#e6f4ff' : undefined, padding: '8px 12px' }}
                  onClick={() => setSelectedId(item.id)}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>{item.name}</Text>
                    <Text type="secondary">{item.age}岁 · {item.riskLevel}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={16}>
          <Card
            title="风险分析结果"
            extra={<Button type="primary" loading={loading} onClick={() => runAnalysis()}>重新分析</Button>}
          >
            {loading && !result ? <Spin /> : result ? (
              <>
                <Row gutter={16}>
                  <Col span={6}><Statistic title="风险分数" value={result.summary.riskScore} valueStyle={{ color: riskColor }} /></Col>
                  <Col span={6}><Statistic title="风险等级" value={result.summary.riskLevel === 'high' ? '高风险' : result.summary.riskLevel === 'medium' ? '中风险' : '低风险'} valueStyle={{ color: riskColor }} /></Col>
                  <Col span={6}><Statistic title="风险趋势" value={result.summary.trend === 'worsening' ? '恶化' : result.summary.trend === 'improving' ? '改善' : '稳定'} /></Col>
                  <Col span={6}><Statistic title="分析置信度" value={result.summary.confidence} suffix="%" /></Col>
                </Row>

                <Divider />

                <Alert
                  type={result.summary.riskLevel === 'high' ? 'error' : result.summary.riskLevel === 'medium' ? 'warning' : 'success'}
                  showIcon
                  message={`综合判断：${result.elderly.name} 当前处于${result.summary.riskLevel === 'high' ? '高风险' : result.summary.riskLevel === 'medium' ? '中风险' : '低风险'}状态`}
                  description={`依据：${result.analysis.healthAbnormalities.length + result.analysis.activityAbnormalities.length + result.analysis.warningSignals.length} 条异常/预警信号，建议尽快执行优先级动作。`}
                />

                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Card size="small" title="异常数据">
                      <List
                        size="small"
                        dataSource={[
                          ...result.analysis.healthAbnormalities,
                          ...result.analysis.activityAbnormalities,
                          ...result.analysis.warningSignals,
                          ...result.analysis.serviceGaps
                        ]}
                        renderItem={(item: string) => <List.Item>{item}</List.Item>}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="建议动作">
                      <List
                        size="small"
                        dataSource={result.recommendations || []}
                        renderItem={(item: any) => (
                          <List.Item>
                            <Space direction="vertical" size={0}>
                              <Text strong>{item.timeWindow} · {item.owner}</Text>
                              <Text>{item.action}</Text>
                              <Text type="secondary">原因：{item.reason}</Text>
                              <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'green'}>{item.priority}</Tag>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>

                <Divider />
                <Space wrap style={{ marginBottom: 12 }}>
                  <Button type="primary" onClick={() => navigate('/agent/vnext', { state: { elderlyId: result.elderly.id, riskAnalysis: result } } as any)}>
                    一键生成 Agent 任务
                  </Button>
                  <Button onClick={() => navigate('/agent/vnext')}>前往运行台</Button>
                </Space>

                <Divider />
                <Row gutter={16}>
                  <Col span={8}><Card size="small"><Statistic title="健康数据点" value={result.dataSnapshot.healthPoints} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="活动轨迹点" value={result.dataSnapshot.activityPoints} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="最近预警数" value={result.dataSnapshot.warningCount} /></Card></Col>
                </Row>
              </>
            ) : (
              <Text type="secondary">暂无分析结果</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RiskAnalysis
