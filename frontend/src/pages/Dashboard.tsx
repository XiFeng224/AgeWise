import React, { useMemo } from 'react'
import { Row, Col, Card, Statistic, Typography, Button, Space, Alert, Timeline, Tag, Progress, Modal } from 'antd'
import {
  RobotOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DashboardOutlined,
  BarChartOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const openIntro = () => {
    Modal.info({
      title: '银龄智护 Agent 平台简介',
      width: 720,
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <p>这是一个面向社区养老场景的 Agent 平台，核心不是单纯查询数据，而是持续感知、分析、预警、决策、执行并追踪闭环。</p>
          <p><strong>平台能力：</strong>主动感知门磁/水表/床垫等设备数据，结合健康指标、服务记录和预警记录，自动生成风险分析与处置建议。</p>
          <p><strong>典型流程：</strong>数据感知 → 风险分析 Agent → 风险预警 Agent → 运行台生成任务 → 指挥中心调度 → 结果回写与复盘。</p>
          <p><strong>适用角色：</strong>老人、家属、社区医生、网格员、管理者。</p>
        </div>
      ),
      okText: '知道了'
    })
  }

  const kpi = useMemo(() => ({
    todayPlans: 26,
    autoExecutionRate: 84,
    successRate: 92,
    avgResponseSeconds: 6.8,
    unresolvedTasks: 4,
    highRiskCases: 9
  }), [])

  const latestRuns = useMemo(() => ([
    { id: 'A-20260414-01', status: 'success', scene: '高血压告警', result: '已派单并通知家属', traceId: 'trace-demo-001' },
    { id: 'A-20260414-02', status: 'success', scene: '跌倒风险', result: '已生成复测计划', traceId: 'trace-demo-002' },
    { id: 'A-20260414-03', status: 'failed', scene: '随访中断', result: '通知失败，需人工确认', traceId: 'trace-demo-003' }
  ]), [])

  const statusTag = (status: string) => {
    if (status === 'success') return <Tag color="success">成功</Tag>
    if (status === 'running') return <Tag color="processing">执行中</Tag>
    return <Tag color="error">失败</Tag>
  }

  const missionProgress = 86

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <Title level={2} className="welcome-title">银龄智护 Agent 平台</Title>
            <Text className="welcome-subtitle">面向社区养老的数据分析、主动预警与任务闭环智能体平台</Text>
            <Text className="welcome-desc">
              这是一个以 Agent 为核心的养老业务系统：持续感知数据、分析风险、生成建议、调度任务并回写结果，形成可解释、可执行、可追踪的闭环。
            </Text>
            <Space style={{ marginTop: 12 }} wrap>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => navigate('/agent/vnext')}>
                进入 Agent 运行台
              </Button>
              <Button icon={<RobotOutlined />} onClick={() => navigate('/agent/command')}>
                进入 Agent 指挥中心
              </Button>
              <Button onClick={openIntro}>查看平台简介</Button>
            </Space>
          </div>
          <div className="welcome-image">
            <div className="welcome-icon">🤖</div>
          </div>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 18, background: 'linear-gradient(135deg, #f5f8ff 0%, #eef7f1 100%)' }} variant="borderless">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space wrap>
                <Tag color="blue">感知</Tag>
                <Tag color="gold">规划</Tag>
                <Tag color="green">行动</Tag>
                <Tag color="purple">记忆</Tag>
                <Tag color="cyan">运行中</Tag>
              </Space>
              <Text strong>Agent 门户已启动：感知数据 → 风险分析 Agent → 计划生成 → 任务执行 → 结果追踪</Text>
              <Progress percent={missionProgress} size="small" strokeColor="#4f79a7" />
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="当前会话状态" style={{ borderRadius: 18 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="processing">任务运行中</Tag>
              <Text type="secondary">这是一个面向社区养老数据分析与主动预警的智能体门户，而不是传统管理首页。</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Alert
        showIcon
        type="success"
        style={{ marginBottom: 16 }}
        message="推荐演示路径：首页（Agent 平台门户）→ 风险分析 Agent → 一键生成 Agent 任务 → 运行台执行闭环 → 主动预警复盘"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 18 }}>
            <Space direction="vertical" size={6}>
              <Tag color="blue">核心价值1</Tag>
              <Text strong>主动感知</Text>
              <Text type="secondary">门磁、水表、床垫与健康数据联动，异常自动触发预警。</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 18 }}>
            <Space direction="vertical" size={6}>
              <Tag color="gold">核心价值2</Tag>
              <Text strong>可解释分析</Text>
              <Text type="secondary">输出风险分、趋势、异常依据与责任人建议，便于一线执行。</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 18 }}>
            <Space direction="vertical" size={6}>
              <Tag color="green">核心价值3</Tag>
              <Text strong>闭环执行</Text>
              <Text type="secondary">一键生成任务、派单、通知与回写复盘，形成完整运营闭环。</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 18 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="processing">运行中 Agent 门户</Tag>
              <Text strong>当前策略：自动感知 → 风险评估 → 计划建议 → 工具执行 → 结果回写</Text>
              <Progress percent={missionProgress} strokeColor="#4f79a7" />
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card><Statistic title="今日规划任务" value={kpi.todayPlans} prefix={<RobotOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card><Statistic title="执行成功率" value={kpi.successRate} suffix="%" prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card><Statistic title="平均响应时长" value={kpi.avgResponseSeconds} suffix="秒" prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card><Statistic title="未闭环任务" value={kpi.unresolvedTasks} prefix={<WarningOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card><Statistic title="高风险个案" value={kpi.highRiskCases} prefix={<UserOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="Agent执行闭环" style={{ borderRadius: 18 }}>
            <Timeline
              items={[
                { color: 'blue', children: '1) 任务理解：识别风险等级、模块与目标人群' },
                { color: 'blue', children: '2) 计划生成：形成10分钟/30分钟/2小时/24小时行动清单' },
                { color: 'green', children: '3) 工具执行：创建派单、通知家属、写入时间线' },
                { color: 'green', children: '4) 结果追踪：回填满意度、复发率、超时率并用于策略更新' }
              ]}
            />
            <Button type="primary" block onClick={() => navigate('/agent/vnext')}>去执行一个完整Agent任务</Button>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="最近Agent任务回执" style={{ borderRadius: 18 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {latestRuns.map((run) => (
                <Card key={run.id} size="small">
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space direction="vertical" size={2}>
                        <Text strong>{run.id} · {run.scene}</Text>
                        <Text type="secondary">结果：{run.result}</Text>
                        <Text type="secondary">traceId：{run.traceId}</Text>
                      </Space>
                    </Col>
                    <Col>{statusTag(run.status)}</Col>
                  </Row>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card hoverable style={{ borderRadius: 18 }} onClick={() => navigate('/agent/vnext')}>
            <Space>
              <RobotOutlined />
              <Text strong>Agent分析执行</Text>
            </Space>
            <div><Text type="secondary">最核心入口：规划、执行、追踪、导出</Text></div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable style={{ borderRadius: 18 }} onClick={() => navigate('/agent/command')}>
            <Space>
              <DashboardOutlined />
              <Text strong>Agent指挥中心</Text>
            </Space>
            <div><Text type="secondary">多角色协同调度与任务编排</Text></div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable style={{ borderRadius: 18 }} onClick={() => navigate('/statistics')}>
            <Space>
              <BarChartOutlined />
              <Text strong>数据分析底座</Text>
            </Space>
            <div><Text type="secondary">为Agent提供指标与历史趋势支持</Text></div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
