import React, { useEffect, useMemo, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import {
  Table,
  Card,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Badge,
  Select,
  DatePicker,
  message
} from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  WarningOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '../utils/axiosInstance'

const { Title } = Typography

interface WarningItem {
  id: number
  elderlyId: number
  warningType: string
  riskLevel: 'low' | 'medium' | 'high'
  title: string
  description: string
  status: 'pending' | 'processing' | 'resolved'
  handleTime?: string
  handleNotes?: string
  followUpAt?: string
  followUpResult?: string
  elderly?: {
    id: number
    name: string
    age: number
  }
  handler?: {
    id: number
    realName: string
  }
  createdAt?: string
}

const RiskWarning: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState<WarningItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'resolved'>('all')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')

  const [handleVisible, setHandleVisible] = useState(false)
  const [currentWarning, setCurrentWarning] = useState<WarningItem | null>(null)
  const [nextStatus, setNextStatus] = useState<'processing' | 'resolved'>('processing')
  const [handleNotes, setHandleNotes] = useState('')
  const [followUpAt, setFollowUpAt] = useState<Dayjs | null>(null)
  const [followUpResult, setFollowUpResult] = useState('')
  const [warningStats, setWarningStats] = useState<any>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ])

  const getRiskLevelConfig = (level: string) => {
    const config = {
      high: { color: 'red', text: '紧急', icon: <ExclamationCircleOutlined /> },
      medium: { color: 'orange', text: '较重', icon: <WarningOutlined /> },
      low: { color: 'green', text: '一般', icon: <ClockCircleOutlined /> }
    }
    return config[level as keyof typeof config]
  }

  const getStatusConfig = (status: string) => {
    const config = {
      pending: { color: 'error', text: '待处理' },
      processing: { color: 'processing', text: '处理中' },
      resolved: { color: 'success', text: '已解决' }
    }
    return config[status as keyof typeof config]
  }

  const fetchWarnings = async () => {
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.allSettled([
        axios.get('/warnings', {
          params: {
            page: 1,
            limit: 100,
            status: statusFilter === 'all' ? undefined : statusFilter,
            riskLevel: riskFilter === 'all' ? undefined : riskFilter,
            startDate: dateRange?.[0]?.startOf('day').toISOString(),
            endDate: dateRange?.[1]?.endOf('day').toISOString()
          }
        }),
        axios.get('/warnings/stats/overview', {
          params: {
            startDate: dateRange?.[0]?.startOf('day').toISOString(),
            endDate: dateRange?.[1]?.endOf('day').toISOString()
          }
        })
      ])

      if (listResult.status === 'fulfilled' && listResult.value.data?.success) {
        setWarnings(listResult.value.data.data || [])
      } else {
        setWarnings([])
        message.error('预警列表加载失败，请检查后端日志')
      }

      if (statsResult.status === 'fulfilled' && statsResult.value.data?.success) {
        setWarningStats(statsResult.value.data.data)
      } else {
        setWarningStats(null)
        message.warning('预警统计加载失败，列表仍可使用')
      }
    } catch (error) {
      console.error('获取预警数据失败:', error)
      message.error('获取预警数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarnings()
  }, [statusFilter, riskFilter, dateRange])

  const handleWarning = (warning: WarningItem) => {
    setCurrentWarning(warning)
    setNextStatus(warning.status === 'pending' ? 'processing' : 'resolved')
    setHandleNotes(warning.handleNotes || '')
    setFollowUpAt(warning.followUpAt ? dayjs(warning.followUpAt) : null)
    setFollowUpResult(warning.followUpResult || '')
    setHandleVisible(true)
  }

  const openDetail = async (warningId: number) => {
    try {
      const response = await axios.get(`/warnings/${warningId}`)
      if (response.data?.success) {
        setDetailData(response.data.data)
        setDetailVisible(true)
      }
    } catch (error) {
      console.error('获取预警详情失败:', error)
      message.error('获取预警详情失败')
    }
  }

  const submitHandle = async () => {
    if (!currentWarning) return
    try {
      await axios.put(`/warnings/${currentWarning.id}`, {
        status: nextStatus,
        handleNotes,
        followUpAt: followUpAt ? followUpAt.toISOString() : undefined,
        followUpResult
      })
      message.success('预警处理状态更新成功')
      setHandleVisible(false)
      setCurrentWarning(null)
      setHandleNotes('')
      setFollowUpAt(null)
      setFollowUpResult('')
      fetchWarnings()
    } catch (error) {
      console.error('更新预警失败:', error)
      message.error('更新预警失败')
    }
  }

  const pendingCount = useMemo(() => warnings.filter(w => w.status === 'pending').length, [warnings])
  const processingCount = useMemo(() => warnings.filter(w => w.status === 'processing').length, [warnings])
  const resolvedCount = useMemo(() => warnings.filter(w => w.status === 'resolved').length, [warnings])
  const handlingRate = warnings.length > 0
    ? Math.round(((processingCount + resolvedCount) / warnings.length) * 100)
    : 0

  const columns = [
    {
      title: '预警信息',
      key: 'warning',
      render: (record: WarningItem) => (
        <Space direction="vertical" size={0}>
          <div>
            <span style={{ fontWeight: 'bold' }}>{record.elderly?.name || `老人#${record.elderlyId}`}</span>
            <span style={{ color: '#999', marginLeft: 8 }}>{record.elderly?.age || '-'}岁</span>
          </div>
          <div style={{ color: '#666' }}>{record.title}</div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            触发时间: {record.createdAt ? new Date(record.createdAt).toLocaleString() : '-'}
          </div>
        </Space>
      )
    },
    {
      title: '预警类型',
      dataIndex: 'warningType',
      key: 'warningType'
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => {
        const config = getRiskLevelConfig(level)
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getStatusConfig(status)
        return <Badge status={config.color as any} text={config.text} />
      }
    },
    {
      title: '处理人',
      key: 'handler',
      render: (record: WarningItem) => record.handler?.realName || '-'
    },
    {
      title: '处理时间',
      key: 'handleTime',
      render: (record: WarningItem) => record.handleTime ? new Date(record.handleTime).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (record: WarningItem) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleWarning(record)}
            disabled={record.status === 'resolved'}
          >
            处理
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Title level={2}>风险预警管理</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理预警"
              value={pendingCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="处理中预警"
              value={processingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已解决预警"
              value={resolvedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="预警处理率"
              value={Number(warningStats?.overview?.resolutionRate || handlingRate)}
              suffix="%"
              prefix={<BellOutlined />}
            />
            <Progress percent={Math.round(Number(warningStats?.overview?.resolutionRate || handlingRate))} size="small" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="平均处理耗时"
              value={Number(warningStats?.overview?.avgHandleHours || 0)}
              precision={2}
              suffix="小时"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="超时未处理（>24h）"
              value={Number(warningStats?.overview?.timeoutCount || 0)}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="近7天预警趋势">
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: 'axis' },
                xAxis: {
                  type: 'category',
                  data: (warningStats?.trend || []).map((i: any) => i.date?.slice(5) || i.date)
                },
                yAxis: { type: 'value' },
                series: [
                  {
                    name: '预警数量',
                    type: 'line',
                    smooth: true,
                    data: (warningStats?.trend || []).map((i: any) => i.count),
                    areaStyle: {}
                  }
                ]
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="风险等级分布">
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                series: [
                  {
                    type: 'pie',
                    radius: ['45%', '70%'],
                    data: (warningStats?.riskLevel || []).map((item: any) => ({
                      name: item.riskLevel === 'high' ? '紧急' : item.riskLevel === 'medium' ? '较重' : '一般',
                      value: Number(item.count)
                    }))
                  }
                ]
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="预警列表"
        extra={
          <Space>
            <Button onClick={() => navigate('/query')}>去智能问答</Button>
            <Button type="primary" onClick={() => navigate('/agent/vnext')}>去运行台处置</Button>
            <DatePicker.RangePicker
              value={dateRange}
              presets={[
                { label: '最近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
                { label: '最近30天', value: [dayjs().subtract(30, 'day'), dayjs()] }
              ]}
              onChange={(values) => setDateRange(values as [Dayjs, Dayjs] | null)}
              allowClear
            />
            <Select
              value={statusFilter}
              style={{ width: 140 }}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'pending', label: '待处理' },
                { value: 'processing', label: '处理中' },
                { value: 'resolved', label: '已解决' }
              ]}
            />
            <Select
              value={riskFilter}
              style={{ width: 140 }}
              onChange={(value) => setRiskFilter(value)}
              options={[
                { value: 'all', label: '全部风险' },
                { value: 'low', label: '一般' },
                { value: 'medium', label: '较重' },
                { value: 'high', label: '紧急' }
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchWarnings}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={warnings}
          loading={loading}
          rowKey="id"
          pagination={{
            total: warnings.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>

      <Modal
        title="预警详情与处置轨迹"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false)
          setDetailData(null)
        }}
        footer={null}
      >
        {detailData ? (
          <div>
            <p><strong>老人：</strong>{detailData.elderly?.name}（{detailData.elderly?.age}岁）</p>
            <p><strong>预警类型：</strong>{detailData.warningType}</p>
            <p><strong>风险等级：</strong>{detailData.riskLevel}</p>
            <p><strong>当前状态：</strong>{detailData.status}</p>
            <p><strong>回访时间：</strong>{detailData.followUpAt ? new Date(detailData.followUpAt).toLocaleString() : '未填写'}</p>
            <p><strong>回访结果：</strong>{detailData.followUpResult || '未填写'}</p>
            <div style={{ marginTop: 12 }}>
              <strong>处置轨迹：</strong>
              <ul>
                {(detailData.actionLogs || []).map((log: any) => (
                  <li key={log.id}>
                    {new Date(log.createdAt).toLocaleString()} - {log.operator?.realName || '系统'}：
                    {log.fromStatus || '-'} → {log.toStatus || '-'}
                    {log.notes ? `（备注：${log.notes}）` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="处理预警"
        open={handleVisible}
        onCancel={() => {
          setHandleVisible(false)
          setCurrentWarning(null)
        }}
        onOk={submitHandle}
        okText="提交处理"
      >
        {currentWarning && (
          <Form layout="vertical">
            <Form.Item label="老人信息">
              <Input value={`${currentWarning.elderly?.name || `老人#${currentWarning.elderlyId}`} (${currentWarning.elderly?.age || '-'}岁)`} disabled />
            </Form.Item>
            <Form.Item label="预警类型">
              <Input value={currentWarning.warningType} disabled />
            </Form.Item>
            <Form.Item label="状态流转">
              <Select
                value={nextStatus}
                onChange={(value) => setNextStatus(value)}
                options={[
                  { value: 'processing', label: '转为处理中' },
                  { value: 'resolved', label: '转为已解决' }
                ]}
              />
            </Form.Item>
            <Form.Item label="预警描述">
              <Input.TextArea value={currentWarning.description} disabled rows={3} />
            </Form.Item>
            <Form.Item label="处理备注">
              <Input.TextArea
                placeholder="请输入处理过程和结果"
                rows={3}
                value={handleNotes}
                onChange={(e) => setHandleNotes(e.target.value)}
              />
            </Form.Item>
            <Form.Item label="回访时间">
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={followUpAt}
                onChange={(value) => setFollowUpAt(value)}
              />
            </Form.Item>
            <Form.Item label="回访结果">
              <Input.TextArea
                placeholder="请输入回访结果，如“血压恢复正常，继续观察”"
                rows={3}
                value={followUpResult}
                onChange={(e) => setFollowUpResult(e.target.value)}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default RiskWarning
