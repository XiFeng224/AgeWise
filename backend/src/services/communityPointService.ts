import { CommunityPoint, PointTransaction, Elderly } from '../models'
import { Op } from 'sequelize'

class CommunityPointService {
  // 获取老人的积分
  async getElderlyPoints(elderlyId: number) {
    try {
      let communityPoint = await CommunityPoint.findOne({ where: { elderlyId } })

      // 如果没有积分记录，创建一个
      if (!communityPoint) {
        communityPoint = await CommunityPoint.create({
          elderlyId,
          points: 0,
          lastUpdated: new Date()
        })
      }

      return { success: true, data: communityPoint }
    } catch (error) {
      console.error('获取老人积分失败:', error)
      throw new Error('获取老人积分失败')
    }
  }

  // 增加积分
  async earnPoints(elderlyId: number, amount: number, reason: string) {
    try {
      // 验证老人存在
      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人信息不存在')
      }

      // 获取或创建积分记录
      let communityPoint = await CommunityPoint.findOne({ where: { elderlyId } })
      if (!communityPoint) {
        communityPoint = await CommunityPoint.create({
          elderlyId,
          points: 0,
          lastUpdated: new Date()
        })
      }

      // 更新积分
      const newPoints = communityPoint.points + amount
      await communityPoint.update({
        points: newPoints,
        lastUpdated: new Date()
      })

      // 记录交易
      await PointTransaction.create({
        elderlyId,
        type: 'earn',
        amount,
        reason,
        transactionDate: new Date()
      })

      return { success: true, data: {
        points: newPoints,
        transaction: {
          type: 'earn',
          amount,
          reason
        }
      }}
    } catch (error) {
      console.error('增加积分失败:', error)
      throw new Error('增加积分失败')
    }
  }

  // 消费积分
  async spendPoints(elderlyId: number, amount: number, reason: string) {
    try {
      // 获取积分记录
      const communityPoint = await CommunityPoint.findOne({ where: { elderlyId } })
      if (!communityPoint) {
        throw new Error('老人积分记录不存在')
      }

      // 检查积分是否足够
      if (communityPoint.points < amount) {
        throw new Error('积分不足')
      }

      // 更新积分
      const newPoints = communityPoint.points - amount
      await communityPoint.update({
        points: newPoints,
        lastUpdated: new Date()
      })

      // 记录交易
      await PointTransaction.create({
        elderlyId,
        type: 'spend',
        amount,
        reason,
        transactionDate: new Date()
      })

      return { success: true, data: {
        points: newPoints,
        transaction: {
          type: 'spend',
          amount,
          reason
        }
      }}
    } catch (error) {
      console.error('消费积分失败:', error)
      throw new Error('消费积分失败')
    }
  }

  // 获取积分交易记录
  async getTransactionHistory(elderlyId: number, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const transactions = await PointTransaction.findAll({
        where: {
          elderlyId,
          transactionDate: { [Op.gte]: startDate }
        },
        order: [['transactionDate', 'DESC']]
      })

      return { success: true, data: transactions }
    } catch (error) {
      console.error('获取积分交易记录失败:', error)
      throw new Error('获取积分交易记录失败')
    }
  }

  // 批量为老人添加健康打卡积分
  async awardHealthCheckinPoints(elderlyIds: number[]) {
    try {
      const results = []

      for (const elderlyId of elderlyIds) {
        try {
          const result = await this.earnPoints(
            elderlyId,
            10, // 健康打卡奖励10积分
            '每日健康打卡'
          )
          results.push({ elderlyId, success: true, data: result.data })
        } catch (error) {
          results.push({ elderlyId, success: false, error: error.message })
        }
      }

      return { success: true, data: results }
    } catch (error) {
      console.error('批量添加健康打卡积分失败:', error)
      throw new Error('批量添加健康打卡积分失败')
    }
  }

  // 批量为老人添加活动参与积分
  async awardActivityParticipationPoints(elderlyIds: number[], activityName: string, points: number = 20) {
    try {
      const results = []

      for (const elderlyId of elderlyIds) {
        try {
          const result = await this.earnPoints(
            elderlyId,
            points,
            `参与${activityName}`
          )
          results.push({ elderlyId, success: true, data: result.data })
        } catch (error) {
          results.push({ elderlyId, success: false, error: error.message })
        }
      }

      return { success: true, data: results }
    } catch (error) {
      console.error('批量添加活动参与积分失败:', error)
      throw new Error('批量添加活动参与积分失败')
    }
  }

  // 获取积分排行榜
  async getPointsRanking(limit: number = 10) {
    try {
      const rankings = await CommunityPoint.findAll({
        include: [
          {
            model: Elderly,
            as: 'elderly',
            attributes: ['name', 'age', 'address']
          }
        ],
        order: [['points', 'DESC']],
        limit
      })

      return { success: true, data: rankings }
    } catch (error) {
      console.error('获取积分排行榜失败:', error)
      throw new Error('获取积分排行榜失败')
    }
  }

  // 积分兑换服务
  async redeemService(elderlyId: number, serviceName: string, pointsRequired: number) {
    try {
      // 消费积分
      const spendResult = await this.spendPoints(
        elderlyId,
        pointsRequired,
        `兑换${serviceName}`
      )

      // 这里可以添加服务预约逻辑
      // 例如创建一个服务请求

      return { success: true, data: {
        ...spendResult.data,
        serviceName,
        pointsRequired
      }}
    } catch (error) {
      console.error('积分兑换服务失败:', error)
      throw new Error('积分兑换服务失败')
    }
  }

  // 获取可兑换的服务列表
  async getRedeemableServices() {
    try {
      // 这里返回预设的可兑换服务列表
      const services = [
        {
          id: 1,
          name: '代买菜',
          description: '志愿者代为购买日常蔬菜',
          points: 50,
          duration: '30分钟'
        },
        {
          id: 2,
          name: '打扫卫生',
          description: '志愿者上门打扫卫生',
          points: 100,
          duration: '1小时'
        },
        {
          id: 3,
          name: '陪伴聊天',
          description: '志愿者上门陪伴聊天',
          points: 80,
          duration: '1小时'
        },
        {
          id: 4,
          name: '健康咨询',
          description: '医生提供健康咨询服务',
          points: 150,
          duration: '30分钟'
        },
        {
          id: 5,
          name: '理发服务',
          description: '专业理发师上门理发',
          points: 120,
          duration: '45分钟'
        }
      ]

      return { success: true, data: services }
    } catch (error) {
      console.error('获取可兑换服务列表失败:', error)
      throw new Error('获取可兑换服务列表失败')
    }
  }
}

export default new CommunityPointService()