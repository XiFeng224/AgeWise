import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  message,
  Card,
  Tag,
  Alert,
  Space,
  Typography,
  Switch
} from 'antd'
import axios from '../utils/axiosInstance'

const { Option } = Select
const { TextArea: AntTextArea } = Input
const { Text } = Typography

const HealthRecords: React.FC = () => {
  const [healthRecords, setHealthRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [form] = Form.useForm()
  const [elderlyList, setElderlyList] = useState<any[]>([])

  const [realtimeForm] = Form.useForm()
  const [realtimeSummary, setRealtimeSummary] = useState<any>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [knowledgeTopic, setKnowledgeTopic] = useState<string | undefined>(undefined)
  const [seniorMode, setSeniorMode] = useState(true)

  const recordTypes = [
    { value: 'physical', label: '体检' },
    { value: 'checkup', label: '日常检查' },
    { value: 'treatment', label: '治疗记录' },
    { value: 'followup', label: '随访记录' }
  ]

  useEffect(() => {
    fetchElderlyList()
    fetchHealthRecords()
    fetchKnowledge()
  }, [])

  const fetchElderlyList = async () => {
    try {
      const response = await axios.get('/elderly')
      setElderlyList(response.data.data || [])
    } catch (error) {
      console.error('获取老人列表失败:', error)
    }
  }

  const fetchHealthRecords = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/health')
      setHealthRecords(response.data.healthRecords || [])
    } catch (error) {
      console.error('获取健康档案失败:', error)
      message.error('获取健康档案失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtimeSummary = async (elderlyId: number) => {
    try {
      const response = await axios.get(`/health/realtime/${elderlyId}/summary`)
      setRealtimeSummary(response.data?.data || null)
    } catch (error) {
      message.error('获取实时健康摘要失败')
    }
  }

  const fetchKnowledge = async (topic?: string) => {
    try {
      const response = await axios.get('/health/knowledge', { params: { topic } })
      setKnowledgeItems(response.data?.data || [])
    } catch (error) {
      message.error('获取医疗知识失败')
    }
  }

  const speakSummary = () => {
    if (!realtimeSummary || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      message.info('当前浏览器不支持语音播报')
      return
    }

    const text = [
      `当前风险级别：${realtimeSummary.overallLevel === 'urgent' ? '紧急' : realtimeSummary.overallLevel === 'attention' ? '需关注' : '平稳'}`,
      ...(realtimeSummary.suggestions || []),
      ...(realtimeSummary.emergencySignals || [])
    ].join('。')

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleRealtimeIngest = async () => {
    try {
      const values = await realtimeForm.validateFields()
      setRealtimeLoading(true)

      const points = [
        values.heartRate ? { dataType: 'heart_rate', value: Number(values.heartRate) } : null,
        values.systolic && values.diastolic
          ? { dataType: 'blood_pressure', value: Number(values.systolic), value2: Number(values.diastolic) }
          : null,
        values.bloodSugar ? { dataType: 'blood_sugar', value: Number(values.bloodSugar) } : null,
        values.temperature ? { dataType: 'temperature', value: Number(values.temperature) } : null,
        values.steps ? { dataType: 'steps', value: Number(values.steps) } : null,
        values.sleep ? { dataType: 'sleep', value: Number(values.sleep) } : null
      ].filter(Boolean)

      if (!points.length) {
        message.warning('请至少输入一个监测数据')
        return
      }

      const response = await axios.post('/health/realtime/ingest', {
        elderlyId: Number(values.elderlyId),
        points
      })

      message.success(response.data?.message || '实时数据上报成功')
      setRealtimeSummary(response.data?.data?.summary || null)
      fetchHealthRecords()
    } catch (error) {
      message.error('实时数据上报失败')
    } finally {
      setRealtimeLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setVisible(true)
  }

  const handleEdit = (record: any) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      recordDate: record.recordDate ? new Date(record.recordDate) : null
    })
    setVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/health/${id}`)
      message.success('健康档案删除成功')
      fetchHealthRecords()
    } catch (error) {
      message.error('删除健康档案失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingRecord) {
        await axios.put(`/health/${editingRecord.id}`, values)
        message.success('健康档案更新成功')
      } else {
        await axios.post('/health', values)
        message.success('健康档案创建成功')
      }

      setVisible(false)
      fetchHealthRecords()
    } catch (error) {
      message.error('提交健康档案失败')
    }
  }

  const getElderlyName = (elderlyId: number) => {
    const elderly = elderlyList.find(item => item.id === elderlyId)
    return elderly ? elderly.name : '未知老人'
  }

  const getRecordTypeTag = (recordType: string) => {
    const type = recordTypes.find(item => item.value === recordType)
    const color = {
      physical: 'blue',
      checkup: 'green',
      treatment: 'red',
      followup: 'orange'
    }[recordType] || 'default'
    return <Tag color={color}>{type?.label || recordType}</Tag>
  }

  const columns = [
    {
      title: '老人姓名',
      dataIndex: 'elderlyId',
      key: 'elderlyId',
      render: (elderlyId: number) => getElderlyName(elderlyId)
    },
    {
      title: '记录类型',
      dataIndex: 'recordType',
      key: 'recordType',
      render: (recordType: string) => getRecordTypeTag(recordType)
    },
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      render: (recordDate: string) => new Date(recordDate).toLocaleString()
    },
    {
      title: '血压',
      dataIndex: 'bloodPressure',
      key: 'bloodPressure',
      render: (bloodPressure: string) => bloodPressure || '-'
    },
    {
      title: '血糖',
      dataIndex: 'bloodSugar',
      key: 'bloodSugar',
      render: (bloodSugar: number) => (bloodSugar ? `${bloodSugar} mmol/L` : '-')
    },
    {
      title: '记录人',
      dataIndex: 'recordedBy',
      key: 'recordedBy'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <div>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </div>
      )
    }
  ]

  const fontScale = seniorMode ? 1.18 : 1

  return (
    <div style={{ padding: '20px', fontSize: `${fontScale}rem` }}>
      <Card
        title="实时健康监测（简易录入）"
        extra={<Space><Text>适老大字模式</Text><Switch checked={seniorMode} onChange={setSeniorMode} /></Space>}
        style={{ marginBottom: 16 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="面向社区老人：只需录入几个关键指标，系统会自动给出通俗建议与风险提醒。"
        />

        <Form form={realtimeForm} layout="vertical">
          <Space wrap style={{ width: '100%' }}>
            <Form.Item name="elderlyId" label="选择老人" rules={[{ required: true, message: '请选择老人' }]}>
              <Select style={{ width: 220 }} placeholder="请选择老人" onChange={(v) => fetchRealtimeSummary(Number(v))}>
                {elderlyList.map(elderly => (
                  <Option key={elderly.id} value={elderly.id}>{elderly.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="heartRate" label="心率(次/分)"><InputNumber min={20} max={220} /></Form.Item>
            <Form.Item name="systolic" label="收缩压(mmHg)"><InputNumber min={60} max={260} /></Form.Item>
            <Form.Item name="diastolic" label="舒张压(mmHg)"><InputNumber min={30} max={180} /></Form.Item>
            <Form.Item name="bloodSugar" label="血糖(mmol/L)"><InputNumber min={1} max={35} step={0.1} /></Form.Item>
            <Form.Item name="temperature" label="体温(℃)"><InputNumber min={34} max={42} step={0.1} /></Form.Item>
            <Form.Item name="steps" label="步数"><InputNumber min={0} max={50000} /></Form.Item>
            <Form.Item name="sleep" label="睡眠(小时)"><InputNumber min={0} max={24} step={0.5} /></Form.Item>
          </Space>
          <Space>
            <Button type="primary" loading={realtimeLoading} onClick={handleRealtimeIngest}>提交监测并获取建议</Button>
            <Button onClick={speakSummary}>语音播报建议</Button>
          </Space>
        </Form>

        {realtimeSummary && (
          <Card size="small" title="系统建议（通俗版）" style={{ marginTop: 12 }}>
            <Space direction="vertical">
              <Text>当前风险级别：
                <Tag color={realtimeSummary.overallLevel === 'urgent' ? 'red' : realtimeSummary.overallLevel === 'attention' ? 'orange' : 'green'}>
                  {realtimeSummary.overallLevel === 'urgent' ? '紧急' : realtimeSummary.overallLevel === 'attention' ? '需关注' : '平稳'}
                </Tag>
              </Text>
              {(realtimeSummary.suggestions || []).map((item: string, idx: number) => (
                <Text key={`s-${idx}`}>- {item}</Text>
              ))}
              {(realtimeSummary.emergencySignals || []).map((item: string, idx: number) => (
                <Text key={`e-${idx}`} type="danger">- {item}</Text>
              ))}
              <Text type="secondary">{realtimeSummary.disclaimer}</Text>
            </Space>
          </Card>
        )}
      </Card>

      <Card title="医疗知识（通俗易懂）" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Text strong>知识主题：</Text>
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 220 }}
              value={knowledgeTopic}
              onChange={(v) => {
                setKnowledgeTopic(v)
                fetchKnowledge(v)
              }}
              options={[
                { label: '高血压', value: '高血压' },
                { label: '糖尿病', value: '糖尿病' },
                { label: '睡眠', value: '睡眠' },
                { label: '防跌倒', value: '防跌倒' }
              ]}
            />
          </Space>

          {knowledgeItems.map((item) => (
            <Card key={item.id} size="small" title={item.title}>
              <Text strong>日常建议：</Text>
              {(item.content || []).map((c: string, idx: number) => (
                <div key={`c-${item.id}-${idx}`}>- {c}</div>
              ))}
              <div style={{ marginTop: 8 }}>
                <Text strong type="danger">警示信号：</Text>
                {(item.warningSigns || []).map((w: string, idx: number) => (
                  <div key={`w-${item.id}-${idx}`}>- {w}</div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <Text strong>今日可执行：</Text>
                {(item.dailyChecklist || []).map((d: string, idx: number) => (
                  <div key={`d-${item.id}-${idx}`}>- {d}</div>
                ))}
              </div>
            </Card>
          ))}
        </Space>
      </Card>

      <Card title="健康档案管理" extra={<Button type="primary" onClick={handleAdd}>添加健康档案</Button>}>
        <Table
          columns={columns}
          dataSource={healthRecords}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑健康档案' : '添加健康档案'}
        open={visible}
        onOk={handleSubmit}
        onCancel={() => setVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="elderlyId" label="老人" rules={[{ required: true, message: '请选择老人' }]}>
            <Select placeholder="请选择老人">
              {elderlyList.map(elderly => (
                <Option key={elderly.id} value={elderly.id}>{elderly.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="recordType" label="记录类型" rules={[{ required: true, message: '请选择记录类型' }]}>
            <Select placeholder="请选择记录类型">
              {recordTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="recordDate" label="记录日期" rules={[{ required: true, message: '请选择记录日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="bloodPressure" label="血压"><Input placeholder="如：120/80 mmHg" /></Form.Item>
          <Form.Item name="bloodSugar" label="血糖"><InputNumber style={{ width: '100%' }} placeholder="单位：mmol/L" /></Form.Item>
          <Form.Item name="heartRate" label="心率"><InputNumber style={{ width: '100%' }} placeholder="单位：次/分钟" /></Form.Item>
          <Form.Item name="temperature" label="体温"><InputNumber style={{ width: '100%' }} placeholder="单位：℃" /></Form.Item>
          <Form.Item name="weight" label="体重"><InputNumber style={{ width: '100%' }} placeholder="单位：kg" /></Form.Item>
          <Form.Item name="height" label="身高"><InputNumber style={{ width: '100%' }} placeholder="单位：cm" /></Form.Item>
          <Form.Item name="symptoms" label="症状"><AntTextArea rows={3} placeholder="请输入症状描述" /></Form.Item>
          <Form.Item name="diagnosis" label="诊断"><AntTextArea rows={3} placeholder="请输入诊断结果" /></Form.Item>
          <Form.Item name="medication" label="用药"><AntTextArea rows={3} placeholder="请输入用药情况" /></Form.Item>
          <Form.Item name="notes" label="备注"><AntTextArea rows={3} placeholder="请输入备注信息" /></Form.Item>
          <Form.Item name="recordedBy" label="记录人" rules={[{ required: true, message: '请输入记录人' }]}>
            <Input placeholder="请输入记录人姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HealthRecords
