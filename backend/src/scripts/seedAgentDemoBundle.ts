import dotenv from 'dotenv'
import database, { testConnection } from '../config/database'
import { Elderly } from '../models'
import medicalAssistantService from '../services/medicalAssistantService'
import agentOrchestratorService from '../services/agentOrchestratorService'

dotenv.config()

type BundleTemplate = {
  label: string
  points: Array<{
    dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
    value: number
    value2?: number
  }>
  requestType: string
  priority: 'low' | 'medium' | 'high'
  requiredSkills: string
}

const templates: BundleTemplate[] = [
  {
    label: '高血压+心率偏快',
    points: [
      { dataType: 'blood_pressure', value: 182, value2: 116 },
      { dataType: 'heart_rate', value: 121 },
      { dataType: 'temperature', value: 37.8 }
    ],
    requestType: '慢病干预-血压波动',
    priority: 'high',
    requiredSkills: '慢病护理,急救评估,家属沟通'
  },
  {
    label: '低血糖风险',
    points: [
      { dataType: 'blood_sugar', value: 3.4 },
      { dataType: 'heart_rate', value: 109 },
      { dataType: 'steps', value: 580 }
    ],
    requestType: '低血糖风险随访',
    priority: 'high',
    requiredSkills: '糖尿病护理,营养指导,应急处理'
  },
  {
    label: '发热感染风险',
    points: [
      { dataType: 'temperature', value: 38.6 },
      { dataType: 'heart_rate', value: 118 },
      { dataType: 'sleep', value: 4.7 }
    ],
    requestType: '发热风险评估',
    priority: 'high',
    requiredSkills: '基础诊疗,感染评估,上门随访'
  },
  {
    label: '活动不足+睡眠异常',
    points: [
      { dataType: 'steps', value: 420 },
      { dataType: 'sleep', value: 10.9 },
      { dataType: 'blood_pressure', value: 146, value2: 94 }
    ],
    requestType: '康复活动干预',
    priority: 'medium',
    requiredSkills: '康复指导,护理随访,情绪支持'
  },
  {
    label: '跌倒风险+低活动',
    points: [
      { dataType: 'steps', value: 120 },
      { dataType: 'heart_rate', value: 126 },
      { dataType: 'sleep', value: 11.3 }
    ],
    requestType: '跌倒风险核查',
    priority: 'high',
    requiredSkills: '跌倒评估,上门核查,护理随访'
  },
  {
    label: '血氧偏低+呼吸异常',
    points: [
      { dataType: 'temperature', value: 37.4 },
      { dataType: 'heart_rate', value: 116 },
      { dataType: 'blood_pressure', value: 138, value2: 90 }
    ],
    requestType: '呼吸风险评估',
    priority: 'high',
    requiredSkills: '呼吸评估,医护值守,家属沟通'
  },
  {
    label: '服药漏服+血压波动',
    points: [
      { dataType: 'blood_pressure', value: 154, value2: 98 },
      { dataType: 'heart_rate', value: 104 },
      { dataType: 'sleep', value: 6.1 }
    ],
    requestType: '服药依从性跟进',
    priority: 'medium',
    requiredSkills: '用药管理,慢病护理,家属沟通'
  },
  {
    label: '情绪低落+活动减少',
    points: [
      { dataType: 'sleep', value: 5.2 },
      { dataType: 'steps', value: 510 },
      { dataType: 'heart_rate', value: 98 }
    ],
    requestType: '心理健康随访',
    priority: 'medium',
    requiredSkills: '心理支持,随访沟通,社工协作'
  }
]

async function seedAgentDemoBundle() {
  try {
    await testConnection()
    await database.sync()

    const elderlyList = await Elderly.findAll({ order: [['id', 'ASC']], limit: 12 })
    if (!elderlyList.length) {
      console.log('未找到老人数据，请先执行 npm run seed:china 或 npm run seed:more-elderly')
      process.exit(0)
    }

    let healthSuccess = 0
    let dispatchCreated = 0

    for (let i = 0; i < elderlyList.length; i += 1) {
      const elderly = elderlyList[i]
      const tpl = templates[i % templates.length]

      const ingest = await medicalAssistantService.ingestRealtimeData(
        elderly.id,
        tpl.points.map((p, idx) => ({
          dataType: p.dataType,
          value: p.value,
          value2: p.value2,
          deviceId: `seed-bundle-${elderly.id}-${Date.now()}-${idx}`
        }))
      )

      if (ingest?.successCount > 0) {
        healthSuccess += 1
      }

      await agentOrchestratorService.quickDispatchFromElderly({
        elderlyId: elderly.id,
        requestType: tpl.requestType,
        priority: tpl.priority,
        description: `自动生成演示任务：${tpl.label}，请在SLA内完成处置并同步家属。`,
        requiredSkills: tpl.requiredSkills
      })
      dispatchCreated += 1
    }

    console.log(`Agent演示包导入完成：处理老人 ${elderlyList.length} 人，健康注入成功 ${healthSuccess} 人，新增派单 ${dispatchCreated} 条。`)
    process.exit(0)
  } catch (error) {
    console.error('导入Agent演示包失败:', error)
    process.exit(1)
  }
}

seedAgentDemoBundle()
