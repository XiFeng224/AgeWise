import nodeCron from 'node-cron'
import { Op } from 'sequelize'
import { Warning, Elderly } from '../models'
import agentVNextService from './agentVNextService'

export class CronService {
  private static instance: CronService

  public static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService()
    }
    return CronService.instance
  }

  public start() {
    // 每2小时执行一次风险检查
    nodeCron.schedule('0 */2 * * *', () => {
      this.checkElderlyRisks()
    })

    // 每天凌晨执行数据清理
    nodeCron.schedule('0 2 * * *', () => {
      this.cleanupOldData()
    })

    // 每周一凌晨3点执行Agent策略更新
    nodeCron.schedule('0 3 * * 1', () => {
      this.weeklyAgentPolicyUpdate()
    })

    console.log('定时任务服务已启动')
  }

  private async checkElderlyRisks() {
    try {
      console.log('开始执行风险检查...')
      
      // 检查独居老人长时间无出入
      await this.checkAloneElderlyMovement()
      
      // 检查健康指标异常
      await this.checkHealthAbnormalities()
      
      console.log('风险检查完成')
    } catch (error) {
      console.error('风险检查失败:', error)
    }
  }

  private async checkAloneElderlyMovement() {
    // 模拟实现 - 实际应该检查门禁记录
    const aloneElderly = await Elderly.findAll({
      where: { isAlone: true }
    })

    console.log(`发现 ${aloneElderly.length} 位独居老人需要检查`)
  }

  private async checkHealthAbnormalities() {
    // 模拟实现 - 实际应该检查健康记录
    console.log('检查健康指标异常...')
  }

  private async weeklyAgentPolicyUpdate() {
    try {
      const result = await agentVNextService.weeklyPolicyUpdate()
      console.log('Agent每周策略更新完成:', result)
    } catch (error) {
      console.error('Agent每周策略更新失败:', error)
    }
  }

  private async cleanupOldData() {
    try {
      // 清理30天前的已处理预警
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const deletedCount = await Warning.destroy({
      where: {
        status: 'resolved',
        handle_time: { [Op.lt]: thirtyDaysAgo }
      }
    })

      console.log(`清理了 ${deletedCount} 条过期预警记录`)
    } catch (error) {
      console.error('数据清理失败:', error)
    }
  }
}