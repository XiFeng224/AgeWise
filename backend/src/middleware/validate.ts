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
    if (typeof value === 'boolean') {
      if (rule.enum && !rule.enum.includes(value)) return `${field}取值无效`
      return null
    }

    if (value === 'true' || value === 'false' || value === 1 || value === 0 || value === '1' || value === '0') {
      const normalized = value === 'true' || value === 1 || value === '1'
      if (rule.enum && !rule.enum.includes(normalized)) return `${field}取值无效`
      return null
    }

    return `${field}必须为布尔值`
  }

  return null
}

function validateSource(source: Record<string, any>, schema: Schema, req: Request, res: Response, next: NextFunction) {
  const errors: string[] = []

  for (const [field, rule] of Object.entries(schema)) {
    const err = checkValue(field, source[field], rule)
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

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    return validateSource(req.body || {}, schema, req, res, next)
  }
}

export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    return validateSource(req.query as Record<string, any>, schema, req, res, next)
  }
}

export function validateParams(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const source: Record<string, any> = {}
    for (const [key, rule] of Object.entries(schema)) {
      let value: any = req.params[key]
      if (rule.type === 'number' && value !== undefined) {
        value = Number(value)
      }
      source[key] = value
    }
    return validateSource(source, schema, req, res, next)
  }
}
