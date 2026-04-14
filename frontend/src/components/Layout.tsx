import React, { useState, useEffect, useMemo } from 'react'
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar, Badge, Typography } from 'antd'
import axios from '../utils/axiosInstance'
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DashboardOutlined, 
  UserOutlined, 
  WarningOutlined, 
  SearchOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  HeartOutlined,
  BellOutlined,
  RobotOutlined,
  HomeOutlined,
  VideoCameraOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import './Layout.css'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  // 获取未读通知数量
  const getUnreadCount = async () => {
    try {
      const response = await axios.get('/notifications/unread/count')
      if (response.data.success) {
        // 处理两种情况：数字或对象
        const data = response.data.data
        setUnreadCount(typeof data === 'object' ? data.count : data)
      }
    } catch (error) {
      console.error('获取未读通知数量失败:', error)
    }
  }

  useEffect(() => {
    getUnreadCount()
  }, [])

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const role = user?.role || 'grid'
  const username = user?.realName || user?.username || '管理员'

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/elderly',
      icon: <UserOutlined />,
      label: '老人管理',
    },
    {
      key: '/risk',
      icon: <WarningOutlined />,
      label: '风险预警',
    },
    {
      key: '/query',
      icon: <SearchOutlined />,
      label: '智能查询',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析',
    },
    {
      key: '/health',
      icon: <HeartOutlined />,
      label: '健康档案',
    },
    {
      key: '/medical-protection',
      icon: <VideoCameraOutlined />,
      label: '医疗防护视频',
    },
    {
      key: '/agent',
      icon: <RobotOutlined />,
      label: '总控Agent',
      children: [
        {
          key: '/agent/command',
          icon: <RobotOutlined />,
          label: '指挥中心',
        },
        {
          key: '/agent/vnext',
          icon: <RobotOutlined />,
          label: 'Agent VNext',
        },
      ],
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '通知中心',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserSwitchOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/profile')
      return
    }

    if (key === 'logout') {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      navigate('/login')
    }
  }

  return (
    <AntLayout className="layout-container">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="layout-sider"
      >
        <div className="layout-logo">
          <HomeOutlined className="logo-icon" />
          <span className={collapsed ? 'logo-text collapsed' : 'logo-text'}>
            智护银龄
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.filter((item: any) => {
            if (item.key === '/settings') return role === 'admin' || role === 'manager'
            return true
          })}
          onClick={handleMenuClick}
          className="layout-menu"
        />
      </Sider>
      <AntLayout>
        <Header className="layout-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="layout-header-toggle"
          />
          <div className="layout-header-right">
            <Button 
              type="text" 
              icon={
                <Badge count={unreadCount} className="notification-badge">
                  <BellOutlined className="notification-icon" />
                </Badge>
              } 
              onClick={() => navigate('/notifications')}
              className="notification-button"
            />
            <Dropdown 
              menu={{ 
                items: userMenuItems, 
                onClick: handleUserMenuClick 
              }}
              placement="bottomRight"
            >
              <div className="user-profile">
                <Avatar size="small" icon={<UserOutlined />} className="user-avatar" />
                <div className="user-info">
                  <Text className="user-name">{username}</Text>
                  <Text className="user-role">{role === 'admin' ? '管理员' : role === 'manager' ? '社区管理员' : '网格员'}</Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="layout-content">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout