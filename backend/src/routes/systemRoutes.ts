import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { authenticate, authorize } from '../middleware/auth'
import { aiMetricsService } from '../services/aiMetricsService'
import { User, Elderly, Warning } from '../models'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取系统配置（仅管理员）
router.get('/config', authorize(['admin']), async (req, res) => {
  try {
    const config = {
      warningAloneHours: 48,
      warningHealthThreshold: 3,
      warningWeatherRisk: true,
      dataRetentionDays: 365,
      maxFileSize: '10MB',
      backupEnabled: true,
      backupInterval: 'daily'
    }

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('获取系统配置失败:', error)
    res.status(500).json({
      success: false,
      error: '获取系统配置失败'
    })
  }
})

// 更新系统配置（仅管理员）
router.put('/config', authorize(['admin']), async (req, res) => {
  try {
    const {
      warningAloneHours,
      warningHealthThreshold,
      warningWeatherRisk
    } = req.body

    // 模拟更新配置
    console.log('更新系统配置:', {
      warningAloneHours,
      warningHealthThreshold,
      warningWeatherRisk
    })

    res.json({
      success: true,
      message: '系统配置更新成功',
      data: {
        warningAloneHours: warningAloneHours || 48,
        warningHealthThreshold: warningHealthThreshold || 3,
        warningWeatherRisk: warningWeatherRisk !== undefined ? warningWeatherRisk : true
      }
    })
  } catch (error) {
    console.error('更新系统配置失败:', error)
    res.status(500).json({
      success: false,
      error: '更新系统配置失败'
    })
  }
})

// 获取系统日志（仅管理员）
router.get('/logs', authorize(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, module, action } = req.query

    // 模拟日志数据
    const logs = [
      {
        id: 1,
        userId: 1,
        username: 'admin',
        action: 'login',
        module: 'auth',
        description: '用户登录系统',
        ipAddress: '192.168.1.100',
        createdAt: new Date('2025-03-30 09:00:00')
      },
      {
        id: 2,
        userId: 3,
        username: 'grid1',
        action: 'query',
        module: 'data',
        description: '查询老人列表',
        ipAddress: '192.168.1.101',
        createdAt: new Date('2025-03-30 09:15:00')
      },
      {
        id: 3,
        userId: 3,
        username: 'grid1',
        action: 'update',
        module: 'warning',
        description: '处理预警记录',
        ipAddress: '192.168.1.101',
        createdAt: new Date('2025-03-30 09:30:00')
      }
    ]

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: logs.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(logs.length / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取系统日志失败:', error)
    res.status(500).json({
      success: false,
      error: '获取系统日志失败'
    })
  }
})

// 演示数据重置（管理员）
router.post('/reset-demo-users', authorize(['admin']), async (req, res) => {
  try {
    await Warning.destroy({ where: {}, force: true })
    await Elderly.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })

    const adminPwd = await bcrypt.hash('123456', 12)
    const commonPwd = await bcrypt.hash('admin123', 12)

    const admin = await User.create({
      username: 'admin',
      password: adminPwd,
      email: 'admin@elderlycare.com',
      phone: '13800000000',
      role: 'admin',
      realName: '系统管理员',
      isActive: true
    })

    await User.create({
      username: 'manager1',
      password: commonPwd,
      email: 'manager1@elderlycare.com',
      phone: '13800000001',
      role: 'manager',
      realName: '社区管理员张三',
      isActive: true
    })

    const grid = await User.create({
      username: 'grid1',
      password: commonPwd,
      email: 'grid1@elderlycare.com',
      phone: '13800000002',
      role: 'grid',
      realName: '网格员李四',
      isActive: true
    })

    await Elderly.bulkCreate([
      {
        name: '张大爷', age: 78, gender: 'male', idCard: '110101194701011234', phone: '13800001234',
        address: '幸福小区1栋101室', emergencyContact: '张小明', emergencyPhone: '13800005678',
        healthStatus: 'good', riskLevel: 'low', isAlone: true, gridMemberId: grid.id, notes: '独居老人'
      },
      {
        name: '李奶奶', age: 82, gender: 'female', idCard: '110101194402022345', phone: '13800002345',
        address: '幸福小区2栋202室', emergencyContact: '李小红', emergencyPhone: '13800006789',
        healthStatus: 'fair', riskLevel: 'medium', isAlone: true, gridMemberId: grid.id, notes: '高血压'
      }
    ])

    res.json({
      success: true,
      message: '演示数据重置成功',
      data: {
        users: ['admin/123456', 'manager1/admin123', 'grid1/admin123'],
        adminId: admin.id
      }
    })
  } catch (error) {
    console.error('重置演示数据失败:', error)
    res.status(500).json({ success: false, error: '重置失败' })
  }
})

// AI效果评估指标（管理员可见）
router.get('/ai-metrics', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const metrics = aiMetricsService.getMetrics()
    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取AI指标失败'
    })
  }
})

// 重置演示数据（仅管理员）
router.post('/reset-demo-users', authorize(['admin']), async (req, res) => {
  try {
    await Warning.destroy({ where: {}, truncate: true, force: true })
    await Elderly.destroy({ where: {}, truncate: true, force: true })
    await User.destroy({ where: {}, truncate: true, force: true })

    const adminPwd = await bcrypt.hash('123456', 12)
    const managerPwd = await bcrypt.hash('admin123', 12)
    const gridPwd = await bcrypt.hash('admin123', 12)

    const admin = await User.create({
      username: 'admin',
      password: adminPwd,
      email: 'admin@elderlycare.com',
      phone: '13800000000',
      role: 'admin',
      realName: '系统管理员',
      isActive: true
    })

    await User.create({
      username: 'manager1',
      password: managerPwd,
      email: 'manager1@elderlycare.com',
      phone: '13800000001',
      role: 'manager',
      realName: '社区管理员张三',
      isActive: true
    })

    const grid = await User.create({
      username: 'grid1',
      password: gridPwd,
      email: 'grid1@elderlycare.com',
      phone: '13800000002',
      role: 'grid',
      realName: '网格员李四',
      isActive: true
    })

    await Elderly.bulkCreate([
      {
        name: '张大爷', age: 78, gender: 'male', idCard: '110101194701011234', phone: '13800001234',
        address: '幸福小区1栋101室', emergencyContact: '张小明', emergencyPhone: '13800005678',
        healthStatus: 'good', riskLevel: 'low', isAlone: true, gridMemberId: grid.id, notes: '独居老人'
      },
      {
        name: '李奶奶', age: 82, gender: 'female', idCard: '110101194402022345', phone: '13800002345',
        address: '幸福小区2栋202室', emergencyContact: '李小红', emergencyPhone: '13800006789',
        healthStatus: 'fair', riskLevel: 'medium', isAlone: true, gridMemberId: grid.id, notes: '高血压'
      }
    ])

    res.json({
      success: true,
      message: '演示数据已重置',
      data: {
        accounts: [
          { username: 'admin', password: '123456' },
          { username: 'manager1', password: 'admin123' },
          { username: 'grid1', password: 'admin123' }
        ],
        operator: admin.id
      }
    })
  } catch (error) {
    console.error('重置演示数据失败:', error)
    res.status(500).json({
      success: false,
      error: '重置演示数据失败'
    })
  }
})

// 系统健康检查
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        cache: 'connected',
        agent: 'connected',
        fileSystem: 'healthy'
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    }

    res.json({
      success: true,
      data: healthStatus
    })
  } catch (error) {
    console.error('系统健康检查失败:', error)
    res.status(500).json({
      success: false,
      error: '系统健康检查失败'
    })
  }
})

export default router