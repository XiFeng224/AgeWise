import React from 'react'
import { Menu, MenuProps } from 'antd'
import {
  DashboardOutlined,
  SearchOutlined,
  WarningOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  IdcardOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  collapsed?: boolean
  userRole?: string
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, userRole = 'grid' }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // 根据用户角色确定可访问的菜单项
  const getMenuItems = (): MenuProps['items'] => {
    const baseItems: MenuProps['items'] = [
      {
        key: '/dashboard',
        icon: React.createElement(DashboardOutlined),
        label: '系统概览'
      },
      {
        key: '/query',
        icon: React.createElement(SearchOutlined),
        label: '数据查询'
      },
      {
        key: '/risk',
        icon: React.createElement(WarningOutlined),
        label: '风险预警'
      },
      {
        key: '/elderly',
        icon: React.createElement(UserOutlined),
        label: '老人管理'
      },
      {
        key: '/statistics',
        icon: React.createElement(BarChartOutlined),
        label: '数据统计'
      },
      {
        key: '/profile',
        icon: React.createElement(IdcardOutlined),
        label: '个人中心'
      }
    ]

    // 只有管理员和社区管理员可以访问系统设置
    if (userRole === 'admin' || userRole === 'manager') {
      baseItems.push({
        key: '/settings',
        icon: React.createElement(SettingOutlined),
        label: '系统设置'
      })
    }

    return baseItems
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return React.createElement(Menu, {
    mode: "inline",
    selectedKeys: [location.pathname],
    defaultOpenKeys: ['data'],
    inlineCollapsed: collapsed,
    items: getMenuItems(),
    onClick: handleMenuClick,
    style: { 
      height: '100%', 
      borderRight: 0,
      background: '#fafafa'
    }
  })
}

export default Sidebar