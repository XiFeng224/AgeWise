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
  AutoComplete,
  Select,
  DatePicker,
  Form,
  Progress
} from 'antd'
import { SearchOutlined, ClearOutlined, ExportOutlined, FilterOutlined } from '@ant-design/icons'
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
  const [queryText, setQueryText] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([])
  const [queryHistory, setQueryHistory] = useState<string[]>([])

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [explainability, setExplainability] = useState<Explainability | null>(null)
  const [responseMode, setResponseMode] = useState<'demo' | 'live' | ''>('')
  const [modelSource, setModelSource] = useState<'qwen' | 'nlp' | 'rule' | ''>('')
  const [latencyMs, setLatencyMs] = useState<number>(0)

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
        query: queryText
      })

      if (response.data.success) {
        setSqlQuery(response.data.sql)
        setResults(response.data.data || [])
        setSummary(response.data.summary || '')
        setExplainability(response.data.explainability || null)
        setResponseMode(response.data.mode || '')
        setModelSource(response.data.modelSource || '')
        setLatencyMs(Number(response.data.latencyMs || 0))
        
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
        message="提示：支持自然语言查询，如'查询80岁以上独居老人'或'高血压老人未复诊名单'"
        description="比赛演示建议：先查风险，再展示AI解释与处置建议，形成完整闭环。"
        type="info"
        style={{ marginBottom: '16px' }}
      />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="自然语言查询" extra={
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
                icon={<SearchOutlined />} 
                onClick={handleNaturalLanguageQuery}
                loading={loading}
              >
                查询
              </Button>
            </Space>
          }>
            <AutoComplete
              options={suggestions.map(suggestion => ({ value: suggestion }))}
              onSelect={(value) => setQueryText(value)}
              onSearch={handleGetSuggestions}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              <TextArea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="请输入自然语言查询，例如：查询80岁以上独居老人数量"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </AutoComplete>
            
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
            {queryHistory.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>最近查询：</Text>
                <Space wrap style={{ marginTop: '8px' }}>
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
            {summary && (
              <Alert
                message={summary}
                description={
                  `${responseMode ? `当前数据模式：${responseMode === 'demo' ? '演示模式' : '实时模式'}` : ''}` +
                  `${modelSource ? ` | 模型来源：${modelSource === 'qwen' ? '千问' : modelSource === 'nlp' ? 'NLP Agent' : '规则引擎'}` : ''}` +
                  `${latencyMs ? ` | 响应耗时：${latencyMs}ms` : ''}`
                }
                type="success"
                style={{ marginBottom: '16px' }}
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