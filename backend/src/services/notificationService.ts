import { Notification, User, Warning, Elderly } from '../models'
import { Op } from 'sequelize'

class NotificationService {
  /**
   * 发送通知
   * @param userId 用户ID
   * @param title 通知标题
   * @param content 通知内容
   * @param type 通知类型
   * @param relatedId 相关ID
   */
  async sendNotification(userId: number, title: string, content: string, type: string, relatedId?: number): Promise<Notification> {
    try {
      const notification = await Notification.create({
        userId,
        title,
        content,
        type,
        relatedId,
        isRead: false
      })

      return notification
    } catch (error) {
      console.error('发送通知失败:', error)
      throw error
    }
  }

  /**
   * 批量发送通知
   * @param userIds 用户ID数组
   * @param title 通知标题
   * @param content 通知内容
   * @param type 通知类型
   * @param relatedId 相关ID
   */
  async sendBatchNotification(userIds: number[], title: string, content: string, type: string, relatedId?: number): Promise<Notification[]> {
    try {
      const notifications = await Promise.all(
        userIds.map(userId => this.sendNotification(userId, title, content, type, relatedId))
      )

      return notifications
    } catch (error) {
      console.error('批量发送通知失败:', error)
      throw error
    }
  }

  /**
   * 发送预警通知
   * @param warning 预警对象
   */
  async sendWarningNotification(warning: any): Promise<void> {
    try {
      // 获取老人信息
      const elderly = await Elderly.findByPk(warning.elderlyId)
      if (!elderly) return

      // 获取网格员信息
      const gridMember = await User.findByPk(elderly.gridMemberId)
      if (gridMember) {
        // 发送通知给网格员
        await this.sendNotification(
          gridMember.id,
          '新预警通知',
          `老人 ${elderly.name} 出现 ${warning.riskLevel} 风险，请及时处理`,
          'warning',
          warning.id
        )
      }

      // 获取管理员信息
      const admins = await User.findAll({ where: { role: 'admin' } })
      await Promise.all(
        admins.map((admin) =>
          this.sendNotification(
            admin.id,
            '新预警通知',
            `老人 ${elderly.name} 出现 ${warning.riskLevel} 风险，请关注处理情况`,
            'warning',
            warning.id
          )
        )
      )
    } catch (error) {
      console.error('发送预警通知失败:', error)
    }
  }

  /**
   * 获取用户的通知列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @param isRead 是否已读
   */
  async getUserNotifications(userId: number, page: number = 1, limit: number = 20, isRead?: boolean): Promise<{ total: number; notifications: Notification[] }> {
    try {
      const where: any = { userId }
      if (isRead !== undefined) {
        where.isRead = isRead
      }

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      })

      return {
        total: count,
        notifications
      }
    } catch (error) {
      console.error('获取用户通知失败:', error)
      throw error
    }
  }

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @param userId 用户ID
   */
  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId }
      })

      if (!notification) {
        throw new Error('通知不存在')
      }

      notification.isRead = true
      await notification.save()

      return notification
    } catch (error) {
      console.error('标记通知为已读失败:', error)
      throw error
    }
  }

  /**
   * 标记所有通知为已读
   * @param userId 用户ID
   */
  async markAllAsRead(userId: number): Promise<void> {
    try {
      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      )
    } catch (error) {
      console.error('标记所有通知为已读失败:', error)
      throw error
    }
  }

  /**
   * 删除通知
   * @param notificationId 通知ID
   * @param userId 用户ID
   */
  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    try {
      const result = await Notification.destroy({
        where: { id: notificationId, userId }
      })

      if (result === 0) {
        throw new Error('通知不存在')
      }
    } catch (error) {
      console.error('删除通知失败:', error)
      throw error
    }
  }

  /**
   * 获取用户未读通知数量
   * @param userId 用户ID
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const count = await Notification.count({
        where: { userId, isRead: false }
      })

      return count
    } catch (error) {
      console.error('获取未读通知数量失败:', error)
      return 0
    }
  }

  /**
   * 清理过期通知
   * @param days 天数
   */
  async cleanExpiredNotifications(days: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      await Notification.destroy({
        where: {
          createdAt: {
            [Op.lt]: cutoffDate
          }
        }
      })
    } catch (error) {
      console.error('清理过期通知失败:', error)
    }
  }
}

// 导出单例实例
export const notificationService = new NotificationService()
export default notificationService
