import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Tag,
  Row,
  Col,
  Avatar,
  message,
  Switch
} from 'antd'
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons'
import axios from '../utils/axiosInstance'

const { Title } = Typography
const { Option } = Select

interface Elderly {
  id: number
  name: string
  age: number
  gender: 'male' | 'female'
  phone: string
  address: string
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
  riskLevel: 'low' | 'medium' | 'high'
  isAlone: boolean
  idCard?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  gridMemberId?: number
}

const ElderlyManagement: React.FC = () => {
  const navigate = useNavigate()
  const [elders, setElders] = useState<Elderly[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingElder, setEditingElder] = useState<Elderly | null>(null)

  const [searchText, setSearchText] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [healthFilter, setHealthFilter] = useState<string>('')

  const getHealthStatusConfig = (status: string) => {
    const config = {
      excellent: { color: 'green', text: '优秀' },
      good: { color: 'blue', text: '良好' },
      fair: { color: 'orange', text: '一般' },
      poor: { color: 'red', text: '较差' }
    }
    return config[status as keyof typeof config] || { color: 'default', text: status }
  }

  const getRiskLevelConfig = (level: string) => {
    const config = {
      low: { color: 'green', text: '低风险' },
      medium: { color: 'orange', text: '中风险' },
      high: { color: 'red', text: '高风险' }
    }
    return config[level as keyof typeof config] || { color: 'default', text: level }
  }

  const loadElders = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/elderly', {
        params: {
          page: 1,
          limit: 100,
          search: searchText || undefined,
          riskLevel: riskFilter || undefined,
          healthStatus: healthFilter || undefined
        }
      })
      setElders(response.data?.data || [])
    } catch (error) {
      console.error('加载老人列表失败:', error)
      message.error('加载老人列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadElders()
  }, [searchText, riskFilter, healthFilter])

  const handleAdd = () => {
    setEditingElder(null)
    setModalVisible(true)
  }

  const handleEdit = (elder: Elderly) => {
    setEditingElder(elder)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/elderly/${id}`)
      message.success('删除成功')
      loadElders()
    } catch (error: any) {
      message.error(error?.response?.data?.error || '删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingElder) {
        await axios.put(`/elderly/${editingElder.id}`, values)
        message.success('更新成功')
      } else {
        await axios.post('/elderly', values)
        message.success('新增成功')
      }
      setModalVisible(false)
      setEditingElder(null)
      loadElders()
    } catch (error: any) {
      message.error(error?.response?.data?.error || '提交失败')
    }
  }

  const columns = [
    {
      title: '老人信息',
      key: 'info',
      render: (record: Elderly) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Space direction="vertical" size={0}>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.age}岁 • {record.gender === 'male' ? '男' : '女'}
            </div>
          </Space>
        </Space>
      )
    },
    { title: '联系方式', dataIndex: 'phone', key: 'phone' },
    { title: '居住地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '健康状况',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      render: (status: string) => {
        const config = getHealthStatusConfig(status)
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => {
        const config = getRiskLevelConfig(level)
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '是否独居',
      dataIndex: 'isAlone',
      key: 'isAlone',
      render: (alone: boolean) => <Tag color={alone ? 'orange' : 'green'}>{alone ? '独居' : '非独居'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (record: Elderly) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Title level={2}>老人信息管理</Title>

      <Card
        title="老人列表"
        extra={
          <Space>
            <Button onClick={() => navigate('/query')}>问问 Agent</Button>
            <Button type="primary" onClick={() => navigate('/agent/vnext')}>生成任务</Button>
            <Input
              placeholder="搜索姓名/电话/地址"
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="风险等级"
              allowClear
              style={{ width: 140 }}
              value={riskFilter || undefined}
              onChange={(v) => setRiskFilter(v || '')}
            >
              <Option value="low">低风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="high">高风险</Option>
            </Select>
            <Select
              placeholder="健康状态"
              allowClear
              style={{ width: 140 }}
              value={healthFilter || undefined}
              onChange={(v) => setHealthFilter(v || '')}
            >
              <Option value="excellent">优秀</Option>
              <Option value="good">良好</Option>
              <Option value="fair">一般</Option>
              <Option value="poor">较差</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增老人</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={elders} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingElder ? '编辑老人信息' : '新增老人信息'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingElder(null)
        }}
        footer={null}
        width={680}
      >
        <Form
          layout="vertical"
          initialValues={editingElder || {
            gender: 'male',
            healthStatus: 'good',
            riskLevel: 'low',
            isAlone: false,
            gridMemberId: 1
          }}
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="age" label="年龄" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="gender" label="性别"><Select><Option value="male">男</Option><Option value="female">女</Option></Select></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="联系电话" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="idCard" label="身份证号" rules={[{ required: !editingElder, message: '新增时请填写身份证号' }]}><Input /></Form.Item>
          <Form.Item name="address" label="居住地址" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="emergencyContact" label="紧急联系人" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="emergencyPhone" label="紧急联系电话" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="healthStatus" label="健康状况"><Select><Option value="excellent">优秀</Option><Option value="good">良好</Option><Option value="fair">一般</Option><Option value="poor">较差</Option></Select></Form.Item></Col>
            <Col span={8}><Form.Item name="riskLevel" label="风险等级"><Select><Option value="low">低风险</Option><Option value="medium">中风险</Option><Option value="high">高风险</Option></Select></Form.Item></Col>
            <Col span={8}><Form.Item name="gridMemberId" label="负责网格员ID" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
          </Row>
          <Form.Item name="isAlone" label="是否独居" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit">{editingElder ? '更新' : '新增'}</Button><Button onClick={() => setModalVisible(false)}>取消</Button></Space></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ElderlyManagement
