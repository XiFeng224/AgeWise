import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Tabs } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../utils/axiosInstance'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeKey, setActiveKey] = useState('login')
  const navigate = useNavigate()

  const onLogin = async (values: any) => {
    setLoading(true)
    try {
      const response = await axiosInstance.post('/auth/login', values)

      const accessToken = response.data?.data?.accessToken
      const refreshToken = response.data?.data?.refreshToken
      const user = response.data?.data?.user

      if (accessToken) {
        localStorage.setItem('token', accessToken)
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
        }
        message.success(response.data?.message || '登录成功')
        navigate('/dashboard')
      }
    } catch (error: any) {
      const status = error.response?.status
      const backendMessage = error.response?.data?.error
      if (status === 429) {
        message.error(backendMessage || '登录失败次数过多，请稍后重试')
      } else if (status === 401) {
        message.error('用户名或密码错误，请确认后重试')
      } else {
        message.error(backendMessage || '登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: any) => {
    setLoading(true)
    try {
      const response = await axiosInstance.post('/auth/register', values)
      message.success(response.data?.message || '注册成功，请登录')
      // 切换到登录标签页
      setActiveKey('login')
    } catch (error: any) {
      message.error(error.response?.data?.error || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #4f79a7 0%, #2e3e52 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: 400, 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)' 
        }}
        title={
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
            智护银龄
          </div>
        }
      >
        <Tabs 
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form
                  name="login"
                  onFinish={onLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="用户名" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码!' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="密码" 
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      style={{ width: '100%' }}
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form
                  name="register"
                  onFinish={onRegister}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="用户名" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码!' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="密码" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="realName"
                    rules={[{ required: true, message: '请输入真实姓名!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="真实姓名" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱!' },
                      { type: 'email', message: '请输入有效的邮箱地址!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="邮箱" 
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="phone"
                    rules={[{ required: true, message: '请输入手机号!' }]}
                  >
                    <Input 
                      prefix={<PhoneOutlined />} 
                      placeholder="手机号" 
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      style={{ width: '100%' }}
                    >
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
        
        <div style={{ textAlign: 'center', marginTop: '16px', color: '#666' }}>
          <small>社区智慧养老云平台</small>
        </div>
      </Card>
    </div>
  )
}

export default Login