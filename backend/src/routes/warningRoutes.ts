import { Router } from 'express'
import {
  getWarnings,
  getWarningById,
  createWarning,
  updateWarning,
  getWarningStats,
  triggerManualCheck
} from '../controllers/warningController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取预警列表
router.get('/', getWarnings)

// 获取预警统计（注意：需放在 /:id 前面）
router.get('/stats/overview', getWarningStats)

// 手动触发风险检查
router.post('/check/manual', authorize(['admin', 'manager']), triggerManualCheck)

// 获取预警详情
router.get('/:id', getWarningById)

// 创建预警记录（系统自动或手动）
router.post('/', authorize(['admin', 'manager']), createWarning)

// 更新预警状态
router.put('/:id', updateWarning)

export default router