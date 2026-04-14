import { HealthData, Elderly } from '../models'
import { Op } from 'sequelize'
import { calculateHealthRisk } from '../utils/healthAnalysis'
import warningManagementService from './warningManagementService'

// 健康数据服务类
class HealthDataService {
  // 处理设备上传的健康数据
  async processDeviceData(data: {
    elderlyId: number
    dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
    value: number
    value2?: number
    deviceId: string
  }) {
    try {
      // 验证老人是否存在
      const elderly = await Elderly.findByPk(data.elderlyId)
      if (!elderly) {
        throw new Error('老人不存在')
      }

      // 分析数据是否异常
      const analysisResult = this.analyzeHealthData(data, elderly)

      // 保存健康数据
      const healthData = await HealthData.create({
        elderlyId: data.elderlyId,
        dataType: data.dataType,
        value: data.value,
        value2: data.value2,
        unit: this.getUnitForDataType(data.dataType),
        isAbnormal: analysisResult.isAbnormal,
        deviceId: data.deviceId,
        dataSource: 'device'
      })

      // 如果数据异常，生成预警
      if (analysisResult.isAbnormal) {
        await warningManagementService.analyzeHealthDataAndGenerateWarning(data.elderlyId, data)
      }

      return {
        success: true,
        data: healthData,
        message: '数据处理成功'
      }
    } catch (error) {
      console.error('处理设备数据失败:', error)
      return {
        success: false,
        message: '数据处理失败: ' + (error as Error).message
      }
    }
  }

  // 分析健康数据是否异常
  private analyzeHealthData(
    data: {
      dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
      value: number
      value2?: number
    },
    elderly: Elderly
  ) {
    let isAbnormal = false
    let message = ''

    switch (data.dataType) {
      case 'heart_rate':
        // 心率异常判断
        if (data.value < 60 || data.value > 100) {
          isAbnormal = true
          message = `心率异常: ${data.value} 次/分钟`
        }
        break
      case 'blood_pressure':
        // 血压异常判断（收缩压/舒张压）
        if (data.value > 140 || (data.value2 && data.value2 > 90)) {
          isAbnormal = true
          message = `血压异常: ${data.value}/${data.value2} mmHg`
        }
        break
      case 'blood_sugar':
        // 血糖异常判断
        if (data.value < 3.9 || data.value > 7.0) {
          isAbnormal = true
          message = `血糖异常: ${data.value} mmol/L`
        }
        break
      case 'temperature':
        // 体温异常判断
        if (data.value < 36.0 || data.value > 37.5) {
          isAbnormal = true
          message = `体温异常: ${data.value} °C`
        }
        break
      case 'steps':
        // 步数异常判断（过少）
        if (data.value < 500) {
          isAbnormal = true
          message = `步数过少: ${data.value} 步`
        }
        break
      case 'sleep':
        // 睡眠异常判断（过少或过多）
        if (data.value < 4 || data.value > 10) {
          isAbnormal = true
          message = `睡眠异常: ${data.value} 小时`
        }
        break
    }

    return { isAbnormal, message }
  }

  // 获取数据类型对应的单位
  private getUnitForDataType(dataType: string): string {
    const units: Record<string, string> = {
      heart_rate: '次/分钟',
      blood_pressure: 'mmHg',
      blood_sugar: 'mmol/L',
      temperature: '°C',
      steps: '步',
      sleep: '小时'
    }
    return units[dataType] || ''
  }

  // 获取老人的健康数据历史
  async getElderlyHealthHistory(elderlyId: number, dataType?: string, days: number = 7) {
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - days)

    const whereCondition: any = {
      elderlyId,
      createdAt: {
        [Op.gte]: startTime
      }
    }

    if (dataType) {
      whereCondition.dataType = dataType
    }

    return HealthData.findAll({
      where: whereCondition,
      order: [['createdAt', 'ASC']]
    })
  }

  // 批量处理健康数据
  async batchProcessHealthData(dataList: Array<{
    elderlyId: number
    dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
    value: number
    value2?: number
    deviceId: string
  }>) {
    const results = []
    for (const data of dataList) {
      const result = await this.processDeviceData(data)
      results.push(result)
    }
    return results
  }

  // 分析老人的健康趋势
  async analyzeHealthTrend(elderlyId: number, dataType: string, days: number = 30) {
    const history = await this.getElderlyHealthHistory(elderlyId, dataType, days)
    if (history.length === 0) {
      return {
        trend: 'no_data',
        message: '暂无足够的历史数据'
      }
    }

    // 计算趋势
    const values = history.map(item => item.value)
    const average = values.reduce((sum, val) => sum + val, 0) / values.length
    const latestValue = values[values.length - 1]
    const firstValue = values[0]

    let trend: 'improving' | 'worsening' | 'stable' = 'stable'
    if (dataType === 'heart_rate' || dataType === 'blood_pressure' || dataType === 'blood_sugar' || dataType === 'temperature') {
      // 这些指标越低越好
      if (latestValue < firstValue * 0.95) {
        trend = 'improving'
      } else if (latestValue > firstValue * 1.05) {
        trend = 'worsening'
      }
    } else if (dataType === 'steps') {
      // 步数越高越好
      if (latestValue > firstValue * 1.05) {
        trend = 'improving'
      } else if (latestValue < firstValue * 0.95) {
        trend = 'worsening'
      }
    } else if (dataType === 'sleep') {
      // 睡眠在7-8小时最好
      const idealSleep = 7.5
      const latestDeviation = Math.abs(latestValue - idealSleep)
      const firstDeviation = Math.abs(firstValue - idealSleep)
      if (latestDeviation < firstDeviation * 0.95) {
        trend = 'improving'
      } else if (latestDeviation > firstDeviation * 1.05) {
        trend = 'worsening'
      }
    }

    return {
      trend,
      average: average.toFixed(2),
      latest: latestValue,
      dataPoints: history.length
    }
  }
}

export default new HealthDataService()