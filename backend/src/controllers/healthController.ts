import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { HealthRecord, Elderly } from '../models'
import { cacheService } from '../services/cacheService'

export const createHealthRecord = async (req: Request, res: Response) => {
  try {
    const { elderlyId, recordType, recordDate, bloodPressure, bloodSugar, heartRate, temperature, weight, height, symptoms, diagnosis, medication, notes, recordedBy } = req.body

    // 验证必填字段
    if (!elderlyId || !recordType || !recordDate || !recordedBy) {
      return res.status(400).json({
        error: '请填写所有必填字段'
      })
    }

    // 检查老人是否存在
    const elderly = await Elderly.findByPk(elderlyId)
    if (!elderly) {
      return res.status(404).json({
        error: '老人不存在'
      })
    }

    // 创建健康档案
    const healthRecord = await HealthRecord.create({
      elderlyId,
      recordType,
      recordDate,
      bloodPressure,
      bloodSugar,
      heartRate,
      temperature,
      weight,
      height,
      symptoms,
      diagnosis,
      medication,
      notes,
      recordedBy
    })

    // 清除缓存
    await cacheService.delete(`healthRecords:${elderlyId}`)

    return res.status(201).json({
      message: '健康档案创建成功',
      healthRecord
    })
  } catch (error) {
    console.error('创建健康档案错误:', error)
    return res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const getHealthRecords = async (req: Request, res: Response) => {
  try {
    const { elderlyId, recordType, startDate, endDate, page = 1, limit = 10 } = req.query

    const where: any = {}
    if (elderlyId) {
      where.elderlyId = Number(elderlyId)
    }
    if (recordType) {
      where.recordType = recordType
    }
    if (startDate) {
      where.recordDate = {
        ...where.recordDate,
        [Op.gte]: new Date(startDate as string)
      }
    }
    if (endDate) {
      where.recordDate = {
        ...where.recordDate,
        [Op.lte]: new Date(endDate as string)
      }
    }

    // 尝试从缓存获取
    const cacheKey = `healthRecords:${elderlyId || 'all'}:${recordType || 'all'}:${startDate || 'all'}:${endDate || 'all'}:${page}:${limit}`
    const cachedData = await cacheService.get(cacheKey)
    if (cachedData) {
      return res.json(cachedData)
    }

    // 计算分页
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    // 查询健康档案
    const { count, rows: healthRecords } = await HealthRecord.findAndCountAll({
      where,
      order: [['recordDate', 'DESC']],
      limit: parseInt(limit as string),
      offset
    })

    const result = {
      total: count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      healthRecords
    }

    // 缓存结果
    await cacheService.set(cacheKey, result, 300)

    return res.json(result)
  } catch (error) {
    console.error('获取健康档案错误:', error)
    return res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const getHealthRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // 尝试从缓存获取
    const cacheKey = `healthRecord:${id}`
    const cachedData = await cacheService.get(cacheKey)
    if (cachedData) {
      return res.json(cachedData)
    }

    // 查询健康档案
    const healthRecord = await HealthRecord.findByPk(id, {
      include: [{ model: Elderly, as: 'elderly' }]
    })

    if (!healthRecord) {
      return res.status(404).json({
        error: '健康档案不存在'
      })
    }

    // 缓存结果
    await cacheService.set(cacheKey, healthRecord, 600)

    return res.json({
      healthRecord
    })
  } catch (error) {
    console.error('获取健康档案详情错误:', error)
    return res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const updateHealthRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { recordType, recordDate, bloodPressure, bloodSugar, heartRate, temperature, weight, height, symptoms, diagnosis, medication, notes, recordedBy } = req.body

    // 查询健康档案
    const healthRecord = await HealthRecord.findByPk(id)
    if (!healthRecord) {
      return res.status(404).json({
        error: '健康档案不存在'
      })
    }

    // 更新健康档案
    await healthRecord.update({
      recordType: recordType || healthRecord.recordType,
      recordDate: recordDate || healthRecord.recordDate,
      bloodPressure: bloodPressure !== undefined ? bloodPressure : healthRecord.bloodPressure,
      bloodSugar: bloodSugar !== undefined ? bloodSugar : healthRecord.bloodSugar,
      heartRate: heartRate !== undefined ? heartRate : healthRecord.heartRate,
      temperature: temperature !== undefined ? temperature : healthRecord.temperature,
      weight: weight !== undefined ? weight : healthRecord.weight,
      height: height !== undefined ? height : healthRecord.height,
      symptoms: symptoms !== undefined ? symptoms : healthRecord.symptoms,
      diagnosis: diagnosis !== undefined ? diagnosis : healthRecord.diagnosis,
      medication: medication !== undefined ? medication : healthRecord.medication,
      notes: notes !== undefined ? notes : healthRecord.notes,
      recordedBy: recordedBy || healthRecord.recordedBy
    })

    // 清除缓存
    await cacheService.delete(`healthRecord:${id}`)
    await cacheService.delete(`healthRecords:${healthRecord.elderlyId}`)

    return res.json({
      message: '健康档案更新成功',
      healthRecord
    })
  } catch (error) {
    console.error('更新健康档案错误:', error)
    return res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const deleteHealthRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // 查询健康档案
    const healthRecord = await HealthRecord.findByPk(id)
    if (!healthRecord) {
      return res.status(404).json({
        error: '健康档案不存在'
      })
    }

    const elderlyId = healthRecord.elderlyId

    // 删除健康档案
    await healthRecord.destroy()

    // 清除缓存
    await cacheService.delete(`healthRecord:${id}`)
    await cacheService.delete(`healthRecords:${elderlyId}`)

    return res.json({
      message: '健康档案删除成功'
    })
  } catch (error) {
    console.error('删除健康档案错误:', error)
    return res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

