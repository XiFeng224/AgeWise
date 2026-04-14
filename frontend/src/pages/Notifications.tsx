import React, { useState, useEffect } from 'react'
import { 
  Card, 
  List, 
  Badge, 
  Button, 
  Space, 
  message, 
  Spin, 
  Modal,
  Tag,
  Tooltip
} from 'antd'
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons'
import axios from '../utils/axiosInstance'

const { confirm } = Modal

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载通知列表
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/notifications')
      if (response.data.success) {
        setNotifications(response.data.data)
      }
    } catch (error) {
      console.error('加载通知失败:', error)
      message.error('加载通知失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载未读通知数量
  const loadUnreadCount = async () => {
    try {
      const response = await axios.get('/notifications/unread/count')
      if (response.data.success) {
        setUnreadCount(response.data.data)
      }
    } catch (error) {
      console.error('获取未读通知数量失败:', error)
    }
  }

  // 标记通知为已读
  const markAsRead = async (id: number) => {
    try {
      await axios.put(`/notifications/${id}/read`)
      message.success('通知已标记为已读')
      loadNotifications()
      loadUnreadCount()
    } catch (error) {
      console.error('标记通知为已读失败:', error)
      message.error('标记通知为已读失败')
    }
  }

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all')
      message.success('所有通知已标记为已读')
      loadNotifications()
      loadUnreadCount()
    } catch (error) {
      console.error('标记所有通知为已读失败:', error)
      message.error('标记所有通知为已读失败')
    }
  }

  // 删除通知
  const deleteNotification = (id: number) => {
    confirm({
      title: '确认删除',
      content: '您确定要删除这条通知吗？',
      onOk: async () => {
        try {
          await axios.delete(`/notifications/${id}`)
          message.success('通知已删除')
          loadNotifications()
          loadUnreadCount()
        } catch (error) {
          console.error('删除通知失败:', error)
          message.error('删除通知失败')
        }
      }
    })
  }

  // 获取通知类型图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'system':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'user':
        return <UserOutlined style={{ color: '#52c41a' }} />
      default:
        return <BellOutlined style={{ color: '#fa8c16' }} />
    }
  }

  // 获取通知类型标签
  const getNotificationTag = (type: string) => {
    switch (type) {
      case 'warning':
        return <Tag color="error">预警</Tag>
      case 'system':
        return <Tag color="blue">系统</Tag>
      case 'user':
        return <Tag color="success">用户</Tag>
      default:
        return <Tag color="orange">其他</Tag>
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <Space>
            <BellOutlined />
            <span>通知中心</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />
            )}
          </Space>
        } 
        extra={
          <Button 
            type="primary" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            全部标记为已读
          </Button>
        }
      >
        <Spin spinning={loading}>
          {notifications.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={notifications}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    !item.isRead && (
                      <Tooltip title="标记为已读">
                        <Button 
                          type="text" 
                          icon={<CheckCircleOutlined />} 
                          onClick={() => markAsRead(item.id)}
                        />
                      </Tooltip>
                    ),
                    <Tooltip title="删除">
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => deleteNotification(item.id)}
                      />
                    </Tooltip>
                  ]}
                  style={{
                    backgroundColor: item.isRead ? 'transparent' : '#f6ffed',
                    borderLeft: item.isRead ? 'none' : '4px solid #52c41a',
                    paddingLeft: '12px'
                  }}
                >
                  <List.Item.Meta
                    avatar={getNotificationIcon(item.type)}
                    title={
                      <Space>
                        {item.title}
                        {getNotificationTag(item.type)}
                      </Space>
                    }
                    description={
                      <div>
                        <p>{item.content}</p>
                        <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <BellOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              <p style={{ marginTop: '16px', color: '#999' }}>暂无通知</p>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default Notifications
