import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models'
import { tokenService } from '../services/tokenService'
import { sendError, sendSuccess } from '../utils/response'

const loginAttempts = new Map<string, { count: number; lastAttemptAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCK_MS = 10 * 60 * 1000

const getClientKey = (req: Request, username: string) => `${req.ip || 'unknown'}:${username}`

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return sendError(res, '用户名和密码不能为空', 400)
    }

    const clientKey = getClientKey(req, username)
    const attempt = loginAttempts.get(clientKey)
    if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS && (Date.now() - attempt.lastAttemptAt) < LOGIN_LOCK_MS) {
      return sendError(res, '登录失败次数过多，请10分钟后重试', 429)
    }

    const user = await User.findOne({ where: { username } })

    if (!user) {
      loginAttempts.set(clientKey, { count: (attempt?.count || 0) + 1, lastAttemptAt: Date.now() })
      return sendError(res, '用户名或密码错误', 401)
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      loginAttempts.set(clientKey, { count: (attempt?.count || 0) + 1, lastAttemptAt: Date.now() })
      return sendError(res, '用户名或密码错误', 401)
    }

    if (!user.isActive) {
      return sendError(res, '账户已被禁用，请联系管理员', 403)
    }

    await user.update({ lastLogin: new Date() })
    loginAttempts.delete(clientKey)

    const accessToken = tokenService.generateAccessToken(user)
    const refreshToken = tokenService.generateRefreshToken(user)

    return sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          realName: user.realName,
          avatar: user.avatar
        }
      },
      '登录成功'
    )
  } catch (error) {
    console.error('登录错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

// 刷新访问令牌
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, '刷新令牌不能为空', 400)
    }

    const newAccessToken = await tokenService.refreshAccessToken(refreshToken)
    if (!newAccessToken) {
      return sendError(res, '刷新令牌无效或已过期', 401)
    }

    return sendSuccess(res, { accessToken: newAccessToken }, '令牌刷新成功')
  } catch (error) {
    console.error('刷新令牌错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

// 注销令牌
export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, '访问令牌缺失或格式错误', 400)
    }

    const token = authHeader.substring(7)
    await tokenService.revokeToken(token)

    return sendSuccess(res, null, '注销成功')
  } catch (error) {
    console.error('注销错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, phone, realName, role = 'grid' } = req.body

    if (!username || !password || !email || !phone || !realName) {
      return sendError(res, '请填写所有必填字段', 400)
    }

    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return sendError(res, '用户名已存在', 400)
    }

    const existingEmail = await User.findOne({ where: { email } })
    if (existingEmail) {
      return sendError(res, '邮箱已存在', 400)
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      phone,
      realName,
      role
    })

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          realName: user.realName
        }
      },
      '注册成功',
      201
    )
  } catch (error) {
    console.error('注册错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    })

    if (!user) {
      return sendError(res, '用户不存在', 404)
    }

    return sendSuccess(res, { user })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId
    const { email, phone, realName, avatar } = req.body

    const user = await User.findByPk(userId)
    if (!user) {
      return sendError(res, '用户不存在', 404)
    }

    // 更新用户信息
    await user.update({
      email: email || user.email,
      phone: phone || user.phone,
      realName: realName || user.realName,
      avatar: avatar || user.avatar
    })

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          realName: user.realName,
          avatar: user.avatar
        }
      },
      '个人信息更新成功'
    )
  } catch (error) {
    console.error('更新用户信息错误:', error)
    return sendError(res, '服务器内部错误', 500)
  }
}