import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { 
  getNotifications, 
  getUnreadNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  getUnreadCount 
} from '../controllers/notificationController'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取通知列表
router.get('/', getNotifications)

// 获取未读通知
router.get('/unread', getUnreadNotifications)

// 获取未读通知数量
router.get('/unread/count', getUnreadCount)

// 标记通知为已读
router.put('/:id/read', markAsRead)

// 标记所有通知为已读
router.put('/read-all', markAllAsRead)

// 删除通知
router.delete('/:id', deleteNotification)

export default router
