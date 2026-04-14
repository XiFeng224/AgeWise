import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Spin, message, Empty, Space, Button, Tag } from 'antd'
import ReactECharts from 'echarts-for-react'
import axios from '../utils/axiosInstance'

const { Title } = Typography

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [ageDistribution, setAgeDistribution] = useState<any[]>([])
  const [healthStatus, setHealthStatus] = useState<any[]>([])
  const [riskDistribution, setRiskDistribution] = useState<any[]>([])
  const [serviceTrend, setServiceTrend] = useState<any>({ months: [], series: [] })
  const [riskPrediction, setRiskPrediction] = useState<any>({ dates: [], data: [] })
  const [monthlyReport, setMonthlyReport] = useState<any>(null)
  const [aiMetrics, setAiMetrics] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ageRes, healthRes, riskRes, serviceRes, predictionRes, reportRes, aiRes] = await Promise.all([
        axios.get('/statistics/age-distribution'),
        axios.get('/statistics/health-status'),
        axios.get('/statistics/risk-distribution'),
        axios.get('/statistics/service-trend'),
        axios.get('/statistics/predict-risk'),
        axios.get('/statistics/monthly-report'),
        axios.get('/system/ai-metrics')
      ])

      if (ageRes.data.success) setAgeDistribution(ageRes.data.data || [])
      if (healthRes.data.success) setHealthStatus(healthRes.data.data || [])
      if (riskRes.data.success) setRiskDistribution(riskRes.data.data || [])
      if (serviceRes.data.success) setServiceTrend(serviceRes.data.data || { months: [], series: [] })
      if (predictionRes.data.success) setRiskPrediction(predictionRes.data.data || { dates: [], data: [] })
      if (reportRes.data.success) setMonthlyReport(reportRes.data.data || null)
      if (aiRes.data.success) setAiMetrics(aiRes.data.data || null)
      setLastUpdated(new Date().toLocaleString())
    } catch (error) {
      console.error('加载统计数据失败:', error)
      message.error('加载统计数据失败，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const ageDistributionOption = {
    title: { text: '老人年龄分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '年龄分布',
      type: 'pie',
      radius: '50%',
      data: ageDistribution,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  const healthStatusOption = {
    title: { text: '健康状况分布', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: healthStatus.map(item => item.name) },
    yAxis: { type: 'value' },
    series: [{
      data: healthStatus.map(item => item.value),
      type: 'bar',
      itemStyle: {
        color: (params: any) => {
          const colors = ['#52c41a', '#1890ff', '#faad14', '#f5222d']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }

  const riskDistributionOption = {
    title: { text: '风险等级分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      name: '风险分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      data: riskDistribution
    }]
  }

  const serviceTrendOption = {
    title: { text: '服务趋势分析', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: (serviceTrend.series || []).map((s: any) => s.name) },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: serviceTrend.months || []
    },
    yAxis: { type: 'value' },
    series: serviceTrend.series || []
  }

  const riskPredictionOption = {
    title: { text: '风险预警预测', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: riskPrediction.dates || [] },
    yAxis: { type: 'value', name: '预警数量' },
    series: [{
      data: riskPrediction.data || [],
      type: 'line',
      smooth: true,
      itemStyle: { color: '#ff4d4f' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
            { offset: 1, color: 'rgba(255, 77, 79, 0.1)' }
          ]
        }
      }
    }]
  }

  const hasChartData = ageDistribution.length || healthStatus.length || riskDistribution.length || (serviceTrend.series || []).length

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <Title level={2} style={{ margin: 0 }}>数据统计分析</Title>
        <Space>
          {lastUpdated ? <Tag color="blue">最近更新：{lastUpdated}</Tag> : null}
          <Button onClick={loadData} loading={loading}>刷新数据</Button>
        </Space>
      </Space>

      <Spin spinning={loading}>
        {!loading && !hasChartData ? (
          <Card>
            <Empty description="暂无统计数据，请先录入老人档案、服务记录和预警数据" />
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}><Card><ReactECharts option={ageDistributionOption} style={{ height: 400 }} /></Card></Col>
              <Col span={12}><Card><ReactECharts option={healthStatusOption} style={{ height: 400 }} /></Card></Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}><Card><ReactECharts option={riskDistributionOption} style={{ height: 400 }} /></Card></Col>
              <Col span={12}><Card><ReactECharts option={serviceTrendOption} style={{ height: 400 }} /></Card></Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={24}><Card><ReactECharts option={riskPredictionOption} style={{ height: 400 }} /></Card></Col>
            </Row>
          </>
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title="AI能力评估指标">
              {aiMetrics ? (
                <Row gutter={16}>
                  <Col span={4}><Card size="small"><div>总查询</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.totalQueries}</div></Card></Col>
                  <Col span={4}><Card size="small"><div>有效回答</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.answeredQueries}</div></Card></Col>
                  <Col span={4}><Card size="small"><div>高风险命中</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.highRiskDetected}</div></Card></Col>
                  <Col span={4}><Card size="small"><div>准确率</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.accuracy}%</div></Card></Col>
                  <Col span={4}><Card size="small"><div>平均置信度</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.avgConfidence}%</div></Card></Col>
                  <Col span={4}><Card size="small"><div>兜底率</div><div style={{ fontSize: 20, fontWeight: 600 }}>{aiMetrics.fallbackRate}%</div></Card></Col>
                </Row>
              ) : (
                <Empty description="暂无AI评估指标" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="月度统计报告">
              <div style={{ padding: 16 }}>
                {monthlyReport ? (
                  <>
                    <h3>{monthlyReport.month} 社区养老服务统计报告</h3>
                    <p><strong>服务概况：</strong>本月共服务老人 {monthlyReport.elderlyCount} 人，完成上门服务 {monthlyReport.serviceBreakdown?.['上门服务'] || 0} 次，健康检查 {monthlyReport.serviceBreakdown?.['健康检查'] || 0} 次，紧急处理 {monthlyReport.serviceBreakdown?.['紧急处理'] || 0} 次。</p>
                    <p><strong>风险预警：</strong>系统共发出预警 {monthlyReport.warningCount} 次，其中高风险 {monthlyReport.warningBreakdown?.['高风险'] || 0} 次，中风险 {monthlyReport.warningBreakdown?.['中风险'] || 0} 次，低风险 {monthlyReport.warningBreakdown?.['低风险'] || 0} 次。</p>
                    <p><strong>服务满意度：</strong>本月服务满意度达到 {monthlyReport.satisfactionRate}% 。</p>
                    <p><strong>重点关注：</strong>高风险老人 {monthlyReport.highRiskCount} 人，需要重点关注和定期随访。</p>
                  </>
                ) : (
                  <Empty description="暂无月度报告数据" />
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

export default Statistics
