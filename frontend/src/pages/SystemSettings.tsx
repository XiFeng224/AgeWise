import React, { useEffect, useState } from 'react'
import axios from '../utils/axiosInstance'
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Button, 
  Space, 
  Typography, 
  Divider,
  Row,
  Col,
  App,
  List,
  Tag,
  Table
} from 'antd'
import { 
  SaveOutlined, 
  PlusOutlined, 
  DeleteOutlined
} from '@ant-design/icons'

const { Title } = Typography
const { Option } = Select

const SystemSettings: React.FC = () => {
  const { message } = App.useApp()

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  })()

  const canManageSystem = currentUser?.role === 'admin' || currentUser?.role === 'manager'
  const [warningRules, setWarningRules] = useState([
    {
      id: 1,
      name: '独居老人出入异常',
      description: '独居老人48小时无门禁出入记录',
      enabled: true,
      level: 'medium'
    },
    {
      id: 2,
      name: '健康指标连续异常',
      description: '血压/血糖连续3次超过警戒值',
      enabled: true,
      level: 'high'
    },
    {
      id: 3,
      name: '季节变化提醒',
      description: '极端天气、季节变化提醒',
      enabled: true,
      level: 'low'
    },
  ])

  const [resetLoading, setResetLoading] = useState(false)
  const [aiMetrics, setAiMetrics] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const handleSaveSettings = (values: any) => {
    console.log('保存系统设置:', values)
    message.success('系统设置已保存')
  }

  const handleResetDemoData = async () => {
    setResetLoading(true)
    try {
      await axios.post('/system/reset-demo-users')
      message.success('演示数据已重置，默认账号可用')
    } catch (error: any) {
      console.error('重置演示数据失败:', error)
      message.error(error?.response?.data?.error || '重置失败')
    } finally {
      setResetLoading(false)
    }
  }

  const loadAiMetrics = async () => {
    setAiLoading(true)
    try {
      const response = await axios.get('/system/ai-metrics')
      if (response.data?.success) {
        setAiMetrics(response.data.data)
      }
    } catch (error: any) {
      console.error('加载AI指标失败:', error)
      message.error(error?.response?.data?.error || '加载AI指标失败')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    loadAiMetrics()
  }, [])

  const handleToggleRule = (id: number, enabled: boolean) => {
    setWarningRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, enabled } : rule
      )
    )
    message.success(`预警规则${enabled ? '启用' : '禁用'}成功`)
  }

  const handleDeleteRule = (id: number) => {
    setWarningRules(prev => prev.filter(rule => rule.id !== id))
    message.success('预警规则删除成功')
  }

  const getLevelTag = (level: string) => {
    const config = {
      high: { color: 'red', text: '紧急' },
      medium: { color: 'orange', text: '较重' },
      low: { color: 'green', text: '一般' },
    }
    const { color, text } = config[level as keyof typeof config]
    return <Tag color={color}>{text}</Tag>
  }

  if (!canManageSystem) {
    return (
      <Card>
        <Title level={4}>权限不足</Title>
        <p>仅管理员和社区管理员可访问系统设置。</p>
      </Card>
    )
  }

  if (!canManageSystem) {
    return (
      <Card>
        <Title level={4}>权限不足</Title>
        <p style={{ margin: 0, color: '#666' }}>仅系统管理员和社区管理员可访问系统设置。</p>
      </Card>
    )
  }

  return (
    <div>
      <Title level={2}>系统设置</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="基本设置">
            <Form
              layout="vertical"
              initialValues={{
                systemName: '社区养老智能平台',
                apiUrl: 'http://localhost:8000',
                agentUrl: 'http://localhost:8001',
                timeout: 30,
                language: 'zh-CN'
              }}
              onFinish={handleSaveSettings}
            >
              <Form.Item
                name="systemName"
                label="系统名称"
                rules={[{ required: true, message: '请输入系统名称' }]}
              >
                <Input placeholder="请输入系统名称" />
              </Form.Item>

              <Form.Item
                name="apiUrl"
                label="API服务地址"
                rules={[{ required: true, message: '请输入API服务地址' }]}
              >
                <Input placeholder="http://localhost:8000" />
              </Form.Item>

              <Form.Item
                name="agentUrl"
                label="Agent服务地址"
                rules={[{ required: true, message: '请输入Agent服务地址' }]}
              >
                <Input placeholder="http://localhost:8001" />
              </Form.Item>

              <Form.Item
                name="timeout"
                label="请求超时时间(秒)"
                rules={[{ required: true, message: '请输入超时时间' }]}
              >
                <Input type="number" />
              </Form.Item>

              <Form.Item name="language" label="系统语言">
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title="预警规则设置" 
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />}>
                新增规则
              </Button>
            }
          >
            <List
              dataSource={warningRules}
              renderItem={(rule) => (
                <List.Item
                  actions={[
                    <Switch 
                      key="switch"
                      checked={rule.enabled}
                      onChange={(checked) => handleToggleRule(rule.id, checked)}
                    />,
                    <Button 
                      key="delete"
                      type="link" 
                      danger 
                      size="small" 
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteRule(rule.id)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{rule.name}</span>
                        {getLevelTag(rule.level)}
                      </Space>
                    }
                    description={rule.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card
        title="演示环境工具"
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" danger loading={resetLoading} onClick={handleResetDemoData}>
            一键重置演示数据
          </Button>
        }
      >
        <p style={{ margin: 0, color: '#666' }}>
          用于比赛现场快速恢复账号与样例数据。重置后默认账号：admin/123456，manager1/admin123，grid1/admin123。
        </p>
      </Card>

      <Card
        title="AI调用监控"
        extra={<Button onClick={loadAiMetrics} loading={aiLoading}>刷新AI指标</Button>}
        style={{ marginBottom: 16 }}
      >
        <Space size={24} wrap style={{ marginBottom: 16 }}>
          <Tag color="blue">总查询：{aiMetrics?.totalQueries || 0}</Tag>
          <Tag color="green">有效回答：{aiMetrics?.answeredQueries || 0}</Tag>
          <Tag color="orange">兜底率：{aiMetrics?.fallbackRate || 0}%</Tag>
          <Tag color="purple">平均置信度：{aiMetrics?.avgConfidence || 0}%</Tag>
        </Space>

        <Table
          size="small"
          rowKey={(record: any) => record.time}
          loading={aiLoading}
          dataSource={aiMetrics?.recentCalls || []}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: '时间', dataIndex: 'time', key: 'time', render: (t: string) => new Date(t).toLocaleString() },
            { title: '来源', dataIndex: 'source', key: 'source' },
            { title: '查询内容', dataIndex: 'query', key: 'query', ellipsis: true },
            { title: '耗时(ms)', dataIndex: 'latencyMs', key: 'latencyMs' },
            { title: '结果', dataIndex: 'success', key: 'success', render: (s: boolean) => <Tag color={s ? 'green' : 'red'}>{s ? '成功' : '失败'}</Tag> }
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="权限管理">
            <Form layout="vertical">
              <Form.Item label="用户角色">
                <Select defaultValue="admin">
                  <Option value="admin">系统管理员</Option>
                  <Option value="manager">社区管理员</Option>
                  <Option value="grid">网格员</Option>
                  <Option value="family">家属</Option>
                </Select>
              </Form.Item>

              <Form.Item label="数据权限">
                <Select mode="multiple" defaultValue={['read', 'write']}>
                  <Option value="read">数据查看</Option>
                  <Option value="write">数据编辑</Option>
                  <Option value="delete">数据删除</Option>
                  <Option value="export">数据导出</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  保存权限设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="安全设置">
            <Form layout="vertical">
              <Form.Item label="密码策略">
                <Select defaultValue="medium">
                  <Option value="low">低强度（6位以上）</Option>
                  <Option value="medium">中强度（8位以上，包含字母数字）</Option>
                  <Option value="high">高强度（12位以上，包含大小写字母、数字、特殊字符）</Option>
                </Select>
              </Form.Item>

              <Form.Item label="会话超时">
                <Select defaultValue="30">
                  <Option value="15">15分钟</Option>
                  <Option value="30">30分钟</Option>
                  <Option value="60">1小时</Option>
                  <Option value="120">2小时</Option>
                </Select>
              </Form.Item>

              <Form.Item label="登录尝试限制">
                <Space.Compact style={{ width: '100%' }}>
                  <Input style={{ width: '60%' }} defaultValue="5" />
                  <Select defaultValue="hour" style={{ width: '40%' }}>
                    <Option value="minute">次/分钟</Option>
                    <Option value="hour">次/小时</Option>
                    <Option value="day">次/天</Option>
                  </Select>
                </Space.Compact>
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  保存安全设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SystemSettings