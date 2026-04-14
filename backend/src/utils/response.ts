import { Response } from 'express'

export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  message = '操作成功',
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  })
}

export const sendError = (
  res: Response,
  error: string,
  statusCode = 500,
  details?: unknown
) => {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(details !== undefined ? { details } : {})
  })
}
