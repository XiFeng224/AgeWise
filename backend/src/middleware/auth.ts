import { Request, Response, NextFunction } from 'express'
import { tokenService } from '../services/tokenService'

interface AuthUser {
  userId: number
  username: string
  role: string
  realName: string
  [key: string]: any
}

interface TokenUserPayload {
  userId: number
  username: string
  role: string
  realName?: string
  [key: string]: any
}

interface AuthRequest extends Request {
  user?: AuthUser
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '访问令牌缺失或格式错误'
      })
    }

    const token = authHeader.substring(7)
    
    try {
      // 检查令牌是否在黑名单中
      if (await tokenService.isTokenBlacklisted(token)) {
        return res.status(401).json({
          error: '访问令牌已被注销'
        })
      }

      // 验证令牌
      const decoded = tokenService.verifyAccessToken(token) as TokenUserPayload | null
      if (!decoded) {
        return res.status(401).json({
          error: '访问令牌无效或已过期'
        })
      }

      req.user = decoded as AuthUser
      next()
    } catch (error) {
      return res.status(401).json({
        error: '访问令牌无效或已过期'
      })
    }
  } catch (error) {
    console.error('认证中间件错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '用户未认证'
      })
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: '权限不足'
      })
    }

    next()
  }
}

// 权限中间件 - 检查用户是否是资源的所有者或管理员
export const authorizeOwnerOrAdmin = (resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '用户未认证'
      })
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next()
    }

    // 根据资源类型检查所有权
    try {
      // 这里可以根据具体的资源类型实现不同的所有权检查逻辑
      // 例如，检查老人信息的网格员权限
      if (resourceType === 'elderly') {
        const elderlyId = req.params.id || req.body.elderlyId
        // 这里可以添加具体的数据库查询来检查所有权
        // 暂时简化处理，允许网格员访问
        if (req.user.role === 'grid') {
          return next()
        }
      }

      return res.status(403).json({
        error: '权限不足'
      })
    } catch (error) {
      console.error('权限检查错误:', error)
      return res.status(500).json({
        error: '服务器内部错误'
      })
    }
  }
}