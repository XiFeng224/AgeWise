import { Router } from 'express'
import {
  getElderlyList,
  getElderlyById,
  createElderly,
  updateElderly,
  deleteElderly,
  getElderlyWarnings,
  getElderlyServices
} from '../controllers/elderlyController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取老人列表 - 管理员和社区管理员可以查看所有，网格员只能查看自己负责的
router.get('/', getElderlyList)

// 获取老人详情
router.get('/:id', getElderlyById)

// 创建老人信息 - 需要管理员或社区管理员权限
router.post('/', authorize(['admin', 'manager']), createElderly)

// 更新老人信息 - 管理员和社区管理员可以更新所有，网格员只能更新自己负责的
router.put('/:id', updateElderly)

// 删除老人信息 - 需要管理员权限
router.delete('/:id', authorize(['admin']), deleteElderly)

// 获取老人的预警记录
router.get('/:id/warnings', getElderlyWarnings)

// 获取老人的服务记录
router.get('/:id/services', getElderlyServices)

export default router