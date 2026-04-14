import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, message, Typography, Space, Tag } from 'antd'
import axios from '../utils/axiosInstance'

const { Title } = Typography

const Profile: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('')

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/auth/profile')
      const user = response.data?.data?.user
      if (user) {
        form.setFieldsValue({
          username: user.username,
          realName: user.realName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar
        })
        setRole(user.role)
      }
    } catch (error) {
      console.error('加载个人信息失败:', error)
      message.error('加载个人信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const onSubmit = async (values: any) => {
    setLoading(true)
    try {
      await axios.put('/auth/profile', {
        realName: values.realName,
        email: values.email,
        phone: values.phone,
        avatar: values.avatar
      })
      message.success('个人信息更新成功')
      await loadProfile()
    } catch (error: any) {
      console.error('更新个人信息失败:', error)
      message.error(error?.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>个人中心</Title>
        {role ? <Tag color="blue">角色：{role}</Tag> : null}
      </Space>

      <Card>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="username" label="用户名">
            <Input disabled />
          </Form.Item>

          <Form.Item name="realName" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式错误' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="avatar" label="头像地址">
            <Input placeholder="可选" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>保存修改</Button>
        </Form>
      </Card>
    </div>
  )
}

export default Profile
