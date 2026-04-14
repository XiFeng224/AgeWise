import { Router } from 'express'
import authRoutes from './authRoutes'
import elderlyRoutes from './elderlyRoutes'
import warningRoutes from './warningRoutes'
import queryRoutes from './queryRoutes'
import statisticsRoutes from './statisticsRoutes'
import systemRoutes from './systemRoutes'
import healthRoutes from './healthRoutes'
import notificationRoutes from './notificationRoutes'
import agentRoutes from './agentRoutes'
import aiAgentRoutes from './aiAgentRoutes'
import agentVNextRoutes from './agentVNextRoutes'

const router = Router()

// API 路由分组
router.use('/auth', authRoutes)
router.use('/elderly', elderlyRoutes)
router.use('/warnings', warningRoutes)
router.use('/query', queryRoutes)
router.use('/statistics', statisticsRoutes)
router.use('/system', systemRoutes)
router.use('/health', healthRoutes)
router.use('/notifications', notificationRoutes)
router.use('/agent', agentRoutes)
router.use('/ai-agent', aiAgentRoutes)
router.use('/agent-vnext', agentVNextRoutes)

// API 文档路由
router.get('/docs', (req, res) => {
  res.json({
    message: '社区养老数据查询与风险预警系统 API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': '用户登录',
        'POST /api/auth/register': '用户注册',
        'GET /api/auth/profile': '获取用户信息',
        'PUT /api/auth/profile': '更新用户信息',
        'POST /api/auth/refresh': '刷新访问令牌',
        'POST /api/auth/logout': '用户注销'
      },
      elderly: {
        'GET /api/elderly': '获取老人列表',
        'POST /api/elderly': '创建老人信息',
        'GET /api/elderly/:id': '获取老人详情',
        'PUT /api/elderly/:id': '更新老人信息',
        'DELETE /api/elderly/:id': '删除老人信息'
      },
      warnings: {
        'GET /api/warnings': '获取预警列表',
        'POST /api/warnings': '创建预警记录',
        'PUT /api/warnings/:id': '更新预警状态',
        'GET /api/warnings/stats': '预警统计'
      },
      health: {
        'POST /api/health/realtime/ingest': '实时监测数据接入并自动生成医疗建议',
        'GET /api/health/realtime/:elderlyId/summary': '获取老人实时健康摘要与通俗建议',
        'POST /api/health/health-data': '处理设备上传的健康数据',
        'POST /api/health/health-data/batch': '批量处理健康数据',
        'GET /api/health/health-data/:elderlyId': '获取老人健康数据历史',
        'GET /api/health/health-data/:elderlyId/trend': '分析老人健康数据趋势',
        'POST /api/health/activity': '记录老人活动',
        'POST /api/health/activity/batch': '批量记录活动',
        'GET /api/health/activity/:elderlyId': '获取老人活动轨迹历史',
        'GET /api/health/activity/:elderlyId/pattern': '分析老人活动规律',
        'GET /api/health/activity/:elderlyId/anomalies': '检测老人异常活动模式',
        'POST /api/health/emotion/voice': '分析语音情感',
        'POST /api/health/emotion/text': '分析文本情感',
        'GET /api/health/emotion/:elderlyId/trend': '获取情绪趋势',
        'GET /api/health/emotion/:elderlyId/report': '生成情绪分析报告',
        'POST /api/health/cognitive/test': '创建认知测试',
        'GET /api/health/cognitive/:elderlyId/history': '获取认知测试历史',
        'GET /api/health/cognitive/:elderlyId/trend': '分析认知衰退趋势',
        'GET /api/health/cognitive/:elderlyId/report': '生成认知测试报告',
        'GET /api/health/cognitive/test/generate': '生成游戏化认知测试任务',
        'POST /api/health/medication': '添加用药记录',
        'POST /api/health/medication/taken': '记录用药',
        'GET /api/health/medication/:elderlyId': '获取用药列表',
        'GET /api/health/medication/:elderlyId/adherence': '分析用药依从性',
        'GET /api/health/medication/:elderlyId/anomalies': '检测用药异常',
        'GET /api/health/medication/:elderlyId/report': '生成用药依从性报告',
        'GET /api/health/risk/fall/:elderlyId': '预测跌倒风险',
        'GET /api/health/risk/stroke/:elderlyId': '预测中风风险',
        'GET /api/health/risk/medication/:elderlyId': '分析用药依从性',
        'GET /api/health/risk/report/:elderlyId': '生成综合健康风险报告',
        'GET /api/health/reports/health/:elderlyId': '生成健康报告',
        'GET /api/health/reports/activity/:elderlyId': '生成活动报告'
      },
      notifications: {
        'GET /api/notifications': '获取通知列表',
        'GET /api/notifications/unread': '获取未读通知',
        'GET /api/notifications/unread/count': '获取未读通知数量',
        'PUT /api/notifications/:id/read': '标记通知为已读',
        'PUT /api/notifications/read-all': '标记所有通知为已读',
        'DELETE /api/notifications/:id': '删除通知'
      },
      query: {
        'POST /api/query/natural': '自然语言查询',
        'GET /api/query/history': '查询历史'
      },
      statistics: {
        'GET /api/statistics/overview': '系统概览统计',
        'GET /api/statistics/elderly': '老人数据统计',
        'GET /api/statistics/services': '服务统计'
      }
    }
  })
})

export default router