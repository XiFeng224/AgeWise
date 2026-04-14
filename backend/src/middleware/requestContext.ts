import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      traceId?: string
      startedAt?: number
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-trace-id')
  const traceId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID()

  req.traceId = traceId
  req.startedAt = Date.now()
  res.locals.traceId = traceId
  res.setHeader('x-trace-id', traceId)

  next()
}
