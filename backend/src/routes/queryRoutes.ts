import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { naturalLanguageQuery, getQuerySuggestions, getQueryHistory, advancedSearch } from '../controllers/queryController'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 自然语言查询
router.post('/natural', naturalLanguageQuery)

// 高级搜索
router.post('/advanced', advancedSearch)

// 获取查询建议
router.get('/suggestions', getQuerySuggestions)

// 获取查询历史
router.get('/history', getQueryHistory)

// 执行SQL查询（保留原有功能）
router.post('/execute', async (req, res) => {
  try {
    const { sql } = req.body
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL查询语句不能为空'
      })
    }

    // 安全检查：只允许SELECT查询
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        error: '只允许执行SELECT查询语句'
      })
    }

    // 模拟查询结果
    const mockData = [
      {
        id: 1,
        name: '张大爷',
        age: 78,
        gender: '男',
        phone: '13800000001',
        address: '幸福小区1栋101',
        healthStatus: '良好',
        riskLevel: '一般'
      },
      {
        id: 2,
        name: '李奶奶',
        age: 82,
        gender: '女',
        phone: '13800000002',
        address: '阳光小区2栋202',
        healthStatus: '一般',
        riskLevel: '较重'
      }
    ]

    return res.json({
      success: true,
      data: mockData,
      sql: sql,
      executionTime: '0.05s'
    })
  } catch (error) {
    console.error('SQL查询执行失败:', error)
    return res.status(500).json({
      success: false,
      error: '查询执行失败'
    })
  }
})

export default router