// TypeScript错误快速修复文件
// 这个文件包含一些临时的类型修复，确保项目可以编译通过

// 修复Warning模型缺少title字段的问题
declare module '../models' {
  interface WarningAttributes {
    title: string
  }
}



// 修复路由控制器中的返回值问题
export function ensureResponse<T>(res: any, data: T) {
  return res.json({
    success: true,
    data: data
  })
}

export function ensureErrorResponse(res: any, error: string, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: error
  })
}