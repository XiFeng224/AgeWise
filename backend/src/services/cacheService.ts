import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0')
}

class CacheService {
  private redis: Redis
  private isConnected: boolean = false

  constructor() {
    this.redis = new Redis(redisConfig)
    this.redis.on('connect', () => {
      console.log('Redis连接成功')
      this.isConnected = true
    })
    this.redis.on('error', (error) => {
      console.error('Redis连接失败:', error)
      this.isConnected = false
    })
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis未连接，跳过缓存设置')
      return
    }

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      await this.redis.set(key, stringValue, 'EX', ttl)
    } catch (error) {
      console.error('设置缓存失败:', error)
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  async get(key: string): Promise<unknown> {
    if (!this.isConnected) {
      console.warn('Redis未连接，跳过缓存获取')
      return null
    }

    try {
      const value = await this.redis.get(key)
      if (value) {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return null
    } catch (error) {
      console.error('获取缓存失败:', error)
      return null
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis未连接，跳过缓存删除')
      return
    }

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('删除缓存失败:', error)
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis未连接，跳过缓存清除')
      return
    }

    try {
      await this.redis.flushdb()
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 缓存用户信息
   * @param userId 用户ID
   * @param userInfo 用户信息
   */
  async cacheUser(userId: number, userInfo: { username: string; [key: string]: unknown }): Promise<void> {
    await this.set(`user:${userId}`, userInfo, 3600)
    await this.set(`user:username:${userInfo.username}`, userInfo, 3600)
  }

  /**
   * 获取缓存的用户信息
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getCachedUser(userId: number): Promise<unknown> {
    return await this.get(`user:${userId}`)
  }

  /**
   * 缓存老人信息
   * @param elderlyId 老人ID
   * @param elderlyInfo 老人信息
   */
  async cacheElderly(elderlyId: number, elderlyInfo: unknown): Promise<void> {
    await this.set(`elderly:${elderlyId}`, elderlyInfo, 1800)
  }

  /**
   * 获取缓存的老人信息
   * @param elderlyId 老人ID
   * @returns 老人信息
   */
  async getCachedElderly(elderlyId: number): Promise<unknown> {
    return await this.get(`elderly:${elderlyId}`)
  }

  /**
   * 缓存预警列表
   * @param key 缓存键
   * @param warnings 预警列表
   */
  async cacheWarnings(key: string, warnings: unknown[]): Promise<void> {
    await this.set(`warnings:${key}`, warnings, 600)
  }

  /**
   * 获取缓存的预警列表
   * @param key 缓存键
   * @returns 预警列表
   */
  async getCachedWarnings(key: string): Promise<unknown[]> {
    const result = await this.get(`warnings:${key}`)
    return Array.isArray(result) ? result : []
  }

  /**
   * 关闭Redis连接
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit()
      console.log('Redis连接已关闭')
    } catch (error) {
      console.error('关闭Redis连接失败:', error)
    }
  }
}

// 导出单例实例
export const cacheService = new CacheService()
export default cacheService
