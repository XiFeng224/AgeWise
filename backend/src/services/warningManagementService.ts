import { Warning, Elderly, User } from '../models'
import { notificationService } from './notificationService'
import healthRiskService from './healthRiskService'

interface AnalysisResult {
  isAbnormal: boolean
  title: string
  description: string
  severity: number
}

interface HealthDataInput {
  dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
  value: number
  value2?: number
}

interface ActivityDataInput {
  activityType: 'no_activity' | 'frequent_bathroom' | 'fall_risk'
  duration?: number
  count?: number
}

interface WarningTriggerData {
  warningType: string
  level: 'green' | 'yellow' | 'red'
  title: string
  description: string
  triggerData: object
}

type ActivityWarningTriggerData = ActivityDataInput | { type: 'no_activity' | 'frequent_bathroom' | 'night_activity'; message: string; duration?: number; count?: number; timestamp?: Date }
type HealthWarningTriggerData = HealthDataInput & { message?: string }

type SensorKind = 'door_contact' | 'water_meter' | 'mattress' | 'activity' | 'service_gap'

interface ProactiveSensorInput {
  elderlyId: number
  sensorType: SensorKind
  value?: number
  value2?: number
  textValue?: string
  observedAt?: Date
  meta?: Record<string, unknown>
}

// 预警管理服务类
class WarningManagementService {
  // 预警等级定义（与模型 riskLevel: low/medium/high 保持一致）
  private warningLevels = {
    low: {
      name: '绿色（日常）',
      priority: 1,
      response: '生成周报给家属'
    },
    medium: {
      name: '黄色（关注）',
      priority: 2,
      response: '自动推送健康建议+社区医生视频随访'
    },
    high: {
      name: '红色（紧急）',
      priority: 3,
      response: '自动呼叫120+通知家属+打开家中智能门锁'
    }
  }

  // 分析健康数据并生成预警
  async analyzeHealthDataAndGenerateWarning(elderlyId: number, healthData: HealthWarningTriggerData) {
    try {
      // 分析健康数据
      const analysisResult = this.analyzeHealthData(healthData)
      
      // 如果有异常，生成预警
      if (analysisResult.isAbnormal) {
        const warningLevel = this.determineWarningLevel(analysisResult)
        const warning = await this.generateWarning(elderlyId, {
          warningType: 'health_abnormal',
          level: warningLevel,
          title: analysisResult.title,
          description: analysisResult.description,
          triggerData: healthData
        })
        await this.createProactiveTaskFromWarning(warning, '健康指标异常，建议尽快复测并安排随访')
      }
    } catch (error) {
      console.error('分析健康数据并生成预警失败:', error)
    }
  }

  // 分析行为数据并生成预警
  async analyzeActivityDataAndGenerateWarning(elderlyId: number, activityData: ActivityDataInput) {
    try {
      // 分析行为数据
      const analysisResult = this.analyzeActivityData(activityData)
      
      // 如果有异常，生成预警
      if (analysisResult.isAbnormal) {
        const warningLevel = this.determineWarningLevel(analysisResult)
        const warning = await this.generateWarning(elderlyId, {
          warningType: 'activity_abnormal',
          level: warningLevel,
          title: analysisResult.title,
          description: analysisResult.description,
          triggerData: activityData
        })
        await this.createProactiveTaskFromWarning(warning, '活动模式异常，建议网格员电话关怀')
      }
    } catch (error) {
      console.error('分析行为数据并生成预警失败:', error)
    }
  }

  private async createProactiveTaskFromWarning(warning: Warning, suggestion: string) {
    try {
      await notificationService.sendNotification(
        warning.elderlyId,
        `Agent主动感知任务-${warning.title}`,
        JSON.stringify({
          warningId: warning.id,
          warningType: warning.warningType,
          riskLevel: warning.riskLevel,
          suggestion,
          createdAt: new Date().toISOString()
        }),
        'warning',
        warning.id
      )
    } catch (error) {
      console.error('创建主动感知任务失败:', error)
    }
  }

  // 分析健康风险并生成预警
  async analyzeHealthRiskAndGenerateWarning(elderlyId: number) {
    try {
      // 获取健康风险评估
      const fallRisk = await healthRiskService.predictFallRisk(elderlyId)
      const strokeRisk = await healthRiskService.predictStrokeRisk(elderlyId)
      const medicationAdherence = await healthRiskService.analyzeMedicationAdherence(elderlyId)

      // 检查跌倒风险
      if (fallRisk.riskLevel === 'high') {
        await this.generateWarning(elderlyId, {
          warningType: 'fall_risk',
          level: 'red',
          title: '跌倒高风险预警',
          description: `老人跌倒风险评估为高风险，风险分数：${fallRisk.riskScore}`,
          triggerData: fallRisk
        })
      } else if (fallRisk.riskLevel === 'medium') {
        await this.generateWarning(elderlyId, {
          warningType: 'fall_risk',
          level: 'yellow',
          title: '跌倒中风险预警',
          description: `老人跌倒风险评估为中风险，风险分数：${fallRisk.riskScore}`,
          triggerData: fallRisk
        })
      }

      // 检查中风风险
      if (strokeRisk.riskLevel === 'high') {
        await this.generateWarning(elderlyId, {
          warningType: 'stroke_risk',
          level: 'red',
          title: '中风高风险预警',
          description: `老人中风风险评估为高风险，风险分数：${strokeRisk.riskScore}`,
          triggerData: strokeRisk
        })
      } else if (strokeRisk.riskLevel === 'medium') {
        await this.generateWarning(elderlyId, {
          warningType: 'stroke_risk',
          level: 'yellow',
          title: '中风中风险预警',
          description: `老人中风风险评估为中风险，风险分数：${strokeRisk.riskScore}`,
          triggerData: strokeRisk
        })
      }

      // 检查用药依从性
      if (medicationAdherence.adherenceLevel === 'poor') {
        await this.generateWarning(elderlyId, {
          warningType: 'medication_adherence',
          level: 'yellow',
          title: '用药依从性差预警',
          description: `老人用药依从性评估为较差，依从性分数：${medicationAdherence.adherenceScore}`,
          triggerData: medicationAdherence
        })
      }
    } catch (error) {
      console.error('分析健康风险并生成预警失败:', error)
    }
  }

  // 分析健康数据
  private analyzeHealthData(data: HealthDataInput): AnalysisResult {
    const result = {
      isAbnormal: false,
      title: '',
      description: '',
      severity: 0
    }

    // 分析心率
    if (data.dataType === 'heart_rate') {
      if (data.value < 60 || data.value > 100) {
        result.isAbnormal = true
        result.title = '心率异常'
        result.description = `心率值为 ${data.value}，超出正常范围（60-100）`
        result.severity = data.value < 50 || data.value > 120 ? 3 : 2
      }
    }

    // 分析血压
    if (data.dataType === 'blood_pressure') {
      const systolic = data.value
      const diastolic = data.value2
      if (systolic > 140 || diastolic > 90) {
        result.isAbnormal = true
        result.title = '血压异常'
        result.description = `血压值为 ${systolic}/${diastolic}，超出正常范围`
        result.severity = systolic > 160 || diastolic > 100 ? 3 : 2
      }
    }

    // 分析血糖
    if (data.dataType === 'blood_sugar') {
      if (data.value > 7.0) {
        result.isAbnormal = true
        result.title = '血糖异常'
        result.description = `血糖值为 ${data.value}，超出正常范围`
        result.severity = data.value > 10.0 ? 3 : 2
      }
    }

    // 分析体温
    if (data.dataType === 'temperature') {
      if (data.value > 37.5 || data.value < 36.0) {
        result.isAbnormal = true
        result.title = '体温异常'
        result.description = `体温值为 ${data.value}，超出正常范围`
        result.severity = data.value > 38.5 || data.value < 35.0 ? 3 : 2
      }
    }

    return result
  }

  private analyzeDoorContact(data: ProactiveSensorInput): AnalysisResult {
    const hours = Number(data.value || 0)
    if (hours >= 12) {
      return {
        isAbnormal: true,
        title: '门磁异常：长时间未开门',
        description: `老人${hours.toFixed(1)}小时未开门，建议立即电话确认`,
        severity: hours >= 24 ? 3 : 2
      }
    }
    return { isAbnormal: false, title: '', description: '', severity: 0 }
  }

  private analyzeWaterMeter(data: ProactiveSensorInput): AnalysisResult {
    const liters = Number(data.value || 0)
    const hours = Number(data.value2 || 24)
    if (liters <= 0 && hours >= 12) {
      return {
        isAbnormal: true,
        title: '水表异常：长时间无用水',
        description: `连续${hours}小时用水量为0，需确认老人状态`,
        severity: hours >= 24 ? 3 : 2
      }
    }
    return { isAbnormal: false, title: '', description: '', severity: 0 }
  }

  private analyzeMattress(data: ProactiveSensorInput): AnalysisResult {
    const heartRate = Number(data.value || 0)
    const restlessCount = Number(data.value2 || 0)
    if ((heartRate && (heartRate < 50 || heartRate > 110)) || restlessCount >= 8) {
      return {
        isAbnormal: true,
        title: '床垫异常：夜间生命体征或翻身异常',
        description: `夜间心率${heartRate || '未知'}，翻身/离床异常次数${restlessCount}`,
        severity: heartRate > 120 || heartRate < 45 || restlessCount >= 12 ? 3 : 2
      }
    }
    return { isAbnormal: false, title: '', description: '', severity: 0 }
  }

  private analyzeServiceGap(data: ProactiveSensorInput): AnalysisResult {
    const days = Number(data.value || 0)
    if (days >= 3) {
      return {
        isAbnormal: true,
        title: '服务空窗预警',
        description: `连续${days}天无服务记录，建议主动关怀`,
        severity: days >= 5 ? 2 : 1
      }
    }
    return { isAbnormal: false, title: '', description: '', severity: 0 }
  }

  private analyzeProactiveSensor(data: ProactiveSensorInput): AnalysisResult {
    switch (data.sensorType) {
      case 'door_contact':
        return this.analyzeDoorContact(data)
      case 'water_meter':
        return this.analyzeWaterMeter(data)
      case 'mattress':
        return this.analyzeMattress(data)
      case 'service_gap':
        return this.analyzeServiceGap(data)
      case 'activity':
        return this.analyzeActivityData({
          activityType: 'no_activity',
          duration: Number(data.value || 0),
          count: Number(data.value2 || 0)
        })
      default:
        return { isAbnormal: false, title: '', description: '', severity: 0 }
    }
  }

  // 处理主动感知设备数据（门磁/水表/床垫/无活动/服务空窗）
  async analyzeProactiveSensorAndGenerateWarning(input: ProactiveSensorInput) {
    try {
      const elderly = await Elderly.findByPk(input.elderlyId)
      if (!elderly) throw new Error('老人不存在')

      const analysisResult = this.analyzeProactiveSensor(input)
      if (!analysisResult.isAbnormal) return null

      const warningLevel = this.determineWarningLevel(analysisResult)
      const warningTypeMap: Record<SensorKind, string> = {
        door_contact: 'door_contact',
        water_meter: 'water_meter',
        mattress: 'mattress_risk',
        activity: 'activity_abnormal',
        service_gap: 'service_gap'
      }

      const warning = await this.generateWarning(elderly.id, {
        warningType: warningTypeMap[input.sensorType],
        level: warningLevel,
        title: analysisResult.title,
        description: analysisResult.description,
        triggerData: {
          ...input,
          analysis: analysisResult
        }
      })

      const taskHint =
        input.sensorType === 'door_contact'
          ? '门磁异常，建议电话确认并安排上门核查'
          : input.sensorType === 'water_meter'
            ? '用水异常，建议确认是否外出/住院/设备故障'
            : input.sensorType === 'mattress'
              ? '床垫生命体征异常，建议优先上门或呼叫值班医生'
              : input.sensorType === 'service_gap'
                ? '连续无服务记录，建议网格员电话关怀'
                : '活动异常，建议尽快复核'

      await this.createProactiveTaskFromWarning(warning, taskHint)
      return warning
    } catch (error) {
      console.error('主动感知预警失败:', error)
      throw error
    }
  }

  // 分析行为数据
  private analyzeActivityData(data: ActivityDataInput): AnalysisResult {
    const result = {
      isAbnormal: false,
      title: '',
      description: '',
      severity: 0
    }

    // 分析长时间无活动
    if (data.activityType === 'no_activity') {
      if (data.duration >= 4) {
        result.isAbnormal = true
        result.title = '长时间无活动'
        result.description = `连续 ${data.duration} 小时无活动记录`
        result.severity = data.duration >= 6 ? 3 : 2
      }
    }

    // 分析频繁上厕所
    if (data.activityType === 'frequent_bathroom') {
      if (data.count >= 15) {
        result.isAbnormal = true
        result.title = '频繁上厕所'
        result.description = `24小时内上厕所 ${data.count} 次`
        result.severity = 2
      }
    }

    // 分析跌倒风险
    if (data.activityType === 'fall_risk') {
      result.isAbnormal = true
      result.title = '跌倒风险'
      result.description = '检测到可能的跌倒风险'
      result.severity = 3
    }

    return result
  }

  // 确定预警等级
  private determineWarningLevel(analysisResult: AnalysisResult): 'green' | 'yellow' | 'red' {
    if (analysisResult.severity === 3) {
      return 'red'
    } else if (analysisResult.severity === 2) {
      return 'yellow'
    } else {
      return 'green'
    }
  }

  // 生成预警
  async generateWarning(elderlyId: number, warningData: WarningTriggerData) {
    try {
      // 检查老人是否存在
      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 转换风险等级
      const riskLevelMap: Record<string, 'low' | 'medium' | 'high'> = {
        low: 'low',
        medium: 'medium',
        high: 'high'
      }

      // 创建预警记录
      const warning = await Warning.create({
        elderlyId,
        warningType: warningData.warningType,
        riskLevel: riskLevelMap[warningData.level],
        title: warningData.title,
        description: warningData.description,
        triggerData: warningData.triggerData,
        status: 'pending'
      })

      // 发送预警通知
      await this.sendWarningNotification(warning)

      // 执行相应的响应动作
      await this.executeResponseAction(warning)

      return warning
    } catch (error) {
      console.error('生成预警失败:', error)
      throw error
    }
  }

  // 发送预警通知
  async sendWarningNotification(warning: Warning) {
    try {
      // 获取老人信息
      const elderly = await Elderly.findByPk(warning.elderlyId)
      if (!elderly) return

      // 获取相关人员信息
      const gridMember = elderly.gridMemberId ? await User.findByPk(elderly.gridMemberId) : null
      const familyMembers: User[] = [] // 实际应该从数据库中获取

      // 构建通知内容
      const notificationContent = {
        title: warning.title,
        message: warning.description,
        level: warning.riskLevel,
        elderlyName: elderly.name,
        elderlyId: elderly.id
      }

      // 发送通知给网格员
      if (gridMember) {
        await notificationService.sendNotification(
          gridMember.id,
          warning.title,
          JSON.stringify(notificationContent),
          'warning',
          warning.id
        )
      }

      // 发送通知给家属
      await Promise.all(familyMembers.map((familyMember: User) => 
        notificationService.sendNotification(
          familyMember.id,
          warning.title,
          JSON.stringify(notificationContent),
          'warning',
          warning.id
        )
      ))

      // 发送通知给管理员
      const admins = await User.findAll({ where: { role: 'admin' } })
      await Promise.all(admins.map((admin: User) => 
        notificationService.sendNotification(
          admin.id,
          warning.title,
          JSON.stringify(notificationContent),
          'warning',
          warning.id
        )
      ))
    } catch (error) {
      console.error('发送预警通知失败:', error)
    }
  }

  // 执行响应动作
  async executeResponseAction(warning: Warning) {
    try {
      const elderly = await Elderly.findByPk(warning.elderlyId)
      if (!elderly) return

      switch (warning.riskLevel) {
        case 'high':
          // 红色预警响应动作
          await this.executeRedWarningResponse(elderly, warning)
          break
        case 'medium':
          // 黄色预警响应动作
          await this.executeYellowWarningResponse(elderly, warning)
          break
        case 'low':
          // 绿色预警响应动作
          await this.executeGreenWarningResponse(elderly, warning)
          break
      }
    } catch (error) {
      console.error('执行响应动作失败:', error)
    }
  }

  // 执行红色预警响应动作
  private async executeRedWarningResponse(elderly: Elderly, warning: Warning) {
    // 1. 自动呼叫120（模拟）
    console.log(`自动呼叫120：老人 ${elderly.name} 发生紧急情况`)

    // 2. 通知家属
    if (elderly.emergencyContact && elderly.emergencyPhone) {
      console.log(`通知家属 ${elderly.emergencyContact}：${elderly.emergencyPhone}`)
    }

    // 3. 打开家中智能门锁（模拟）
    console.log(`打开老人 ${elderly.name} 家中智能门锁`)

    // 4. 通知网格员
    if (elderly.gridMemberId) {
      const gridMember = await User.findByPk(elderly.gridMemberId)
      if (gridMember) {
        console.log(`通知网格员 ${gridMember.realName}：老人 ${elderly.name} 发生紧急情况`)
      }
    }
  }

  // 执行黄色预警响应动作
  private async executeYellowWarningResponse(elderly: Elderly, warning: Warning) {
    // 1. 自动推送健康建议
    console.log(`推送健康建议给老人 ${elderly.name}`)

    // 2. 社区医生视频随访（模拟）
    console.log(`安排社区医生对老人 ${elderly.name} 进行视频随访`)

    // 3. 通知网格员
    if (elderly.gridMemberId) {
      const gridMember = await User.findByPk(elderly.gridMemberId)
      if (gridMember) {
        console.log(`通知网格员 ${gridMember.realName}：老人 ${elderly.name} 需要关注`)
      }
    }
  }

  // 执行绿色预警响应动作
  private async executeGreenWarningResponse(elderly: Elderly, warning: Warning) {
    // 生成周报给家属（模拟）
    console.log(`生成周报给老人 ${elderly.name} 的家属`)
  }

  // 处理预警
  async handleWarning(warningId: number, handlerId: number, handleNotes: string) {
    try {
      const warning = await Warning.findByPk(warningId)
      if (!warning) {
        throw new Error('预警记录不存在')
      }

      // 更新预警状态
      await warning.update({
        status: 'processing',
        handlerId,
        handle_notes: handleNotes,
        handle_time: new Date()
      })

      return warning
    } catch (error) {
      console.error('处理预警失败:', error)
      throw error
    }
  }

  // 解决预警
  async resolveWarning(warningId: number, handlerId: number, resolutionNotes: string) {
    try {
      const warning = await Warning.findByPk(warningId)
      if (!warning) {
        throw new Error('预警记录不存在')
      }

      // 更新预警状态
      await warning.update({
        status: 'resolved',
        handlerId,
        handle_notes: (warning.handle_notes || '') + '\n' + resolutionNotes,
        handle_time: new Date()
      })

      return warning
    } catch (error) {
      console.error('解决预警失败:', error)
      throw error
    }
  }

  // 获取预警统计
  async getWarningStats() {
    try {
      const total = await Warning.count()
      const pending = await Warning.count({ where: { status: 'pending' } })
      const processing = await Warning.count({ where: { status: 'processing' } })
      const resolved = await Warning.count({ where: { status: 'resolved' } })

      const byLevel = {
        high: await Warning.count({ where: { riskLevel: 'high' } }),
        medium: await Warning.count({ where: { riskLevel: 'medium' } }),
        low: await Warning.count({ where: { riskLevel: 'low' } })
      }

      return {
        total,
        pending,
        processing,
        resolved,
        byLevel
      }
    } catch (error) {
      console.error('获取预警统计失败:', error)
      throw error
    }
  }
}

export default new WarningManagementService()