import { Response } from 'express'

function resolveTraceId(res: Response) {
  const fromLocals = (res.locals && res.locals.traceId) ? String(res.locals.traceId) : ''
  const fromHeader = String(res.getHeader('x-trace-id') || '')
  return fromLocals || fromHeader || undefined
}

export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  message = '操作成功',
  statusCode = 200
) => {
  const traceId = resolveTraceId(res)

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(traceId ? { traceId } : {})
  })
}

export const sendError = (
  res: Response,
  error: string,
  statusCode = 500,
  details?: unknown
) => {
  const traceId = resolveTraceId(res)

  return res.status(statusCode).json({
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
    ...(traceId ? { traceId } : {})
  })
}
