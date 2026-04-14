import { Router } from 'express'
import { login, register, getProfile, updateProfile, refreshToken, logout } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

// 公开路由
router.post('/login', login)
router.post('/register', register)
router.post('/refresh', refreshToken)

// 需要认证的路由
router.get('/profile', (req, res, next) => {
  console.log('接收到 /auth/profile GET 请求')
  next()
}, authenticate, getProfile)
router.put('/profile', (req, res, next) => {
  console.log('接收到 /auth/profile PUT 请求')
  next()
}, authenticate, updateProfile)
router.post('/logout', authenticate, logout)

export default router