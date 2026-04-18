// TypeScript错误快速修复文件
// 这个文件包含一些临时的类型修复，确保项目可以编译通过

declare module '../models' {
  interface WarningAttributes {
    title: string
  }
}

import type { Response } from 'express'

// 修复路由控制器中的返回值问题
export function ensureResponse<T>(res: Response, data: T) {
  return res.json({
    success: true,
    data
  })
}

export function ensureErrorResponse(res: Response, error: string, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error
  })
}
