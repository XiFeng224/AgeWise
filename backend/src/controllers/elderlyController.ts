import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { Elderly, Warning, ServiceRecord, User } from '../models'
import { maskPhone, maskIdCard, canViewSensitive } from '../utils/mask'

export const getElderlyList = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, riskLevel, healthStatus } = req.query
    const userId = (req as any).user?.userId
    const userRole = (req as any).user?.role

    // 构建查询条件
    const whereClause: any = {}
    
    // 搜索条件
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } }
      ]
    }

    // 风险等级筛选
    if (riskLevel) {
      whereClause.riskLevel = riskLevel
    }

    // 健康状况筛选
    if (healthStatus) {
      whereClause.healthStatus = healthStatus
    }

    // 权限控制：网格员只能查看自己负责的老人
    if (userRole === 'grid') {
      whereClause.gridMemberId = userId
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    const { count, rows } = await Elderly.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'gridMember',
          attributes: ['id', 'realName', 'phone']
        }
      ],
      limit: parseInt(limit as string),
      offset,
      order: [['createdAt', 'DESC']]
    })

    const maskedRows = rows.map((item: any) => {
      if (canViewSensitive(userRole)) return item
      const plain = item.toJSON()
      plain.phone = maskPhone(plain.phone)
      plain.idCard = maskIdCard(plain.idCard)
      plain.emergencyPhone = maskPhone(plain.emergencyPhone)
      return plain
    })

    res.json({
      data: maskedRows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取老人列表错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const getElderlyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = (req as any).user?.userId
    const userRole = (req as any).user?.role

    const elderly = await Elderly.findByPk(id, {
      include: [
        {
          model: User,
          as: 'gridMember',
          attributes: ['id', 'realName', 'phone']
        },
        {
          model: Warning,
          as: 'warnings',
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: ServiceRecord,
          as: 'serviceRecords',
          limit: 5,
          order: [['serviceDate', 'DESC']]
        }
      ]
    })

    if (!elderly) {
      return res.status(404).json({
        error: '老人信息不存在'
      })
    }

    // 权限检查：网格员只能查看自己负责的老人
    if (userRole === 'grid' && elderly.gridMemberId !== userId) {
      return res.status(403).json({
        error: '权限不足，只能查看自己负责的老人信息'
      })
    }

    const detail = elderly.toJSON() as any
    if (!canViewSensitive(userRole)) {
      detail.phone = maskPhone(detail.phone)
      detail.idCard = maskIdCard(detail.idCard)
      detail.emergencyPhone = maskPhone(detail.emergencyPhone)
    }

    res.json({
      data: detail
    })
  } catch (error) {
    console.error('获取老人详情错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const createElderly = async (req: Request, res: Response) => {
  try {
    const {
      name,
      age,
      gender,
      idCard,
      phone,
      address,
      emergencyContact,
      emergencyPhone,
      healthStatus,
      riskLevel,
      isAlone,
      gridMemberId,
      notes
    } = req.body

    // 验证必填字段
    if (!name || !age || !gender || !idCard || !phone || !address || !emergencyContact || !emergencyPhone) {
      return res.status(400).json({
        error: '请填写所有必填字段'
      })
    }

    // 检查身份证是否已存在
    const existingElderly = await Elderly.findOne({
      where: { idCard }
    })

    if (existingElderly) {
      return res.status(400).json({
        error: '该身份证号已存在'
      })
    }

    // 创建老人信息
    const elderly = await Elderly.create({
      name,
      age,
      gender,
      idCard,
      phone,
      address,
      emergencyContact,
      emergencyPhone,
      healthStatus: healthStatus || 'good',
      riskLevel: riskLevel || 'low',
      isAlone: !!isAlone,
      gridMemberId,
      notes
    })

    res.status(201).json({
      message: '老人信息创建成功',
      data: elderly
    })
  } catch (error) {
    console.error('创建老人信息错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const updateElderly = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role

    const elderly = await Elderly.findByPk(id)

    if (!elderly) {
      return res.status(404).json({
        error: '老人信息不存在'
      })
    }

    // 权限检查：网格员只能更新自己负责的老人
    if (userRole === 'grid' && elderly.gridMemberId !== userId) {
      return res.status(403).json({
        error: '权限不足，只能更新自己负责的老人信息'
      })
    }

    // 更新老人信息
    await elderly.update(req.body)

    res.json({
      message: '老人信息更新成功',
      data: elderly
    })
  } catch (error) {
    console.error('更新老人信息错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const deleteElderly = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const elderly = await Elderly.findByPk(id)

    if (!elderly) {
      return res.status(404).json({
        error: '老人信息不存在'
      })
    }

    // 软删除老人信息
    await elderly.destroy()

    res.json({
      message: '老人信息删除成功'
    })
  } catch (error) {
    console.error('删除老人信息错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const getElderlyWarnings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 10, status } = req.query

    const whereClause: any = { elderlyId: Number(id) }
    
    if (status) {
      whereClause.status = status
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    const { count, rows } = await Warning.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'handler',
          attributes: ['id', 'realName']
        }
      ],
      limit: parseInt(limit as string),
      offset,
      order: [['createdAt', 'DESC']]
    })

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取老人预警记录错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}

export const getElderlyServices = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 10 } = req.query

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    const { count, rows } = await ServiceRecord.findAndCountAll({
      where: { elderlyId: Number(id) },
      limit: parseInt(limit as string),
      offset,
      order: [['serviceDate', 'DESC']]
    })

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取老人服务记录错误:', error)
    res.status(500).json({
      error: '服务器内部错误'
    })
  }
}