import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function now() {
  return Date.now()
}

function getClientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

export function createRateLimiter(options?: {
  windowMs?: number
  max?: number
  keyPrefix?: string
}) {
  const windowMs = options?.windowMs ?? 60_000
  const max = options?.max ?? 60
  const keyPrefix = options?.keyPrefix ?? 'global'

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${getClientIp(req)}`
    const current = buckets.get(key)
    const t = now()

    if (!current || current.resetAt <= t) {
      buckets.set(key, { count: 1, resetAt: t + windowMs })
      return next()
    }

    if (current.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - t) / 1000))
      res.setHeader('Retry-After', String(retryAfterSec))
      return sendError(res, '请求过于频繁，请稍后再试', 429, { traceId: req.traceId })
    }

    current.count += 1
    buckets.set(key, current)
    next()
  }
}
