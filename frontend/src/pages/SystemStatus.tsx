import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Progress, Tag, List, Typography, Button, Space, Spin } from 'antd'
import { 
  CheckCircleOutlined, 
  LaptopOutlined, 
  DatabaseOutlined, 
  CloudOutlined, 
  WifiOutlined, 
  AlertOutlined 
} from '@ant-design/icons'
import './SystemStatus.css'

const { Title, Text } = Typography

const SystemStatus: React.FC = () => {
  const systemStatus = {
    backend: 'online',
    database: 'online',
    redis: 'online',
    aiService: 'online',
    storage: 'online',
    apiResponse: 120, // ms
    cpuUsage: 35, // %
    memoryUsage: 45, // %
    diskUsage: 60, // %
    activeUsers: 12,
    recentRequests: 245
  }

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟加载系统状态
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const getStatusTag = (status: string) => {
    const config = {
      online: { color: 'green', text: '运行正常' },
      offline: { color: 'red', text: '离线' },
      warning: { color: 'orange', text: '警告' }
    }
    const { color, text } = config[status as keyof typeof config] || config.online
    return <Tag color={color}>{text}</Tag>
  }

  const serviceItems = [
    {
      name: '后端服务',
      status: systemStatus.backend,
      icon: <LaptopOutlined />,
      description: '核心业务逻辑服务'
    },
    {
      name: '数据库',
      status: systemStatus.database,
      icon: <DatabaseOutlined />,
      description: '数据存储服务'
    },
    {
      name: '缓存服务',
      status: systemStatus.redis,
      icon: <CloudOutlined />,
      description: 'Redis 缓存服务'
    },
    {
      name: 'AI 服务',
      status: systemStatus.aiService,
      icon: <CloudOutlined />,
      description: '智能分析服务'
    },
    {
      name: '存储服务',
      status: systemStatus.storage,
      icon: <CloudOutlined />,
      description: '文件存储服务'
    },
    {
      name: '网络连接',
      status: 'online',
      icon: <WifiOutlined />,
      description: '网络通信状态'
    }
  ]

  const performanceItems = [
    {
      name: 'API 响应时间',
      value: `${systemStatus.apiResponse}ms`,
      description: '平均响应时间',
      icon: '⏱️',
      color: '#1890ff'
    },
    {
      name: 'CPU 使用率',
      value: `${systemStatus.cpuUsage}%`,
      description: '服务器 CPU 负载',
      icon: '💻',
      color: '#fa8c16'
    },
    {
      name: '内存使用率',
      value: `${systemStatus.memoryUsage}%`,
      description: '服务器内存使用',
      icon: '🧠',
      color: '#52c41a'
    },
    {
      name: '磁盘使用率',
      value: `${systemStatus.diskUsage}%`,
      description: '存储磁盘使用',
      icon: '💾',
      color: '#722ed1'
    },
    {
      name: '活跃用户',
      value: systemStatus.activeUsers,
      description: '当前在线用户数',
      icon: '👥',
      color: '#ff4d4f'
    },
    {
      name: '最近请求',
      value: systemStatus.recentRequests,
      description: '最近 5 分钟请求数',
      icon: '📈',
      color: '#faad14'
    }
  ]

  const recentAlerts = [
    {
      id: 1,
      time: '10分钟前',
      level: 'info',
      message: '系统自动备份完成'
    },
    {
      id: 2,
      time: '30分钟前',
      level: 'warning',
      message: '磁盘使用率超过 60%'
    },
    {
      id: 3,
      time: '1小时前',
      level: 'info',
      message: 'AI 模型更新完成'
    },
    {
      id: 4,
      time: '2小时前',
      level: 'info',
      message: '新用户登录系统'
    }
  ]

  const getAlertTag = (level: string) => {
    const config = {
      info: { color: 'blue', text: '信息' },
      warning: { color: 'orange', text: '警告' },
      error: { color: 'red', text: '错误' }
    }
    const { color, text } = config[level as keyof typeof config] || config.info
    return <Tag color={color}>{text}</Tag>
  }

  if (loading) {
    return (
      <div className="system-status-loading">
        <Spin size="large" />
        <div className="loading-tip">加载系统状态...</div>
      </div>
    )
  }

  return (
    <div className="system-status">
      {/* 页面标题 */}
      <div className="page-header">
        <Title level={2} className="page-title">
          系统状态
        </Title>
        <Text className="page-subtitle">
          实时监控系统运行状态，确保服务正常运行
        </Text>
      </div>

      {/* 系统概览 */}
      <Row gutter={[24, 24]} className="overview-section">
        <Col xs={24} lg={12}>
          <Card className="overview-card">
            <Title level={4} className="card-title">
              服务状态
            </Title>
            <List
              dataSource={serviceItems}
              renderItem={(item) => (
                <List.Item className="service-item">
                  <div className="service-icon">{item.icon}</div>
                  <div className="service-info">
                    <div className="service-name">{item.name}</div>
                    <div className="service-description">{item.description}</div>
                  </div>
                  <div className="service-status">
                    {getStatusTag(item.status)}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="overview-card">
            <Title level={4} className="card-title">
              性能指标
            </Title>
            <Row gutter={[16, 16]}>
              {performanceItems.map((item, index) => (
                <Col xs={12} sm={8} key={index}>
                  <div className="performance-item">
                    <div className="performance-icon">{item.icon}</div>
                    <div className="performance-info">
                      <Text strong className="performance-value" style={{ color: item.color }}>
                        {item.value}
                      </Text>
                      <Text className="performance-name">{item.name}</Text>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 详细指标 */}
      <Row gutter={[24, 24]} className="details-section">
        <Col xs={24} lg={8}>
          <Card className="detail-card">
            <Title level={4} className="card-title">
              资源使用率
            </Title>
            <div className="resource-item">
              <div className="resource-header">
                <Text>CPU 使用率</Text>
                <Text>{systemStatus.cpuUsage}%</Text>
              </div>
              <Progress percent={systemStatus.cpuUsage} strokeColor="#fa8c16" />
            </div>
            <div className="resource-item">
              <div className="resource-header">
                <Text>内存使用率</Text>
                <Text>{systemStatus.memoryUsage}%</Text>
              </div>
              <Progress percent={systemStatus.memoryUsage} strokeColor="#52c41a" />
            </div>
            <div className="resource-item">
              <div className="resource-header">
                <Text>磁盘使用率</Text>
                <Text>{systemStatus.diskUsage}%</Text>
              </div>
              <Progress percent={systemStatus.diskUsage} strokeColor="#722ed1" />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="detail-card">
            <Title level={4} className="card-title">
              系统响应
            </Title>
            <div className="response-item">
              <div className="response-header">
                <Text>API 响应时间</Text>
                <Text>{systemStatus.apiResponse}ms</Text>
              </div>
              <Progress 
                percent={Math.min(systemStatus.apiResponse / 500 * 100, 100)} 
                strokeColor="#1890ff" 
              />
              <Text className="response-desc">
                响应时间在正常范围内
              </Text>
            </div>
            <div className="response-item">
              <div className="response-header">
                <Text>系统启动时间</Text>
                <Text>2026-04-11 08:30:00</Text>
              </div>
              <Text className="response-desc">
                系统已稳定运行 8 小时
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="detail-card">
            <Title level={4} className="card-title">
              最近告警
            </Title>
            <List
              dataSource={recentAlerts}
              renderItem={(item) => (
                <List.Item className="alert-item">
                  <div className="alert-time">{item.time}</div>
                  <div className="alert-content">
                    <div className="alert-message">{item.message}</div>
                    {getAlertTag(item.level)}
                  </div>
                </List.Item>
              )}
            />
            <Button type="link" className="view-all-button">
              查看全部告警
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 操作区域 */}
      <div className="action-section">
        <Card className="action-card">
          <Title level={4} className="card-title">
            系统操作
          </Title>
          <Space size="middle">
            <Button type="primary" icon={<LaptopOutlined />}>
              重启服务
            </Button>
            <Button icon={<DatabaseOutlined />}>
              数据库备份
            </Button>
            <Button icon={<CloudOutlined />}>
              清理缓存
            </Button>
            <Button icon={<AlertOutlined />}>
              查看日志
            </Button>
            <Button icon={<CheckCircleOutlined />}>
              健康检查
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  )
}

export default SystemStatus