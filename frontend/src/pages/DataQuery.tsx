import React, { useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { 
  Card, 
  Input, 
  Button, 
  Table, 
  Space, 
  message, 
  Spin,
  Row, 
  Col,
  Typography,
  Alert,
  Tag,
  Select,
  DatePicker,
  Form,
  Progress,
  Switch
} from 'antd'
import { SendOutlined, ClearOutlined, ExportOutlined, FilterOutlined, RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '../utils/axiosInstance'

const { TextArea } = Input
const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface QueryResult {
  id: number
  name: string
  age: number
  gender: string
  phone: string
  address: string
  healthStatus: string
  riskLevel: string
}

interface Explainability {
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number
  riskScore: number
  factors: string[]
  factorWeights: { name: string; weight: number }[]
  recommendedActions: string[]
}

const DataQuery: React.FC = () => {
  const navigate = useNavigate()
  const [queryText, setQueryText] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([])
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [recentSessions, setRecentSessions] = useState<Array<{ query: string; answer: string; traceId: string; escalate: boolean }>>([])

  const [summary, setSummary] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [explainability, setExplainability] = useState<Explainability | null>(null)
  const [responseMode, setResponseMode] = useState<'demo' | 'live' | ''>('')
  const [modelSource, setModelSource] = useState<'qwen' | 'nlp' | 'rule' | 'deepseek' | 'moonshot' | ''>('')
  const [latencyMs, setLatencyMs] = useState<number>(0)
  const [answer, setAnswer] = useState<string>('')
  const [shouldEscalate, setShouldEscalate] = useState(false)
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [recentAnswer, setRecentAnswer] = useState<string>('')
  const [recentTrace, setRecentTrace] = useState<string>('')
  const [deepThink, setDeepThink] = useState(true)
  const [searchMode, setSearchMode] = useState(true)
  const [modelPreference, setModelPreference] = useState<'auto' | 'qwen' | 'deepseek' | 'moonshot' | 'nlp' | 'rule'>('auto')

  // 高级搜索条件
  const [advancedFilters, setAdvancedFilters] = useState({
    ageRange: null as any,
    gender: '',
    healthStatus: '',
    riskLevel: '',
    address: ''
  })

  // 获取查询建议
  const handleGetSuggestions = async (input: string) => {
    if (input.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await axios.get('/query/suggestions', {
        params: { input }
      })

      if (response.data.success) {
        setSuggestions(response.data.data || [])
      }
    } catch (error) {
      console.error('获取查询建议失败:', error)
    }
  }

  const isNetworkError = (error: unknown) => {
    const err = error as AxiosError
    return !err.response
  }

  // 处理自然语言查询
  const handleNaturalLanguageQuery = async () => {
    if (!queryText.trim()) {
      message.warning('请输入查询内容')
      return
    }

    setLoading(true)
    
    try {
      // 调用Agent服务进行自然语言解析
      const response = await axios.post('/query/natural', {
        query: queryText,
        modelPreference,
        deepThink,
        searchMode
      })

      if (response.data.success) {
        setSqlQuery(response.data.sql)
        setResults(response.data.data || [])
        setSummary(response.data.summary || '')
        setExplainability(response.data.explainability || null)
        setResponseMode(response.data.mode || '')
        setModelSource(response.data.modelSource || '')
        setLatencyMs(Number(response.data.latencyMs || 0))
        setAnswer(response.data.answer || '')
        setShouldEscalate(Boolean(response.data.shouldEscalate))
        setSuggestedActions(Array.isArray(response.data.suggestedAction) ? response.data.suggestedAction : [])
        setRecentAnswer(response.data.answer || response.data.summary || '')
        setRecentTrace(response.data.traceId || '')
        const sessionSnapshot = {
          query: queryText,
          answer: response.data.answer || response.data.summary || '',
          traceId: response.data.traceId || '',
          escalate: Boolean(response.data.shouldEscalate)
        }
        localStorage.setItem('agent_query_context', JSON.stringify({
          ...sessionSnapshot,
          suggestedAction: Array.isArray(response.data.suggestedAction) ? response.data.suggestedAction : []
        }))
        setRecentSessions((prev) => [sessionSnapshot, ...prev].slice(0, 3))
        
        // 保存查询历史
        setQueryHistory((prev: string[]) => [queryText, ...prev.slice(0, 4)])
        
        message.success(`查询成功，${response.data.summary}`)
      } else {
        message.error(response.data.error || '查询解析失败')
      }
    } catch (error) {
      console.error('查询失败:', error)
      if (isNetworkError(error)) {
        message.warning('网络异常，已切换到本地兜底查询结果')
        handleFallbackQuery(queryText)
      } else {
        const err = error as AxiosError<{ error?: string }>
        message.error(err.response?.data?.error || '查询失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  // 处理高级搜索
  const handleAdvancedSearch = async () => {
    setLoading(true)
    
    try {
      // 调用高级搜索API
      const response = await axios.post('/query/advanced', {
        filters: advancedFilters
      })

      if (response.data.success) {
        setSqlQuery(response.data.sql)
        setResults(response.data.data || [])
        setSummary(response.data.summary || '')
        
        message.success(`高级搜索成功，${response.data.summary}`)
      } else {
        message.error(response.data.error || '搜索失败')
      }
    } catch (error) {
      console.error('高级搜索失败:', error)
      if (isNetworkError(error)) {
        message.warning('网络异常，已切换到本地兜底高级搜索结果')
        handleFallbackAdvancedSearch(advancedFilters)
      } else {
        const err = error as AxiosError<{ error?: string }>
        message.error(err.response?.data?.error || '高级搜索失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  // 降级查询处理
  const handleFallbackQuery = (text: string) => {
    let fallbackSql = ''
    let mockResults: QueryResult[] = []

    if (text.includes('老人') && text.includes('数量')) {
      fallbackSql = 'SELECT COUNT(*) as count FROM elderly'
      mockResults = []
    } else if (text.includes('独居') || text.includes('独居老人')) {
      fallbackSql = 'SELECT * FROM elderly WHERE is_alone = true'
      mockResults = [
        {
          id: 1,
          name: '张大爷',
          age: 78,
          gender: '男',
          phone: '13800000001',
          address: '幸福小区1栋101',
          healthStatus: '良好',
          riskLevel: '一般'
        }
      ]
    } else if (text.includes('高血压') || text.includes('血压')) {
      fallbackSql = 'SELECT * FROM health_records WHERE condition LIKE "%高血压%"'
      mockResults = [
        {
          id: 2,
          name: '李奶奶',
          age: 82,
          gender: '女',
          phone: '13800000002',
          address: '阳光小区2栋202',
          healthStatus: '一般',
          riskLevel: '较重'
        }
      ]
    } else {
      fallbackSql = 'SELECT * FROM elderly LIMIT 10'
      mockResults = generateMockData()
    }

    setSqlQuery(fallbackSql)
    setResults(mockResults)
    setQueryHistory(prev => [text, ...prev.slice(0, 4)])
    setRecentSessions(prev => [{ query: text, answer: '本地兜底结果已生成', traceId: '', escalate: false }, ...prev].slice(0, 3))
  }

  // 降级高级搜索处理
  const handleFallbackAdvancedSearch = (filters: any) => {
    let mockResults = generateMockData()
    
    // 根据筛选条件过滤数据
    if (filters.gender) {
      mockResults = mockResults.filter(item => item.gender === filters.gender)
    }
    
    if (filters.healthStatus) {
      mockResults = mockResults.filter(item => item.healthStatus === filters.healthStatus)
    }
    
    if (filters.riskLevel) {
      mockResults = mockResults.filter(item => item.riskLevel === filters.riskLevel)
    }
    
    if (filters.address) {
      mockResults = mockResults.filter(item => item.address.includes(filters.address))
    }
    
    setResults(mockResults)
    setSqlQuery('SELECT * FROM elderly WHERE [筛选条件]')
  }

  // 生成模拟数据
  const generateMockData = (): QueryResult[] => {
    return [
      {
        id: 1,
        name: '张大爷',
        age: 78,
        gender: '男',
        phone: '13800000001',
        address: '幸福小区1栋101',
        healthStatus: '良好',
        riskLevel: '一般'
      },
      {
        id: 2,
        name: '李奶奶',
        age: 82,
        gender: '女',
        phone: '13800000002',
        address: '阳光小区2栋202',
        healthStatus: '一般',
        riskLevel: '较重'
      },
      {
        id: 3,
        name: '王爷爷',
        age: 75,
        gender: '男',
        phone: '13800000003',
        address: '和谐小区3栋303',
        healthStatus: '良好',
        riskLevel: '一般'
      },
      {
        id: 4,
        name: '赵奶奶',
        age: 85,
        gender: '女',
        phone: '13800000004',
        address: '平安小区4栋404',
        healthStatus: '较差',
        riskLevel: '紧急'
      }
    ]
  }

  // 清空查询
  const handleClear = () => {
    setQueryText('')
    setSqlQuery('')
    setResults([])
    setSummary('')
    setExplainability(null)
    setResponseMode('')
    setModelSource('')
    setAnswer('')
    setRecentAnswer('')
    setRecentTrace('')
    setShouldEscalate(false)
    setSuggestedActions([])
    setAdvancedFilters({
      ageRange: null,
      gender: '',
      healthStatus: '',
      riskLevel: '',
      address: ''
    })
  }

  // 导出数据
  const handleExport = () => {
    if (results.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    const csvContent = [
      Object.keys(results[0]).join(','),
      ...results.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `查询结果_${new Date().getTime()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    message.success('数据导出成功')
  }

  // 表格列定义（支持动态字段）
  const columns = useMemo(() => {
    if (!results.length) {
      return [
        { title: '姓名', dataIndex: 'name', key: 'name' },
        { title: '年龄', dataIndex: 'age', key: 'age' },
        { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel' }
      ]
    }

    const first = results[0] as Record<string, any>
    return Object.keys(first).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: any) => {
        if (key.toLowerCase().includes('risk') || key === 'riskLevel') {
          const text = String(value ?? '')
          const color = text.includes('high') || text.includes('紧急') ? 'red' : text.includes('medium') || text.includes('较重') ? 'orange' : 'green'
          return <Tag color={color}>{text}</Tag>
        }
        if (value === null || value === undefined) return '-'
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      }
    }))
  }, [results])

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>智能数据查询</Title>
      
      <Alert
        message="提示：支持问答优先的自然语言查询，如'张大爷血压高怎么办'或'80岁以上独居老人有哪些'"
        description="系统会先给出回答，再判断是否需要升级为任务处理。"
        type="info"
        style={{ marginBottom: '16px' }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 16, background: 'linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%)' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="processing">Agent 问答入口</Tag>
                <Tag color="blue">先回答</Tag>
                <Tag color="gold">再判断</Tag>
                <Tag color="green">再升级</Tag>
              </Space>
              <Title level={4} style={{ margin: 0 }}>面向养老场景的问题理解与任务路由</Title>
              <Text type="secondary">这不是普通搜索框，而是一个会先回答、再决定是否升级为任务的智能体入口。</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="最近问答 / 任务状态" style={{ borderRadius: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>最近问答</Text>
              <Text type="secondary">{recentAnswer || '暂无'}</Text>
              <Text strong>最近 traceId</Text>
              <Text type="secondary">{recentTrace || '暂无'}</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="对话式问答" extra={
            <Space>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '收起高级搜索' : '高级搜索'}
              </Button>
              <Button 
                icon={<ClearOutlined />} 
                onClick={handleClear}
                disabled={loading}
              >
                清空
              </Button>
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={handleNaturalLanguageQuery}
                loading={loading}
              >
                发送
              </Button>
            </Space>
          }>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space wrap>
                <Tag color="processing">对话模式</Tag>
                <Text type="secondary">像 Chat 一样提问，系统先回答，再决定是否升级任务</Text>
              </Space>
              <Space>
                <Text>深度思考</Text>
                <Switch checked={deepThink} onChange={setDeepThink} />
                <Text>智能搜索</Text>
                <Switch checked={searchMode} onChange={setSearchMode} />
              </Space>
            </div>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col xs={24} md={8}>
                <Select
                  value={modelPreference}
                  onChange={setModelPreference}
                  style={{ width: '100%' }}
                  options={[
                    { label: '自动选择', value: 'auto' },
                    { label: '千问', value: 'qwen' },
                    { label: 'DeepSeek', value: 'deepseek' },
                    { label: 'Moonshot', value: 'moonshot' },
                    { label: 'NLP Agent', value: 'nlp' },
                    { label: '规则兜底', value: 'rule' }
                  ]}
                />
              </Col>
              <Col xs={24} md={16}>
                <Input.TextArea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="输入你的问题，比如：张大爷血压高怎么办？"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ borderRadius: 16 }}
                />
              </Col>
            </Row>
            
            {/* 高级搜索 */}
            {showAdvanced && (
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <Title level={5}>高级搜索</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Form.Item label="年龄范围">
                      <RangePicker
                        style={{ width: '100%' }}
                        picker="year"
                        onChange={(dates) => {
                          if (!dates || !dates[0] || !dates[1]) {
                            setAdvancedFilters(prev => ({ ...prev, ageRange: null }))
                            return
                          }

                          const thisYear = new Date().getFullYear()
                          const minAge = thisYear - dates[1].year()
                          const maxAge = thisYear - dates[0].year()
                          setAdvancedFilters(prev => ({ ...prev, ageRange: [minAge, maxAge] }))
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="性别">
                      <Select 
                        style={{ width: '100%' }} 
                        placeholder="请选择性别"
                        value={advancedFilters.gender}
                        onChange={(value) => setAdvancedFilters(prev => ({ ...prev, gender: value }))}
                      >
                        <Option value="">全部</Option>
                        <Option value="男">男</Option>
                        <Option value="女">女</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="健康状况">
                      <Select 
                        style={{ width: '100%' }} 
                        placeholder="请选择健康状况"
                        value={advancedFilters.healthStatus}
                        onChange={(value) => setAdvancedFilters(prev => ({ ...prev, healthStatus: value }))}
                      >
                        <Option value="">全部</Option>
                        <Option value="良好">良好</Option>
                        <Option value="一般">一般</Option>
                        <Option value="较差">较差</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="风险等级">
                      <Select 
                        style={{ width: '100%' }} 
                        placeholder="请选择风险等级"
                        value={advancedFilters.riskLevel}
                        onChange={(value) => setAdvancedFilters(prev => ({ ...prev, riskLevel: value }))}
                      >
                        <Option value="">全部</Option>
                        <Option value="一般">一般</Option>
                        <Option value="较重">较重</Option>
                        <Option value="紧急">紧急</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item label="住址">
                      <Input 
                        placeholder="请输入住址关键词"
                        value={advancedFilters.address}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />} 
                  onClick={handleAdvancedSearch}
                  loading={loading}
                >
                  高级搜索
                </Button>
              </div>
            )}
            
            {/* 查询历史 */}
            {(recentSessions.length > 0 || queryHistory.length > 0) && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>最近会话：</Text>
                <Space direction="vertical" style={{ width: '100%', marginTop: '8px' }}>
                  {recentSessions.map((session, index) => (
                    <Card key={`${session.traceId || index}`} size="small" style={{ borderRadius: 14 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={session.escalate ? 'warning' : 'success'}>{session.escalate ? '已升级任务' : '已回答'}</Tag>
                          {session.traceId ? <Tag color="blue">traceId: {session.traceId}</Tag> : null}
                        </Space>
                        <Text strong>{session.query}</Text>
                        <Text type="secondary">{session.answer}</Text>
                      </Space>
                    </Card>
                  ))}
                  {queryHistory.length > 0 && (
                    <Space wrap>
                      {queryHistory.map((history, index) => (
                        <Tag 
                          key={index} 
                          color="blue" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setQueryText(history)}
                        >
                          {history}
                        </Tag>
                      ))}
                    </Space>
                  )}
                </Space>
              </div>
            )}
          </Card>
        </Col>

        {sqlQuery && (
          <Col span={24}>
            <Card title="生成的SQL查询" extra={
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExport}
                disabled={results.length === 0}
              >
                导出数据
              </Button>
            }>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                fontSize: '14px',
                margin: 0
              }}>
                {sqlQuery}
              </pre>
            </Card>
          </Col>
        )}

        <Col span={24}>
          <Card title={`查询结果 (${results.length} 条记录)`}>
            {answer && (
              <Card size="small" style={{ marginBottom: '16px', borderRadius: 16, background: 'linear-gradient(135deg, #fbfcfd 0%, #eef2f6 100%)' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="processing">智能回答</Tag>
                    <Tag color={shouldEscalate ? 'warning' : 'success'}>{shouldEscalate ? '建议升级任务' : '可直接回答'}</Tag>
                    {recentTrace ? <Tag color="blue">traceId: {recentTrace}</Tag> : null}
                  </Space>
                  <div style={{ lineHeight: 1.85 }}>{answer}</div>
                  <Text type="secondary">{responseMode ? `当前数据模式：${responseMode === 'demo' ? '演示模式' : '实时模式'}` : ''}{modelSource ? ` ｜ 模型来源：${modelSource === 'qwen' ? '千问' : modelSource === 'nlp' ? 'NLP Agent' : modelSource === 'deepseek' ? 'DeepSeek' : modelSource === 'moonshot' ? 'Moonshot' : '规则引擎'}` : ''}{latencyMs ? ` ｜ 响应耗时：${latencyMs}ms` : ''}</Text>
                  <Space wrap>
                    <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/agent/vnext')}>
                      进入运行台处理
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}

            {shouldEscalate && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
                message="这类问题建议继续升级处理"
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>{`建议动作：${suggestedActions.join('；') || '建议进一步追问或创建任务'}`}</div>
                    <Space wrap>
                      <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/agent/vnext')}>
                        去运行台创建任务
                      </Button>
                      <Button onClick={() => navigate('/agent/command')}>
                        去指挥中心跟踪
                      </Button>
                    </Space>
                  </Space>
                }
              />
            )}

            {explainability && (
              <Card size="small" style={{ marginBottom: '16px', borderColor: '#d9d9d9' }}>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>
                  AI风险评分：{explainability.riskScore} / 100（{explainability.riskLevel.toUpperCase()}）
                </div>
                <Progress
                  percent={explainability.riskScore}
                  status={explainability.riskLevel === 'high' ? 'exception' : explainability.riskLevel === 'medium' ? 'active' : 'normal'}
                  strokeColor={explainability.riskLevel === 'high' ? '#ff4d4f' : explainability.riskLevel === 'medium' ? '#faad14' : '#52c41a'}
                />
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  置信度：{(explainability.confidence * 100).toFixed(0)}%
                </div>
                <div style={{ marginBottom: 8 }}>
                  关键因子：{explainability.factors.join('、')}
                </div>
                <div style={{ marginBottom: 8 }}>
                  因子权重：{(explainability.factorWeights || []).map((item) => `${item.name}${Math.round(item.weight * 100)}%`).join('，')}
                </div>
                <div>
                  建议动作：{explainability.recommendedActions.join('；')}
                </div>
              </Card>
            )}

            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={results}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`
                }}
                scroll={{ x: 800 }}
              />
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DataQuery