import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, List, Tag, Progress, Typography, Button, Space } from 'antd'
import axios from '../utils/axiosInstance'
import { 
  UserOutlined, 
  WarningOutlined, 
  SafetyOutlined, 
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HeartOutlined,
  BellOutlined,
  BarChartOutlined,
  RobotOutlined
} from '@ant-design/icons'
import './Dashboard.css'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState({
    totalElderly: 156,
    todayWarnings: 8,
    pendingWarnings: 11,
    highRiskElderly: 12
  })

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get('/statistics/dashboard')
        if (response.data?.success && response.data?.data) {
          setDashboardStats(response.data.data)
        }
      } catch (error) {
        console.error('获取仪表盘统计失败，使用默认演示数据:', error)
      }
    }

    fetchDashboard()
  }, [])

  const statisticsData = [
    {
      title: '在册老人总数',
      value: dashboardStats.totalElderly,
      prefix: <UserOutlined />,
      valueStyle: { color: '#ff7a45' },
      suffix: <ArrowUpOutlined />,
      description: '较上月增加5人',
      icon: '👴'
    },
    {
      title: '今日预警数量',
      value: dashboardStats.todayWarnings,
      prefix: <WarningOutlined />,
      valueStyle: { color: '#ff4d4f' },
      description: '较昨日减少2次',
      icon: '⚠️'
    },
    {
      title: '待处理预警',
      value: dashboardStats.pendingWarnings,
      prefix: <SafetyOutlined />,
      valueStyle: { color: '#fa8c16' },
      description: '其中3个紧急',
      icon: '🛎️'
    },
    {
      title: '高风险老人',
      value: dashboardStats.highRiskElderly,
      prefix: <TeamOutlined />,
      valueStyle: { color: '#faad14' },
      suffix: <ArrowDownOutlined />,
      description: '较上周减少2人',
      icon: '📊'
    },
  ]

  const recentWarnings = [
    {
      id: 1,
      name: '张大爷',
      type: '健康异常',
      level: 'high',
      time: '10分钟前',
      description: '血压连续3次异常',
    },
    {
      id: 2,
      name: '李奶奶',
      type: '出入异常',
      level: 'medium',
      time: '1小时前',
      description: '48小时无出入记录',
    },
    {
      id: 3,
      name: '王爷爷',
      type: '季节提醒',
      level: 'low',
      time: '2小时前',
      description: '寒潮天气注意保暖',
    },
  ]

  const quickAccessItems = [
    {
      title: '老人管理',
      icon: <UserOutlined />,
      color: '#ff7a45',
      link: '/elderly',
      description: '管理老人信息'
    },
    {
      title: '风险预警',
      icon: <WarningOutlined />,
      color: '#ff4d4f',
      link: '/risk',
      description: '查看预警信息'
    },
    {
      title: '健康档案',
      icon: <HeartOutlined />,
      color: '#52c41a',
      link: '/health',
      description: '查看健康记录'
    },
    {
      title: '统计分析',
      icon: <BarChartOutlined />,
      color: '#1890ff',
      link: '/statistics',
      description: '数据分析报表'
    },
    {
      title: '总控Agent',
      icon: <RobotOutlined />,
      color: '#722ed1',
      link: '/agent',
      description: '智能调度中心'
    },
    {
      title: '通知中心',
      icon: <BellOutlined />,
      color: '#faad14',
      link: '/notifications',
      description: '查看通知消息'
    },
  ]

  const getRiskLevelTag = (level: string) => {
    const config = {
      high: { color: 'red', text: '紧急' },
      medium: { color: 'orange', text: '较重' },
      low: { color: 'green', text: '一般' },
    }
    const { color, text } = config[level as keyof typeof config]
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <div className="dashboard">
      {/* 欢迎区域 */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <Title level={2} className="welcome-title">欢迎使用智护银龄</Title>
            <Text className="welcome-subtitle">社区智慧养老云平台</Text>
            <Text className="welcome-desc">
              实时监控老人状态，智能预警风险，为老年人提供全方位的关爱与服务
            </Text>
          </div>
          <div className="welcome-image">
            <div className="welcome-icon">🏠</div>
          </div>
        </div>
      </div>

      {/* 统计卡片区域 */}
      <Row gutter={[24, 24]} className="stats-section">
        {statisticsData.map((item, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className="stat-card">
              <div className="stat-card-header">
                <span className="stat-icon">{item.icon}</span>
                <Text className="stat-description">{item.description}</Text>
              </div>
              <Statistic
                title={item.title}
                value={item.value}
                precision={0}
                valueStyle={item.valueStyle}
                prefix={item.prefix}
                suffix={item.suffix}
                className="stat-value"
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快捷入口区域 */}
      <div className="quick-access-section">
        <Title level={4} className="section-title">快捷入口</Title>
        <Row gutter={[24, 24]}>
          {quickAccessItems.map((item, index) => (
            <Col xs={24} sm={12} md={8} lg={4} key={index}>
              <Card className="quick-access-card" hoverable>
                <a 
                  href={item.link} 
                  className="quick-access-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = item.link;
                  }}
                >
                  <div className="quick-access-icon" style={{ backgroundColor: `${item.color}20` }}>
                    <div style={{ color: item.color }}>{item.icon}</div>
                  </div>
                  <div className="quick-access-content">
                    <Text strong className="quick-access-title">{item.title}</Text>
                    <Text className="quick-access-desc">{item.description}</Text>
                  </div>
                </a>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 预警和风险分布区域 */}
      <Row gutter={[24, 24]} className="info-section">
        <Col xs={24} lg={12}>
          <Card className="info-card">
            <div className="card-header">
              <Text strong className="card-title">最新预警</Text>
              <a 
                href="/risk" 
                className="card-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/risk';
                }}
              >
                查看全部
              </a>
            </div>
            <List
              dataSource={recentWarnings}
              renderItem={(item) => (
                <List.Item className="warning-item">
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                    title={
                      <div className="warning-item-title">
                        <span className="warning-name">{item.name}</span>
                        {getRiskLevelTag(item.level)}
                      </div>
                    }
                    description={
                      <div className="warning-item-desc">
                        <div className="warning-description">{item.description}</div>
                        <div className="warning-time">{item.time}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="info-card">
            <div className="card-header">
              <Text strong className="card-title">风险分布统计</Text>
            </div>
            <div className="risk-distribution">
              <div className="risk-item">
                <div className="risk-header">
                  <span className="risk-name">高风险老人</span>
                  <span className="risk-value">12人 (8%)</span>
                </div>
                <Progress percent={8} strokeColor="#ff4d4f" className="risk-progress" />
              </div>
              <div className="risk-item">
                <div className="risk-header">
                  <span className="risk-name">中风险老人</span>
                  <span className="risk-value">24人 (15%)</span>
                </div>
                <Progress percent={15} strokeColor="#fa8c16" className="risk-progress" />
              </div>
              <div className="risk-item">
                <div className="risk-header">
                  <span className="risk-name">低风险老人</span>
                  <span className="risk-value">120人 (77%)</span>
                </div>
                <Progress percent={77} strokeColor="#52c41a" className="risk-progress" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 底部区域 */}
      <div className="bottom-section">
        <Card className="bottom-card">
          <div className="bottom-content">
            <div className="bottom-left">
              <Text strong className="bottom-title">智护银龄 - 社区智慧养老云平台</Text>
              <Text className="bottom-desc">
                致力于为老年人提供更智能、更贴心的养老服务
              </Text>
            </div>
            <div className="bottom-right">
              <Space>
                <Button 
                  type="primary" 
                  className="bottom-button"
                  onClick={() => window.location.href = '/system-status'}
                >
                  查看系统状态
                </Button>
                <Button 
                  className="bottom-button"
                  onClick={() => window.location.href = '/help'}
                >
                  帮助中心
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard