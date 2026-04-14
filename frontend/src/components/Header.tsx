import React, { useState, useEffect } from 'react'
import { Layout, Dropdown, Avatar, Badge, Button, MenuProps } from 'antd'
import { 
  UserOutlined, 
  BellOutlined, 
  LogoutOutlined,
  SettingOutlined 
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Header: AntHeader } = Layout

interface UserInfo {
  username: string
  realName: string
  role: string
  avatar?: string
}

const Header: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [unreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // 从localStorage获取用户信息
    const userData = localStorage.getItem('user')
    if (userData) {
      setUserInfo(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleProfile = () => {
    // 跳转到个人信息页面
    navigate('/profile')
  }

  const handleNotifications = () => {
    // 处理通知点击
    console.log('查看通知')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: React.createElement(UserOutlined),
      label: '个人信息',
      onClick: handleProfile
    },
    {
      key: 'settings',
      icon: React.createElement(SettingOutlined),
      label: '系统设置',
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: React.createElement(LogoutOutlined),
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
        智护银龄
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Badge count={unreadCount}>
          <Button 
            type="text" 
            icon={<BellOutlined />} 
            onClick={handleNotifications}
          />
        </Badge>
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              src={userInfo?.avatar}
            />
            <span style={{ color: '#000' }}>
              {userInfo?.realName || userInfo?.username || '用户'}
            </span>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  )
}

export default Header