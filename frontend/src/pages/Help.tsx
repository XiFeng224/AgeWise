import React, { useState } from 'react'
import { Row, Col, Card, Typography, Tabs, List, Tag, Button, Space, Input, Select, Spin } from 'antd'
import { 
  QuestionCircleOutlined, 
  BookOutlined, 
  VideoCameraOutlined, 
  MessageOutlined, 
  SearchOutlined, 
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import './Help.css'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { Search } = Input
const { Option } = Select

const Help: React.FC = () => {
  const [activeTab, setActiveTab] = useState('faq')
  const [searchValue, setSearchValue] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(false)

  // 常见问题数据
  const faqData = [
    {
      id: 1,
      title: '如何添加新的老人信息？',
      category: '老人管理',
      content: '在左侧菜单栏点击「老人管理」，然后点击「添加老人」按钮，填写老人的基本信息、健康状况等详细信息，最后点击「保存」按钮即可。',
      views: 125,
      updatedAt: '2026-04-10'
    },
    {
      id: 2,
      title: '如何查看老人的健康档案？',
      category: '健康管理',
      content: '在左侧菜单栏点击「健康档案」，在老人列表中选择需要查看的老人，点击「查看详情」即可查看该老人的健康档案，包括体检记录、用药记录等。',
      views: 98,
      updatedAt: '2026-04-09'
    },
    {
      id: 3,
      title: '如何处理风险预警？',
      category: '风险预警',
      content: '当系统出现风险预警时，在首页或「风险预警」页面会显示预警信息。点击预警信息可以查看详细情况，然后根据预警类型采取相应的处理措施，处理完成后点击「标记为已处理」。',
      views: 156,
      updatedAt: '2026-04-08'
    },
    {
      id: 4,
      title: '如何使用总控Agent功能？',
      category: '智能服务',
      content: '在左侧菜单栏点击「总控Agent」，进入总控工作台。系统会自动分析老人数据并生成任务卡片，您可以查看任务详情、执行任务操作，以及查看AI生成的决策建议。',
      views: 87,
      updatedAt: '2026-04-07'
    },
    {
      id: 5,
      title: '如何导出统计报表？',
      category: '统计分析',
      content: '在左侧菜单栏点击「统计分析」，选择需要导出的报表类型和时间范围，然后点击「导出」按钮，系统会生成Excel格式的报表并自动下载。',
      views: 65,
      updatedAt: '2026-04-06'
    }
  ]

  // 教程视频数据
  const videoData = [
    {
      id: 1,
      title: '系统基础操作教程',
      category: '系统操作',
      duration: '05:30',
      views: 234,
      url: '#',
      thumbnail: '🎬'
    },
    {
      id: 2,
      title: '老人信息管理教程',
      category: '老人管理',
      duration: '08:20',
      views: 189,
      url: '#',
      thumbnail: '👴'
    },
    {
      id: 3,
      title: '风险预警处理教程',
      category: '风险预警',
      duration: '06:45',
      views: 212,
      url: '#',
      thumbnail: '⚠️'
    },
    {
      id: 4,
      title: '总控Agent使用教程',
      category: '智能服务',
      duration: '10:15',
      views: 156,
      url: '#',
      thumbnail: '🤖'
    }
  ]

  // 常见问题分类
  const categories = [
    { value: 'all', label: '全部分类' },
    { value: '老人管理', label: '老人管理' },
    { value: '健康管理', label: '健康管理' },
    { value: '风险预警', label: '风险预警' },
    { value: '智能服务', label: '智能服务' },
    { value: '统计分析', label: '统计分析' },
    { value: '系统操作', label: '系统操作' }
  ]

  // 过滤常见问题
  const filteredFaq = faqData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchValue.toLowerCase()) || 
                         item.content.toLowerCase().includes(searchValue.toLowerCase())
    const matchesCategory = category === 'all' || item.category === category
    return matchesSearch && matchesCategory
  })

  // 模拟搜索加载
  const handleSearch = (value: string) => {
    setSearchValue(value)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }

  return (
    <div className="help-center">
      {/* 页面标题 */}
      <div className="page-header">
        <Title level={2} className="page-title">
          帮助中心
        </Title>
        <Text className="page-subtitle">
          常见问题解答、操作教程和技术支持
        </Text>
      </div>

      {/* 搜索区域 */}
      <div className="search-section">
        <Card className="search-card">
          <div className="search-content">
            <div className="search-icon">
              <QuestionCircleOutlined />
            </div>
            <div className="search-input">
              <Search
                placeholder="搜索问题或关键词"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                onChange={(e) => setSearchValue(e.target.value)}
                value={searchValue}
              />
            </div>
            <div className="search-category">
              <Select
                defaultValue="all"
                style={{ width: 160 }}
                onChange={setCategory}
              >
                {categories.map(cat => (
                  <Option key={cat.value} value={cat.value}>
                    {cat.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* 内容区域 */}
      <div className="content-section">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="help-tabs"
        >
          {/* 常见问题 */}
          <TabPane tab={<><QuestionCircleOutlined /> 常见问题</>} key="faq">
            <div className="faq-section">
              {loading ? (
                <div className="loading-container">
                  <Spin size="large" tip="搜索中..." />
                </div>
              ) : filteredFaq.length > 0 ? (
                <List
                  dataSource={filteredFaq}
                  renderItem={(item) => (
                    <Card className="faq-card">
                      <div className="faq-header">
                        <Title level={5} className="faq-title">
                          {item.title}
                        </Title>
                        <Tag color="orange" className="faq-category">
                          {item.category}
                        </Tag>
                      </div>
                      <Paragraph className="faq-content">
                        {item.content}
                      </Paragraph>
                      <div className="faq-footer">
                        <div className="faq-meta">
                          <Text className="faq-views">
                            <ClockCircleOutlined /> {item.views} 次查看
                          </Text>
                          <Text className="faq-date">
                            更新于 {item.updatedAt}
                          </Text>
                        </div>
                        <Button type="link" className="faq-button">
                          查看详情 <ArrowRightOutlined />
                        </Button>
                      </div>
                    </Card>
                  )}
                />
              ) : (
                <div className="empty-container">
                  <Text className="empty-text">
                    未找到相关问题，请尝试其他关键词
                  </Text>
                </div>
              )}
            </div>
          </TabPane>

          {/* 教程视频 */}
          <TabPane tab={<><VideoCameraOutlined /> 教程视频</>} key="videos">
            <Row gutter={[24, 24]} className="videos-section">
              {videoData.map((video) => (
                <Col xs={24} sm={12} md={8} key={video.id}>
                  <Card className="video-card" hoverable>
                    <div className="video-thumbnail">
                      <div className="thumbnail-icon">{video.thumbnail}</div>
                      <div className="video-duration">{video.duration}</div>
                    </div>
                    <div className="video-info">
                      <Title level={5} className="video-title">
                        {video.title}
                      </Title>
                      <Tag color="blue" className="video-category">
                        {video.category}
                      </Tag>
                      <div className="video-meta">
                        <Text className="video-views">
                          {video.views} 次观看
                        </Text>
                      </div>
                      <Button type="primary" className="video-button">
                        观看视频
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          {/* 联系支持 */}
          <TabPane tab={<><MessageOutlined /> 联系支持</>} key="support">
            <Card className="support-card">
              <Title level={4} className="support-title">
                联系技术支持
              </Title>
              <Paragraph className="support-desc">
                如果您在使用过程中遇到问题，可以通过以下方式联系我们的技术支持团队：
              </Paragraph>
              
              <div className="support-methods">
                <div className="support-method">
                  <div className="support-icon">
                    <MessageOutlined />
                  </div>
                  <div className="support-info">
                    <Text strong>在线客服</Text>
                    <Text className="support-desc">工作日 9:00-18:00</Text>
                    <Button type="primary" className="support-button">
                      立即咨询
                    </Button>
                  </div>
                </div>
                
                <div className="support-method">
                  <div className="support-icon">
                    <BookOutlined />
                  </div>
                  <div className="support-info">
                    <Text strong>邮件支持</Text>
                    <Text className="support-desc">support@zhiyuyinling.com</Text>
                    <Button className="support-button">
                      发送邮件
                    </Button>
                  </div>
                </div>
                
                <div className="support-method">
                  <div className="support-icon">
                    <CheckCircleOutlined />
                  </div>
                  <div className="support-info">
                    <Text strong>提交工单</Text>
                    <Text className="support-desc">24小时内响应</Text>
                    <Button className="support-button">
                      提交工单
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="support-faq">
                <Text strong className="support-faq-title">
                  常见问题快速链接
                </Text>
                <Space direction="vertical" className="support-faq-links">
                  <a href="#" className="faq-link">如何重置密码？</a>
                  <a href="#" className="faq-link">系统运行缓慢怎么办？</a>
                  <a href="#" className="faq-link">如何更新老人信息？</a>
                  <a href="#" className="faq-link">预警信息如何设置？</a>
                </Space>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </div>

      {/* 底部区域 */}
      <div className="bottom-section">
        <Card className="bottom-card">
          <div className="bottom-content">
            <div className="bottom-left">
              <Text strong className="bottom-title">智护银龄 - 帮助中心</Text>
              <Text className="bottom-desc">
                如有其他问题，请随时联系我们的技术支持团队
              </Text>
            </div>
            <div className="bottom-right">
              <Button type="primary" className="bottom-button">
                反馈问题
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Help