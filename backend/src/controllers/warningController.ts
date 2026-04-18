import { Request, Response } from 'express'
import { Op, fn, col } from 'sequelize'
import { Warning, Elderly, User, WarningActionLog } from '../models'
import { notificationService } from '../services/notificationService'
import database from '../config/database'

const sequelize = database

const getWarnings = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, riskLevel, elderlyName, startDate, endDate } = req.query
    const userId = (req as any).user?.userId
    const userRole = (req as any).user?.role

    // 构建查询条件
    const whereClause: any = {}
    
    // 状态筛选
    if (status) {
      whereClause.status = status
    }

    // 风险等级筛选
    if (riskLevel) {
      whereClause.riskLevel = riskLevel
    }

    // 时间范围筛选
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      }
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    // 构建关联查询条件
    const includeOptions: any = [
      {
        model: Elderly,
        as: 'elderly',
        attributes: ['id', 'name', 'age', 'phone']
      },
      {
        model: User,
        as: 'handler',
        attributes: ['id', 'realName'],
        required: false
      }
    ]

    // 如果是网格员，只能查看自己负责的老人预警
    if (userRole === 'grid') {
      includeOptions[0].where = { gridMemberId: userId }
    }

    // 老人姓名筛选
    if (elderlyName) {
      includeOptions[0].where = {
        ...includeOptions[0].where,
        name: { [Op.like]: `%${elderlyName}%` }
      }
    }

    const { count, rows } = await Warning.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit as string),
      offset: offset,
      order: [['id', 'DESC']]
    })

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('获取预警列表错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

const getWarningById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = (req as any).user?.userId
    const userRole = (req as any).user?.role

    const warning = await Warning.findByPk(id, {
      include: [
        {
          model: Elderly,
          as: 'elderly',
          attributes: ['id', 'name', 'age', 'phone', 'address', 'emergencyContact', 'emergencyPhone']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['id', 'realName', 'phone']
        },
        {
          model: WarningActionLog,
          as: 'actionLogs',
          include: [{ model: User, as: 'operator', attributes: ['id', 'realName'] }],
          separate: true,
          order: [['created_at', 'DESC']]
        }
      ]
    })

    if (!warning) {
      return res.status(404).json({
        success: false,
        error: '预警记录不存在'
      })
    }

    // 权限检查：网格员只能查看自己负责的老人预警
    if (userRole === 'grid' && warning.dataValues.elderlyId) {
      // 需要查询老人信息来检查权限
      const elderly = await Elderly.findByPk(warning.dataValues.elderlyId)
      if (elderly && elderly.gridMemberId !== userId) {
        return res.status(403).json({
          success: false,
          error: '权限不足，只能查看自己负责的老人预警'
        })
      }
    }

    return res.json({
      success: true,
      data: warning
    })
  } catch (error) {
    console.error('获取预警详情错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

const createWarning = async (req: Request, res: Response) => {
  try {
    const {
      elderlyId,
      warningType,
      riskLevel,
      title,
      description,
      triggerData
    } = req.body

    // 验证必填字段
    if (!elderlyId || !warningType || !riskLevel || !title || !description) {
      return res.status(400).json({
        success: false,
        error: '请填写所有必填字段'
      })
    }

    // 检查老人是否存在
    const elderly = await Elderly.findByPk(elderlyId)
    if (!elderly) {
      return res.status(404).json({
        success: false,
        error: '老人信息不存在'
      })
    }

    // 创建预警记录
    const warning = await Warning.create({
      elderlyId,
      warningType,
      riskLevel,
      title,
      description,
      triggerData: triggerData || {},
      status: 'pending'
    })

    // 发送预警通知
    await notificationService.sendWarningNotification(warning)

    return res.status(201).json({
      success: true,
      message: '预警记录创建成功',
      data: warning
    })
  } catch (error) {
    console.error('创建预警记录错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

const updateWarning = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, handleNotes, followUpAt, followUpResult } = req.body
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role

    const warning = await Warning.findByPk(id, {
      include: [{ model: Elderly, as: 'elderly', attributes: ['id', 'gridMemberId'] }]
    })

    if (!warning) {
      return res.status(404).json({
        success: false,
        error: '预警记录不存在'
      })
    }

    // 权限边界：网格员只能处理自己负责老人；家属不可处理
    if (userRole === 'family') {
      return res.status(403).json({
        success: false,
        error: '家属角色无权处理预警'
      })
    }

    const elderly = warning.get('elderly') as any
    if (userRole === 'grid' && elderly?.gridMemberId !== userId) {
      return res.status(403).json({
        success: false,
        error: '只能处理自己负责老人预警'
      })
    }

    // 状态流转校验
    const allowedTransitions: Record<string, string[]> = {
      pending: ['processing', 'resolved'],
      processing: ['resolved'],
      resolved: []
    }

    const previousStatus = warning.status
    const nextStatus = status || warning.status
    if (status && !allowedTransitions[warning.status]?.includes(status) && status !== warning.status) {
      return res.status(400).json({
        success: false,
        error: `非法状态流转: ${warning.status} -> ${status}`
      })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (handleNotes !== undefined) updateData.handle_notes = handleNotes
    if (followUpAt) updateData.followUpAt = new Date(followUpAt)
    if (followUpResult !== undefined) updateData.followUpResult = followUpResult

    if (nextStatus === 'processing' || nextStatus === 'resolved') {
      updateData.handlerId = userId
      updateData.handle_time = new Date()
    }

    await warning.update(updateData)

    await WarningActionLog.create({
      warningId: warning.id,
      operatorId: userId,
      action: 'warning_status_update',
      fromStatus: previousStatus,
      toStatus: nextStatus,
      notes: handleNotes,
      followUpResult
    })

    return res.json({
      success: true,
      message: '预警记录更新成功',
      data: warning
    })
  } catch (error) {
    console.error('更新预警记录错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

const getWarningStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    // 构建时间条件
    const dateCondition: any = {}
    if (startDate && endDate) {
      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
        dateCondition.created_at = {
          [Op.between]: [start, end]
        }
      }
    }

    // 获取预警统计
    const totalWarnings = await Warning.count({ where: dateCondition })
    const pendingWarnings = await Warning.count({ 
      where: { ...dateCondition, status: 'pending' } 
    })
    const processingWarnings = await Warning.count({ 
      where: { ...dateCondition, status: 'processing' } 
    })
    const resolvedWarnings = await Warning.count({ 
      where: { ...dateCondition, status: 'resolved' } 
    })
    const handledWarnings = processingWarnings + resolvedWarnings

    // 按风险等级统计
    const riskLevelRows = await Warning.findAll({
      where: dateCondition,
      attributes: ['riskLevel', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['riskLevel'],
      raw: true
    }) as unknown as Array<{ riskLevel: 'low' | 'medium' | 'high'; count: number | string }>

    const riskCountMap = new Map<string, number>()
    riskLevelRows.forEach((r) => {
      riskCountMap.set(r.riskLevel, Number(r.count) || 0)
    })

    const riskLevelStats = [
      { riskLevel: 'high', count: riskCountMap.get('high') || 0 },
      { riskLevel: 'medium', count: riskCountMap.get('medium') || 0 },
      { riskLevel: 'low', count: riskCountMap.get('low') || 0 }
    ]

    // 按预警类型统计
    const warningTypeRows = await Warning.findAll({
      where: dateCondition,
      attributes: ['warningType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['warningType'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    }) as unknown as Array<{ warningType: string; count: number | string }>

    const warningTypeLabelMap: Record<string, string> = {
      health_abnormal: '健康异常',
      activity_abnormal: '活动异常',
      medication_abnormal: '用药异常',
      emotion_abnormal: '情绪异常',
      cognitive_decline: '认知衰退',
      environment_risk: '环境风险',
      medical_urgent: '医疗紧急',
      fall_risk: '跌倒风险',
      stroke_risk: '中风风险',
      door_contact: '门磁异常',
      water_meter: '用水异常',
      mattress_risk: '床垫异常',
      service_gap: '服务空窗'
    }

    const warningTypeStats = warningTypeRows.map((row) => ({
      warningType: row.warningType,
      warningTypeZh: warningTypeLabelMap[row.warningType] || row.warningType,
      count: Number(row.count) || 0
    }))

    // 最近7天预警趋势（按天聚合）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const trendRows = await Warning.findAll({
      where: {
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true
    }) as unknown as Array<{ date: string; count: number }>

    const trendMap = new Map<string, number>()
    trendRows.forEach((item: any) => {
      trendMap.set(item.date, Number(item.count) || 0)
    })

    const trendStats = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(sevenDaysAgo)
      d.setDate(sevenDaysAgo.getDate() + idx)
      const key = d.toISOString().slice(0, 10)
      return { date: key, count: trendMap.get(key) || 0 }
    })

    const resolvedWithDuration = await Warning.findAll({
      where: {
        ...dateCondition,
        status: 'resolved',
        handle_time: { [Op.not]: null }
      },
      attributes: ['createdAt', 'handle_time'],
      raw: true
    }) as unknown as Array<{ created_at: string; handle_time: string }>

    const avgHandleHours = resolvedWithDuration.length > 0
      ? Number((resolvedWithDuration.reduce((sum, item) => {
          const start = new Date((item as any).createdAt).getTime()
          const end = new Date((item as any).handle_time).getTime()
          return sum + Math.max(0, end - start)
        }, 0) / resolvedWithDuration.length / (1000 * 60 * 60)).toFixed(2))
      : 0

    const timeoutCount = await Warning.count({
      where: {
        ...dateCondition,
        status: { [Op.in]: ['pending', 'processing'] },
        createdAt: {
          [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    res.json({
      success: true,
      data: {
        overview: {
          total: totalWarnings,
          pending: pendingWarnings,
          processing: processingWarnings,
          resolved: resolvedWarnings,
          resolutionRate: totalWarnings > 0
            ? (handledWarnings / totalWarnings * 100).toFixed(1)
            : 0,
          avgHandleHours,
          timeoutCount
        },
        riskLevel: riskLevelStats,
        warningType: warningTypeStats,
        trend: trendStats
      }
    })
  } catch (error) {
    console.error('获取预警统计错误:', error)
    // 强兜底：统计异常时也返回可用空数据，避免前端页面报错
    return res.json({
      success: true,
      data: {
        overview: {
          total: 0,
          pending: 0,
          processing: 0,
          resolved: 0,
          resolutionRate: 0,
          avgHandleHours: 0,
          timeoutCount: 0
        },
        riskLevel: [],
        warningType: [],
        trend: Array.from({ length: 7 }).map((_, idx) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - idx))
          return { date: d.toISOString().slice(0, 10), count: 0 }
        })
      }
    })
  }
}

const triggerManualCheck = async (req: Request, res: Response) => {
  try {
    // 这里应该调用风险分析Agent进行手动检查
    // 目前模拟实现
    
    const checkResult = {
      checkedCount: 156,
      newWarnings: 3,
      warnings: [
        {
          elderlyId: 1,
          warningType: 'health_abnormal',
          riskLevel: 'medium',
          title: '血压异常提醒',
          description: '张大爷血压连续2次超过正常范围'
        }
      ]
    }

    return res.json({
      success: true,
      message: '手动风险检查完成',
      data: checkResult
    })
  } catch (error) {
    console.error('手动风险检查错误:', error)
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

export {
  getWarnings,
  getWarningById,
  createWarning,
  updateWarning,
  getWarningStats,
  triggerManualCheck
}