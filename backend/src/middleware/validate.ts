import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response'

type Rule = {
  type: 'number' | 'string' | 'boolean'
  required?: boolean
  min?: number
  max?: number
  enum?: Array<string | number | boolean>
  trim?: boolean
}

type Schema = Record<string, Rule>

function checkValue(field: string, value: any, rule: Rule): string | null {
  if (value === undefined || value === null) {
    return rule.required ? `${field}为必填项` : null
  }

  if (rule.type === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) return `${field}必须为数字`
    if (rule.min !== undefined && n < rule.min) return `${field}不能小于${rule.min}`
    if (rule.max !== undefined && n > rule.max) return `${field}不能大于${rule.max}`
    if (rule.enum && !rule.enum.includes(n)) return `${field}取值无效`
    return null
  }

  if (rule.type === 'string') {
    const s = String(value)
    const target = rule.trim ? s.trim() : s
    if (rule.required && target.length === 0) return `${field}不能为空`
    if (rule.min !== undefined && target.length < rule.min) return `${field}长度不能小于${rule.min}`
    if (rule.max !== undefined && target.length > rule.max) return `${field}长度不能大于${rule.max}`
    if (rule.enum && !rule.enum.includes(target)) return `${field}取值无效`
    return null
  }

  if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') return `${field}必须为布尔值`
    if (rule.enum && !rule.enum.includes(value)) return `${field}取值无效`
    return null
  }

  return null
}

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {}
    const errors: string[] = []

    for (const [field, rule] of Object.entries(schema)) {
      const err = checkValue(field, body[field], rule)
      if (err) errors.push(err)
    }

    if (errors.length > 0) {
      return sendError(res, '参数校验失败', 400, {
        traceId: req.traceId,
        errors
      })
    }

    next()
  }
}
