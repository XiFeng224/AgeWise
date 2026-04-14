import dotenv from 'dotenv'
import database, { testConnection } from '../config/database'
import { Elderly, HealthData } from '../models'

dotenv.config()

type HighRiskTemplate = {
  label: string
  points: Array<{
    dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
    value: number
    value2?: number
    unit: string
    isAbnormal: boolean
  }>
}

const templates: HighRiskTemplate[] = [
  {
    label: '高血压危急',
    points: [
      { dataType: 'blood_pressure', value: 188, value2: 122, unit: 'mmHg', isAbnormal: true },
      { dataType: 'heart_rate', value: 118, unit: '次/分钟', isAbnormal: true }
    ]
  },
  {
    label: '低血糖风险',
    points: [
      { dataType: 'blood_sugar', value: 3.2, unit: 'mmol/L', isAbnormal: true },
      { dataType: 'heart_rate', value: 108, unit: '次/分钟', isAbnormal: true }
    ]
  },
  {
    label: '发热感染风险',
    points: [
      { dataType: 'temperature', value: 38.9, unit: '°C', isAbnormal: true },
      { dataType: 'heart_rate', value: 122, unit: '次/分钟', isAbnormal: true }
    ]
  },
  {
    label: '久坐活动不足',
    points: [
      { dataType: 'steps', value: 260, unit: '步', isAbnormal: true },
      { dataType: 'sleep', value: 11.2, unit: '小时', isAbnormal: true }
    ]
  }
]

async function seedHighRiskData() {
  try {
    await testConnection()
    await database.sync()

    const elderlyList = await Elderly.findAll({ order: [['id', 'ASC']], limit: 12 })
    if (!elderlyList.length) {
      console.log('未找到老人数据，请先执行 npm run seed:china')
      process.exit(0)
    }

    let inserted = 0
    for (let i = 0; i < elderlyList.length; i += 1) {
      const elderly = elderlyList[i]
      const template = templates[i % templates.length]

      const now = Date.now()
      const rows = template.points.map((point, idx) => ({
        elderlyId: elderly.id,
        dataType: point.dataType,
        value: point.value,
        value2: point.value2,
        unit: point.unit,
        isAbnormal: point.isAbnormal,
        deviceId: `demo-high-risk-${template.label}`,
        dataSource: 'system' as const,
        createdAt: new Date(now - (idx + 1) * 60 * 1000),
        updatedAt: new Date(now - (idx + 1) * 60 * 1000)
      }))

      await HealthData.bulkCreate(rows)
      inserted += rows.length
    }

    console.log(`高危样例导入完成：老人 ${elderlyList.length} 人，新增高危监测数据 ${inserted} 条。`)
    process.exit(0)
  } catch (error) {
    console.error('导入高危样例失败:', error)
    process.exit(1)
  }
}

seedHighRiskData()
