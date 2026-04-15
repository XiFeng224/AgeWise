// 健康数据分析工具

// 计算健康风险分数
export function calculateHealthRisk(data: {
  heartRate?: number
  bloodPressure?: { systolic: number; diastolic: number }
  bloodSugar?: number
  temperature?: number
  steps?: number
  sleep?: number
}): {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
} {
  let totalScore = 0
  const recommendations: string[] = []

  // 心率风险评估
  if (data.heartRate !== undefined && data.heartRate !== null) {
    if (data.heartRate < 60 || data.heartRate > 100) {
      totalScore += 30
      recommendations.push('心率异常，建议咨询医生')
    } else if (data.heartRate < 70 || data.heartRate > 90) {
      totalScore += 15
      recommendations.push('心率偏高/偏低，建议注意休息')
    }
  }

  // 血压风险评估
  if (data.bloodPressure) {
    const { systolic, diastolic } = data.bloodPressure
    if (systolic > 140 || diastolic > 90) {
      totalScore += 40
      recommendations.push('血压异常，建议咨询医生')
    } else if (systolic > 130 || diastolic > 85) {
      totalScore += 20
      recommendations.push('血压偏高，建议减少盐分摄入')
    }
  }

  // 血糖风险评估
  if (data.bloodSugar !== undefined && data.bloodSugar !== null) {
    if (data.bloodSugar < 3.9 || data.bloodSugar > 7.0) {
      totalScore += 30
      recommendations.push('血糖异常，建议咨询医生')
    } else if (data.bloodSugar < 4.5 || data.bloodSugar > 6.5) {
      totalScore += 15
      recommendations.push('血糖偏高/偏低，建议注意饮食')
    }
  }

  // 体温风险评估
  if (data.temperature !== undefined && data.temperature !== null) {
    if (data.temperature < 36.0 || data.temperature > 37.5) {
      totalScore += 25
      recommendations.push('体温异常，建议咨询医生')
    }
  }

  // 步数风险评估
  if (data.steps !== undefined && data.steps !== null) {
    if (data.steps < 500) {
      totalScore += 20
      recommendations.push('步数过少，建议适当增加活动')
    } else if (data.steps < 2000) {
      totalScore += 10
      recommendations.push('活动量不足，建议增加日常活动')
    }
  }

  // 睡眠风险评估
  if (data.sleep !== undefined && data.sleep !== null) {
    if (data.sleep < 4 || data.sleep > 10) {
      totalScore += 25
      recommendations.push('睡眠异常，建议调整作息')
    } else if (data.sleep < 6 || data.sleep > 9) {
      totalScore += 15
      recommendations.push('睡眠不足/过多，建议保持规律作息')
    }
  }

  // 确定风险等级
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (totalScore >= 80) {
    riskLevel = 'high'
  } else if (totalScore >= 40) {
    riskLevel = 'medium'
  }

  return {
    riskScore: totalScore,
    riskLevel,
    recommendations
  }
}

// 分析健康数据趋势
export function analyzeHealthTrend(dataPoints: number[]): {
  trend: 'improving' | 'worsening' | 'stable'
  slope: number
  changePercentage: number
} {
  if (dataPoints.length < 2) {
    return {
      trend: 'stable',
      slope: 0,
      changePercentage: 0
    }
  }

  // 计算线性回归斜率
  const n = dataPoints.length
  const xValues = Array.from({ length: n }, (_, i) => i)
  const sumX = xValues.reduce((sum, x) => sum + x, 0)
  const sumY = dataPoints.reduce((sum, y) => sum + y, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * dataPoints[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0

  // 计算变化百分比
  const firstValue = dataPoints[0]
  const lastValue = dataPoints[dataPoints.length - 1]
  const changePercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

  // 确定趋势
  let trend: 'improving' | 'worsening' | 'stable' = 'stable'
  if (Math.abs(slope) > 0.1) {
    trend = slope < 0 ? 'improving' : 'worsening'
  }

  return {
    trend,
    slope: Number(slope.toFixed(4)),
    changePercentage: Number(changePercentage.toFixed(2))
  }
}

// 检测异常健康数据
export function detectAnomalies(data: number[], threshold: number = 2): number[] {
  if (data.length < 3) {
    return []
  }

  // 计算均值和标准差
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const squaredDifferences = data.map(val => Math.pow(val - mean, 2))
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / data.length
  const stdDev = Math.sqrt(variance)

  // 检测异常值
  const anomalies: number[] = []
  data.forEach((value, index) => {
    if (Math.abs(value - mean) > threshold * stdDev) {
      anomalies.push(index)
    }
  })

  return anomalies
}

// 预测健康趋势
export function predictHealthTrend(dataPoints: number[], days: number = 7): number[] {
  if (dataPoints.length < 2) {
    return dataPoints
  }

  // 简单线性回归预测
  const n = dataPoints.length
  const xValues = Array.from({ length: n }, (_, i) => i)
  const sumX = xValues.reduce((sum, x) => sum + x, 0)
  const sumY = dataPoints.reduce((sum, y) => sum + y, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * dataPoints[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
  const intercept = (sumY - slope * sumX) / n

  // 预测未来值
  const predictions: number[] = []
  for (let i = 0; i < days; i++) {
    const prediction = slope * (n + i) + intercept
    predictions.push(prediction)
  }

  return predictions
}

// 生成健康报告
export function generateHealthReport(elderlyData: {
  name: string
  age: number
  healthData: Array<{
    dataType: string
    value: number
    value2?: number
    isAbnormal: boolean
    createdAt: Date
  }>
}): string {
  const { name, age, healthData } = elderlyData
  let report = `健康报告 - ${name} (${age}岁)\n`
  report += `生成时间: ${new Date().toLocaleString()}\n\n`

  // 按数据类型分组
  const dataByType: Record<string, Array<{
    value: number
    value2?: number
    isAbnormal: boolean
    createdAt: Date
  }>> = {}

  healthData.forEach(item => {
    if (!dataByType[item.dataType]) {
      dataByType[item.dataType] = []
    }
    dataByType[item.dataType].push({
      value: item.value,
      value2: item.value2,
      isAbnormal: item.isAbnormal,
      createdAt: item.createdAt
    })
  })

  // 生成各数据类型的报告
  for (const [dataType, data] of Object.entries(dataByType)) {
    const latestData = data[data.length - 1]
    report += `${getDataTypeName(dataType)}: ${formatValue(dataType, latestData.value, latestData.value2)}\n`
    report += `状态: ${latestData.isAbnormal ? '异常' : '正常'}\n`
    report += `更新时间: ${latestData.createdAt.toLocaleString()}\n\n`
  }

  // 生成风险评估
  const riskAssessment = calculateHealthRisk({
    heartRate: dataByType['heart_rate']?.[dataByType['heart_rate'].length - 1]?.value,
    bloodPressure: dataByType['blood_pressure']?.[dataByType['blood_pressure'].length - 1] ? {
      systolic: dataByType['blood_pressure'][dataByType['blood_pressure'].length - 1].value,
      diastolic: dataByType['blood_pressure'][dataByType['blood_pressure'].length - 1].value2 || 0
    } : undefined,
    bloodSugar: dataByType['blood_sugar']?.[dataByType['blood_sugar'].length - 1]?.value,
    temperature: dataByType['temperature']?.[dataByType['temperature'].length - 1]?.value,
    steps: dataByType['steps']?.[dataByType['steps'].length - 1]?.value,
    sleep: dataByType['sleep']?.[dataByType['sleep'].length - 1]?.value
  })

  report += `风险评估:\n`
  report += `风险分数: ${riskAssessment.riskScore}\n`
  report += `风险等级: ${getRiskLevelName(riskAssessment.riskLevel)}\n\n`

  if (riskAssessment.recommendations.length > 0) {
    report += `健康建议:\n`
    riskAssessment.recommendations.forEach((recommendation, index) => {
      report += `${index + 1}. ${recommendation}\n`
    })
  }

  return report
}

// 辅助函数：获取数据类型的中文名称
function getDataTypeName(dataType: string): string {
  const names: Record<string, string> = {
    heart_rate: '心率',
    blood_pressure: '血压',
    blood_sugar: '血糖',
    temperature: '体温',
    steps: '步数',
    sleep: '睡眠'
  }
  return names[dataType] || dataType
}

// 辅助函数：格式化数值
function formatValue(dataType: string, value: number, value2?: number): string {
  switch (dataType) {
    case 'heart_rate':
      return `${value} 次/分钟`
    case 'blood_pressure':
      return `${value}/${value2 || 0} mmHg`
    case 'blood_sugar':
      return `${value} mmol/L`
    case 'temperature':
      return `${value} °C`
    case 'steps':
      return `${value} 步`
    case 'sleep':
      return `${value} 小时`
    default:
      return value.toString()
  }
}

// 辅助函数：获取风险等级的中文名称
function getRiskLevelName(riskLevel: 'low' | 'medium' | 'high'): string {
  const names: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  }
  return names[riskLevel] || riskLevel
}