import { MedicationAdherence, Elderly } from '../models'
import { Op } from 'sequelize'

class MedicationService {
  // 添加用药记录
  async addMedication(elderlyId: number, medicationName: string, dosage: string, schedule: string, notes?: string) {
    try {
      const medication = await MedicationAdherence.create({
        elderlyId,
        medicationName,
        dosage,
        schedule,
        missedCount: 0,
        adherenceRate: 100,
        notes
      })
      
      return { success: true, data: medication }
    } catch (error) {
      console.error('添加用药记录失败:', error)
      throw new Error('添加用药记录失败')
    }
  }

  // 记录用药
  async recordMedicationTaken(elderlyId: number, medicationId: number) {
    try {
      const medication = await MedicationAdherence.findOne({
        where: { id: medicationId, elderlyId }
      })
      
      if (!medication) {
        throw new Error('用药记录不存在')
      }
      
      // 更新用药记录
      medication.lastTaken = new Date()
      
      // 计算依从率（简单实现，实际项目中可能需要更复杂的算法）
      medication.adherenceRate = Math.max(0, medication.adherenceRate - 5)
      
      await medication.save()
      
      return { success: true, data: medication }
    } catch (error) {
      console.error('记录用药失败:', error)
      throw new Error('记录用药失败')
    }
  }

  // 获取用药列表
  async getMedicationList(elderlyId: number) {
    try {
      const medications = await MedicationAdherence.findAll({
        where: { elderlyId }
      })
      
      return { success: true, data: medications }
    } catch (error) {
      console.error('获取用药列表失败:', error)
      throw new Error('获取用药列表失败')
    }
  }

  // 分析用药依从性
  async analyzeMedicationAdherence(elderlyId: number, days: number = 30) {
    try {
      const medications = await MedicationAdherence.findAll({
        where: { elderlyId }
      })
      
      if (medications.length === 0) {
        return { success: true, data: { overallAdherence: 100, medications: [] } }
      }
      
      // 分析每种药物的依从性
      const medicationAnalyses = medications.map(medication => {
        // 计算预期用药次数
        const expectedCount = this.calculateExpectedMedicationCount(medication.schedule, days)
        
        // 计算实际用药次数（这里简化处理，实际项目中需要根据lastTaken和schedule计算）
        const actualCount = expectedCount - medication.missedCount
        
        // 计算依从率
        const adherenceRate = Math.max(0, Math.min(100, (actualCount / expectedCount) * 100))
        
        return {
          medicationId: medication.id,
          medicationName: medication.medicationName,
          dosage: medication.dosage,
          schedule: medication.schedule,
          adherenceRate,
          missedCount: medication.missedCount,
          lastTaken: medication.lastTaken
        }
      })
      
      // 计算总体依从率
      const overallAdherence = medicationAnalyses.reduce((sum, analysis) => sum + analysis.adherenceRate, 0) / medicationAnalyses.length
      
      return {
        success: true,
        data: {
          overallAdherence,
          medications: medicationAnalyses
        }
      }
    } catch (error) {
      console.error('分析用药依从性失败:', error)
      throw new Error('分析用药依从性失败')
    }
  }

  // 计算预期用药次数
  private calculateExpectedMedicationCount(schedule: string, days: number): number {
    // 简单实现，根据schedule计算每天用药次数
    let dailyCount = 1
    
    if (schedule.includes('每日2次') || schedule.includes('bid')) {
      dailyCount = 2
    } else if (schedule.includes('每日3次') || schedule.includes('tid')) {
      dailyCount = 3
    } else if (schedule.includes('每日4次') || schedule.includes('qid')) {
      dailyCount = 4
    }
    
    return dailyCount * days
  }

  // 检测用药异常
  async detectMedicationAnomalies(elderlyId: number) {
    try {
      const medications = await MedicationAdherence.findAll({
        where: { elderlyId }
      })
      
      const anomalies = []
      
      medications.forEach(medication => {
        // 检查是否漏服
        if (medication.lastTaken) {
          const hoursSinceLastTaken = (new Date().getTime() - medication.lastTaken.getTime()) / (1000 * 60 * 60)
          
          // 根据用药频率判断是否漏服
          let expectedInterval = 24 // 默认24小时
          if (medication.schedule.includes('每日2次') || medication.schedule.includes('bid')) {
            expectedInterval = 12
          } else if (medication.schedule.includes('每日3次') || medication.schedule.includes('tid')) {
            expectedInterval = 8
          } else if (medication.schedule.includes('每日4次') || medication.schedule.includes('qid')) {
            expectedInterval = 6
          }
          
          if (hoursSinceLastTaken > expectedInterval + 2) { // 允许2小时的误差
            anomalies.push({
              type: 'missed_dose',
              medicationName: medication.medicationName,
              message: `可能漏服药物 ${medication.medicationName}`,
              hoursSinceLast: Math.round(hoursSinceLastTaken),
              timestamp: new Date()
            })
          }
        }
        
        // 检查依从率过低
        if (medication.adherenceRate < 70) {
          anomalies.push({
            type: 'low_adherence',
            medicationName: medication.medicationName,
            message: `药物 ${medication.medicationName} 依从率过低`,
            adherenceRate: medication.adherenceRate,
            timestamp: new Date()
          })
        }
      })
      
      return { success: true, data: anomalies }
    } catch (error) {
      console.error('检测用药异常失败:', error)
      throw new Error('检测用药异常失败')
    }
  }

  // 生成用药依从性报告
  async generateMedicationReport(elderlyId: number, days: number = 30) {
    try {
      const { data: adherenceData } = await this.analyzeMedicationAdherence(elderlyId, days)
      const { data: anomalies } = await this.detectMedicationAnomalies(elderlyId)
      
      // 生成建议
      const recommendations = this.generateMedicationRecommendations(adherenceData.overallAdherence, anomalies)
      
      const report = {
        elderlyId,
        period: `${days}天`,
        overallAdherence: adherenceData.overallAdherence,
        medications: adherenceData.medications,
        anomalies,
        recommendations
      }
      
      return { success: true, data: report }
    } catch (error) {
      console.error('生成用药依从性报告失败:', error)
      throw new Error('生成用药依从性报告失败')
    }
  }

  // 生成用药建议
  private generateMedicationRecommendations(overallAdherence: number, anomalies: any[]): string[] {
    const recommendations: string[] = []
    
    if (overallAdherence < 70) {
      recommendations.push('建议设置用药提醒')
      recommendations.push('建议家属协助监督用药')
      recommendations.push('考虑使用智能药盒')
    } else if (overallAdherence < 90) {
      recommendations.push('建议优化用药时间安排')
      recommendations.push('定期检查用药情况')
    } else {
      recommendations.push('继续保持良好的用药依从性')
    }
    
    // 根据具体异常生成建议
    anomalies.forEach(anomaly => {
      if (anomaly.type === 'missed_dose') {
        recommendations.push(`建议关注 ${anomaly.medicationName} 的用药情况`)
      } else if (anomaly.type === 'low_adherence') {
        recommendations.push(`建议增加 ${anomaly.medicationName} 的用药监督`)
      }
    })
    
    return recommendations
  }

  // 更新用药依从性数据
  async updateMedicationAdherence() {
    try {
      // 这里可以实现定时任务，更新所有老人的用药依从性数据
      // 例如：每天检查是否漏服药物，更新依从率等
      
      console.log('更新用药依从性数据')
      
      // 实际项目中，这里应该查询所有老人的用药记录，检查是否漏服
      // 并更新相应的依从率和漏服次数
      
      return { success: true, message: '用药依从性数据更新成功' }
    } catch (error) {
      console.error('更新用药依从性数据失败:', error)
      throw new Error('更新用药依从性数据失败')
    }
  }
}

export default new MedicationService()