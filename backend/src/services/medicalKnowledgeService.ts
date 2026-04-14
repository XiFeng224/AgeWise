export interface MedicalKnowledgeItem {
  id: string
  topic: string
  title: string
  level: '基础' | '进阶'
  content: string[]
  warningSigns: string[]
  dailyChecklist: string[]
}

class MedicalKnowledgeService {
  private knowledge: MedicalKnowledgeItem[] = [
    {
      id: 'hypertension-basic',
      topic: '高血压',
      title: '高血压日常管理（社区老人版）',
      level: '基础',
      content: [
        '每天固定时间测血压，先坐位休息5-10分钟再测。',
        '少盐少腌制食品，避免情绪激动与熬夜。',
        '遵医嘱按时服药，不自行停药。'
      ],
      warningSigns: [
        '血压持续 ≥180/120 mmHg',
        '伴随剧烈头痛、胸痛、气短、肢体无力或言语不清'
      ],
      dailyChecklist: ['晨起测压', '中午适量步行', '晚间复测并记录']
    },
    {
      id: 'diabetes-basic',
      topic: '糖尿病',
      title: '血糖管理要点（社区老人版）',
      level: '基础',
      content: [
        '主食定量，减少含糖饮料与高糖零食。',
        '按时吃药/打针，规律复查空腹和餐后血糖。',
        '外出随身带糖块，防低血糖。'
      ],
      warningSigns: [
        '血糖 <3.9 mmol/L 且出现心慌出汗',
        '血糖 >16.7 mmol/L 持续不降'
      ],
      dailyChecklist: ['按时服药', '记录血糖', '饭后轻量活动']
    },
    {
      id: 'sleep-basic',
      topic: '睡眠',
      title: '老年睡眠改善建议',
      level: '基础',
      content: [
        '固定作息，白天适量晒太阳与活动。',
        '午睡不超过30分钟，晚饭不宜过晚过饱。',
        '睡前1小时减少手机和强光刺激。'
      ],
      warningSigns: ['连续多日失眠影响白天功能', '夜间频繁憋醒、胸闷或严重鼾声'],
      dailyChecklist: ['固定睡觉时间', '午睡控制', '睡前放松']
    },
    {
      id: 'fall-prevention-basic',
      topic: '防跌倒',
      title: '社区居家防跌倒指南',
      level: '基础',
      content: [
        '卫生间与床边安装扶手，地面保持干燥防滑。',
        '夜间起夜先坐起30秒再站立，避免体位性低血压。',
        '穿防滑鞋，定期做下肢力量和平衡训练。'
      ],
      warningSigns: ['近期反复头晕或步态不稳', '一月内出现两次及以上险些跌倒'],
      dailyChecklist: ['检查地面防滑', '起夜照明', '每日平衡训练10分钟']
    }
  ]

  getTopics() {
    return Array.from(new Set(this.knowledge.map(k => k.topic)))
  }

  getKnowledge(topic?: string) {
    if (!topic) return this.knowledge
    return this.knowledge.filter(k => k.topic === topic)
  }
}

export default new MedicalKnowledgeService()
