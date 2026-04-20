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
import { validateParams, validateQuery, validateBody } from '../middleware/validate'

const router = Router()

const validRiskLevels = ['low', 'medium', 'high', 'green', 'yellow', 'red', '低', '中', '高', '低风险', '中风险', '高风险'] as const
const isValidRiskLevelInput = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase()
  return validRiskLevels.includes(normalized as (typeof validRiskLevels)[number])
}

// 所有路由都需要认证
router.use(authenticate)

// 获取预警列表
router.get('/',
  validateQuery({
    page: { type: 'number', required: false, min: 1 },
    limit: { type: 'number', required: false, min: 1, max: 100 },
    status: { type: 'string', required: false, trim: true },
    riskLevel: { type: 'string', required: false, trim: true },
    elderlyName: { type: 'string', required: false, trim: true },
    startDate: { type: 'string', required: false, trim: true },
    endDate: { type: 'string', required: false, trim: true }
  }),
  getWarnings)

// 获取预警统计（注意：需放在 /:id 前面）
router.get('/stats/overview',
  validateQuery({
    startDate: { type: 'string', required: false, trim: true },
    endDate: { type: 'string', required: false, trim: true }
  }),
  getWarningStats)
router.get('/stats',
  validateQuery({
    startDate: { type: 'string', required: false, trim: true },
    endDate: { type: 'string', required: false, trim: true }
  }),
  getWarningStats)

// 手动触发风险检查
router.post('/check/manual', authorize(['admin', 'manager']), triggerManualCheck)

// 获取预警详情
router.get('/:id',
  validateParams({ id: { type: 'number', required: true, min: 1 } }),
  getWarningById)

// 创建预警记录（系统自动或手动）
router.post('/',
  authorize(['admin', 'manager']),
  validateBody({
    elderlyId: { type: 'number', required: true, min: 1 },
    warningType: { type: 'string', required: true, trim: true },
    riskLevel: { type: 'string', required: true, trim: true, validator: isValidRiskLevelInput },
    title: { type: 'string', required: true, min: 1, max: 200, trim: true },
    description: { type: 'string', required: true, min: 1, max: 1000, trim: true },
    triggerData: { type: 'string', required: false }
  }),
  createWarning)

// 更新预警状态
router.put('/:id',
  validateParams({ id: { type: 'number', required: true, min: 1 } }),
  validateBody({
    status: { type: 'string', required: false, enum: ['pending', 'processing', 'resolved'], trim: true },
    handleNotes: { type: 'string', required: false, trim: true },
    followUpAt: { type: 'string', required: false, trim: true },
    followUpResult: { type: 'string', required: false, trim: true }
  }),
  updateWarning)

export default router