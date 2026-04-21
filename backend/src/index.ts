import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

import database, { testConnection } from './config/database'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler'
import { sendError, sendSuccess } from './utils/response'
import { CronService } from './services/cronService'
import { User, Elderly } from './models'
import bcrypt from 'bcryptjs'
import { requestContext } from './middleware/requestContext'
import { createRateLimiter } from './middleware/rateLimit'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8003
const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true'

app.set('trust proxy', 1)

const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 300, keyPrefix: 'global' })
const agentLimiter = createRateLimiter({ windowMs: 60_000, max: 40, keyPrefix: 'agent' })

// 中间件配置
app.use(requestContext)
app.use(helmet())
app.use(compression())
app.use(cors())
app.use(globalLimiter)
app.use('/api/agent-vnext', agentLimiter)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use('/uploads', express.static('uploads'))

// 路由配置
app.use('/api', routes)

// 健康检查端点
app.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// 错误处理中间件
app.use(errorHandler)

// 404 处理
app.use('*', (req, res) => {
  return sendError(res, 'Route not found', 404, { path: req.originalUrl, traceId: req.traceId })
})

// 创建 HTTP 服务器
const server = createServer(app)

// WebSocket 服务器
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
})

wss.on('connection', (ws) => {
  console.log('WebSocket 客户端连接成功')
  
  ws.on('message', (message) => {
    console.log('收到消息:', message.toString())
    // 处理实时消息
    ws.send(JSON.stringify({
      type: 'ack',
      message: '消息接收成功',
      timestamp: new Date().toISOString()
    }))
  })

  ws.on('close', () => {
    console.log('WebSocket 客户端断开连接')
  })
})

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库连接
    await testConnection()
    console.log('数据库连接成功')
    
    // 同步数据库模型（默认关闭 alter，避免启动时全表结构比对影响性能）
    await database.sync({ alter: shouldAlterSchema })
    console.log(`数据库同步完成（alter=${shouldAlterSchema}）`)
    
    // 创建默认管理员账号
    await createDefaultUsers()
    
    // 创建默认老人数据
    await createDefaultElderly()
    
    // 启动定时任务
    CronService.getInstance().start()
    
    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`)
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`)
      console.log(`API文档: http://localhost:${PORT}/api/docs`)
    })
  } catch (error) {
    console.error('服务器启动失败:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

// 创建默认用户账号
async function createDefaultUsers() {
  try {
    // 检查是否已存在管理员账号
    const existingAdmin = await User.findOne({ where: { role: 'admin' } })
    
    if (!existingAdmin) {
      // 加密密码
      const hashedPassword = await bcrypt.hash('123456', 12)
      
      // 创建默认管理员账号
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@elderlycare.com',
        phone: '13800000000',
        role: 'admin',
        realName: '系统管理员',
        isActive: true
      })
      
      console.log('默认管理员账号创建成功: admin / 123456')
    }
    
    // 检查是否已存在社区管理员账号
    const existingManager = await User.findOne({ where: { role: 'manager' } })
    
    if (!existingManager) {
      // 加密密码
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      // 创建默认社区管理员账号
      await User.create({
        username: 'manager1',
        password: hashedPassword,
        email: 'manager1@elderlycare.com',
        phone: '13800000001',
        role: 'manager',
        realName: '社区管理员张三',
        isActive: true
      })
      
      console.log('默认社区管理员账号创建成功: manager1 / admin123')
    }
    
    // 检查是否已存在网格员账号
    const existingGrid = await User.findOne({ where: { role: 'grid' } })
    
    if (!existingGrid) {
      // 加密密码
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      // 创建默认网格员账号
      await User.create({
        username: 'grid1',
        password: hashedPassword,
        email: 'grid1@elderlycare.com',
        phone: '13800000002',
        role: 'grid',
        realName: '网格员李四',
        isActive: true
      })
      
      console.log('默认网格员账号创建成功: grid1 / admin123')
    }
  } catch (error) {
    console.error('创建默认用户账号失败:', error)
  }
}

// 创建默认老人数据
async function createDefaultElderly() {
  try {
    // 检查是否已存在老人数据
    const existingElderly = await Elderly.count()
    
    if (existingElderly === 0) {
      // 获取网格员用户ID
      const gridUser = await User.findOne({ where: { role: 'grid' } })
      if (!gridUser) {
        console.error('创建默认老人数据失败: 未找到网格员用户')
        return
      }
      
      // 创建默认老人数据
      const elderlyData = [
        {
          name: '张大爷',
          age: 78,
          gender: 'male' as const,
          idCard: '110101194701011234',
          phone: '13800001234',
          address: '幸福小区1栋101室',
          emergencyContact: '张小明',
          emergencyPhone: '13800005678',
          healthStatus: 'good' as const,
          riskLevel: 'low' as const,
          isAlone: true,
          gridMemberId: gridUser.id,
          notes: '独居老人，身体状况良好'
        },
        {
          name: '李奶奶',
          age: 82,
          gender: 'female' as const,
          idCard: '110101194402022345',
          phone: '13800002345',
          address: '幸福小区2栋202室',
          emergencyContact: '李小红',
          emergencyPhone: '13800006789',
          healthStatus: 'fair' as const,
          riskLevel: 'medium' as const,
          isAlone: true,
          gridMemberId: gridUser.id,
          notes: '独居老人，有高血压'
        },
        {
          name: '王大爷',
          age: 75,
          gender: 'male' as const,
          idCard: '110101195103033456',
          phone: '13800003456',
          address: '幸福小区3栋303室',
          emergencyContact: '王小明',
          emergencyPhone: '13800007890',
          healthStatus: 'excellent' as const,
          riskLevel: 'low' as const,
          isAlone: false,
          gridMemberId: gridUser.id,
          notes: '与子女同住，身体状况良好'
        },
        {
          name: '赵奶奶',
          age: 85,
          gender: 'female' as const,
          idCard: '110101194104044567',
          phone: '13800004567',
          address: '幸福小区4栋404室',
          emergencyContact: '赵小红',
          emergencyPhone: '13800008901',
          healthStatus: 'poor' as const,
          riskLevel: 'high' as const,
          isAlone: true,
          gridMemberId: gridUser.id,
          notes: '独居老人，有多种慢性疾病'
        },
        {
          name: '钱大爷',
          age: 72,
          gender: 'male' as const,
          idCard: '110101195405055678',
          phone: '13800005678',
          address: '幸福小区5栋505室',
          emergencyContact: '钱小明',
          emergencyPhone: '13800009012',
          healthStatus: 'good' as const,
          riskLevel: 'low' as const,
          isAlone: false,
          gridMemberId: gridUser.id,
          notes: '与老伴同住，身体状况良好'
        }
      ]
      
      // 批量创建老人数据
      await Elderly.bulkCreate(elderlyData)
      console.log('默认老人数据创建成功: 5位老人')
    }
  } catch (error) {
    console.error('创建默认老人数据失败:', error)
  }
}

startServer()

export default app