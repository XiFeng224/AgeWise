import { Router } from 'express'
import { 
  getStatistics, 
  getRiskStatistics, 
  getAgeDistribution, 
  getHealthStatusDistribution, 
  getRiskDistribution, 
  getServiceTrend, 
  predictRiskTrend, 
  predictHealthTrend, 
  getMonthlyReport 
} from '../controllers/statisticsController'
import { authenticate } from '../middleware/auth'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取统计数据
router.get('/', getStatistics)

// 仪表盘统计（兼容前端 dashboard 接口）
router.get('/dashboard', getStatistics)

// 获取风险统计数据
router.get('/risk', getRiskStatistics)

// 获取年龄分布
router.get('/age-distribution', getAgeDistribution)

// 获取健康状况分布
router.get('/health-status', getHealthStatusDistribution)

// 获取风险等级分布
router.get('/risk-distribution', getRiskDistribution)

// 获取服务趋势
router.get('/service-trend', getServiceTrend)

// 预测风险趋势
router.get('/predict-risk', predictRiskTrend)

// 预测健康趋势
router.get('/predict-health', predictHealthTrend)

// 获取月度报告
router.get('/monthly-report', getMonthlyReport)

export default router
