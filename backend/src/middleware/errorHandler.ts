import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response'

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const traceId = req.traceId
  const logPrefix = traceId ? `[traceId=${traceId}]` : ''

  console.error(`${logPrefix} 错误详情:`, error)

  if (error.name === 'SequelizeValidationError') {
    const details = error.errors.map((err: any) => ({
      field: err.path,
      message: err.message
    }))

    return sendError(res, '数据验证失败', 400, details)
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, '数据已存在', 400, `${error.errors[0].path} 已存在`)
  }

  if (error.name === 'SequelizeDatabaseError') {
    return sendError(res, '数据库错误', 500, '数据库操作失败')
  }

  if (error.name === 'JsonWebTokenError') {
    return sendError(res, '令牌无效', 401)
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, '令牌已过期', 401)
  }

  if (error.statusCode) {
    return sendError(res, error.message, error.statusCode)
  }

  return sendError(
    res,
    '服务器内部错误',
    500,
    process.env.NODE_ENV === 'development' ? error.message : '请联系系统管理员'
  )
}
