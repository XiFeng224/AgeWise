import { Request, Response } from 'express'
import { Notification } from '../models'
import { sendSuccess, sendError } from '../utils/response'

const getAuthUserId = (req: Request): number | null => {
  const user = (req as any).user || {}
  const raw = user.userId ?? user.id
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

// 获取通知列表
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string),
      offset
    })

    return sendSuccess(res, {
      list: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取通知列表失败:', error)
    return sendError(res, '获取通知列表失败', 500)
  }
}

// 获取未读通知
export const getUnreadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    const notifications = await Notification.findAll({
      where: { userId, isRead: false },
      order: [['createdAt', 'DESC']]
    })

    return sendSuccess(res, notifications)
  } catch (error) {
    console.error('获取未读通知失败:', error)
    return sendError(res, '获取未读通知失败', 500)
  }
}

// 获取未读通知数量
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    const count = await Notification.count({
      where: { userId, isRead: false }
    })

    return sendSuccess(res, count)
  } catch (error) {
    console.error('获取未读通知数量失败:', error)
    return sendError(res, '获取未读通知数量失败', 500)
  }
}

// 标记通知为已读
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    const notification = await Notification.findOne({
      where: { id, userId }
    })

    if (!notification) {
      return sendError(res, '通知不存在', 404)
    }

    await notification.update({ isRead: true })

    return sendSuccess(res, null, '标记已读成功')
  } catch (error) {
    console.error('标记通知已读失败:', error)
    return sendError(res, '标记通知已读失败', 500)
  }
}

// 标记所有通知为已读
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    )

    return sendSuccess(res, null, '全部标记已读成功')
  } catch (error) {
    console.error('标记全部已读失败:', error)
    return sendError(res, '标记全部已读失败', 500)
  }
}

// 删除通知
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = getAuthUserId(req)
    if (!userId) {
      return sendError(res, '用户未认证', 401)
    }

    const notification = await Notification.findOne({
      where: { id, userId }
    })

    if (!notification) {
      return sendError(res, '通知不存在', 404)
    }

    await notification.destroy()

    return sendSuccess(res, null, '删除通知成功')
  } catch (error) {
    console.error('删除通知失败:', error)
    return sendError(res, '删除通知失败', 500)
  }
}
