import jwt from 'jsonwebtoken'
import { cacheService } from './cacheService'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'elderly-care-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'elderly-care-refresh-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

interface TokenPayload {
  userId: number
  username: string
  role: string
}

class TokenService {
  /**
   * 生成访问令牌
   * @param user 用户信息
   * @returns 访问令牌
   */
  generateAccessToken(user: any): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
  }

  /**
   * 生成刷新令牌
   * @param user 用户信息
   * @returns 刷新令牌
   */
  generateRefreshToken(user: any): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    }

    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
  }

  /**
   * 验证访问令牌
   * @param token 访问令牌
   * @returns 解码后的令牌数据
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return null
    }
  }

  /**
   * 验证刷新令牌
   * @param token 刷新令牌
   * @returns 解码后的令牌数据
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
    } catch (error) {
      return null
    }
  }

  /**
   * 将令牌加入黑名单
   * @param token 令牌
   * @param expiresIn 过期时间（秒）
   */
  async blacklistToken(token: string, _expiresIn: number): Promise<void> {
    try {
      // 计算令牌的过期时间
      const decoded = jwt.decode(token) as any
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000)
        const tokenExpiry = decoded.exp
        const ttl = tokenExpiry - currentTime

        if (ttl > 0) {
          await cacheService.set(`blacklist:${token}`, true, ttl)
        }
      }
    } catch (error) {
      console.error('将令牌加入黑名单失败:', error)
    }
  }

  /**
   * 检查令牌是否在黑名单中
   * @param token 令牌
   * @returns 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await cacheService.get(`blacklist:${token}`)
      return result !== null
    } catch (error) {
      console.error('检查令牌黑名单失败:', error)
      return false
    }
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      // 检查刷新令牌是否在黑名单中
      if (await this.isTokenBlacklisted(refreshToken)) {
        return null
      }

      // 验证刷新令牌
      const decoded = this.verifyRefreshToken(refreshToken)
      if (!decoded) {
        return null
      }

      // 生成新的访问令牌
      const newAccessToken = this.generateAccessToken({
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      })

      // 将旧的刷新令牌加入黑名单
      await this.blacklistToken(refreshToken, 60 * 60 * 24 * 7) // 7天

      return newAccessToken
    } catch (error) {
      console.error('刷新访问令牌失败:', error)
      return null
    }
  }

  /**
   * 注销令牌
   * @param token 访问令牌
   */
  async revokeToken(token: string): Promise<void> {
    try {
      // 计算令牌的过期时间
      const decoded = jwt.decode(token) as any
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000)
        const tokenExpiry = decoded.exp
        const ttl = tokenExpiry - currentTime

        if (ttl > 0) {
          await cacheService.set(`blacklist:${token}`, true, ttl)
        }
      }
    } catch (error) {
      console.error('注销令牌失败:', error)
    }
  }
}

// 导出单例实例
export const tokenService = new TokenService()
export default tokenService
