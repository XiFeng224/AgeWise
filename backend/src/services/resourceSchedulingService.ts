import { ServiceProvider, ServiceRequest, Elderly, User } from '../models'
import { Op } from 'sequelize'

class ResourceSchedulingService {
  // 创建服务请求
  async createServiceRequest(elderlyId: number, requestType: string, priority: 'low' | 'medium' | 'high', description: string, requiredSkills: string) {
    try {
      // 获取老人信息
      const elderly = await Elderly.findByPk(elderlyId)
      if (!elderly) {
        throw new Error('老人信息不存在')
      }

      // 创建服务请求
      const serviceRequest = await ServiceRequest.create({
        elderlyId,
        requestType,
        priority,
        description,
        location: elderly.address,
        requiredSkills,
        status: 'pending',
        requestedAt: new Date()
      })

      // 自动尝试匹配服务人员
      await this.matchServiceProvider(serviceRequest.id)

      return { success: true, data: serviceRequest }
    } catch (error) {
      console.error('创建服务请求失败:', error)
      throw new Error('创建服务请求失败')
    }
  }

  // 获取服务请求列表
  async getServiceRequests(status?: 'pending' | 'assigned' | 'completed' | 'cancelled', elderlyId?: number) {
    try {
      const whereClause: any = {}

      if (status) {
        whereClause.status = status
      }

      if (elderlyId) {
        whereClause.elderlyId = elderlyId
      }

      const serviceRequests = await ServiceRequest.findAll({
        where: whereClause,
        include: [
          {
            model: Elderly,
            as: 'elderly',
            attributes: ['name', 'age', 'address', 'phone']
          },
          {
            model: ServiceProvider,
            as: 'assignedProvider',
            attributes: ['name', 'phone', 'type', 'skills', 'rating']
          }
        ],
        order: [['requestedAt', 'DESC']]
      })

      return { success: true, data: serviceRequests }
    } catch (error) {
      console.error('获取服务请求列表失败:', error)
      throw new Error('获取服务请求列表失败')
    }
  }

  // 智能匹配服务人员
  async matchServiceProvider(serviceRequestId: number) {
    try {
      const serviceRequest = await ServiceRequest.findByPk(serviceRequestId, {
        include: [
          {
            model: Elderly,
            as: 'elderly',
            attributes: ['address']
          }
        ]
      })

      if (!serviceRequest || serviceRequest.status !== 'pending') {
        throw new Error('服务请求不存在或已处理')
      }

      // 获取所有可用的服务人员
      const availableProviders = await ServiceProvider.findAll({
        where: {
          availability: true
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['role']
          }
        ]
      })

      if (availableProviders.length === 0) {
        return { success: false, message: '暂无可用的服务人员' }
      }

      // 计算匹配度
      const providersWithScore = availableProviders.map(provider => {
        const score = this.calculateMatchScore(provider, serviceRequest)
        return { provider, score }
      })

      // 按匹配度排序
      providersWithScore.sort((a, b) => b.score - a.score)

      // 选择匹配度最高的服务人员
      const bestMatch = providersWithScore[0]

      if (bestMatch.score > 0) {
        // 分配服务
        await serviceRequest.update({
          status: 'assigned',
          assignedProviderId: bestMatch.provider.id,
          assignedAt: new Date()
        })

        // 更新服务人员状态
        await bestMatch.provider.update({
          availability: false
        })

        return { success: true, data: {
          serviceRequest,
          assignedProvider: bestMatch.provider,
          matchScore: bestMatch.score
        }}
      } else {
        return { success: false, message: '未找到合适的服务人员' }
      }
    } catch (error) {
      console.error('匹配服务人员失败:', error)
      throw new Error('匹配服务人员失败')
    }
  }

  // 计算匹配度分数
  private calculateMatchScore(provider: ServiceProvider, serviceRequest: ServiceRequest): number {
    let score = 0

    // 优先级权重
    const priorityWeight = {
      'high': 30,
      'medium': 20,
      'low': 10
    }

    // 根据优先级加分
    score += priorityWeight[serviceRequest.priority]

    // 技能匹配加分
    const requiredSkills = serviceRequest.requiredSkills.toLowerCase().split(',').map(s => s.trim())
    const providerSkills = provider.skills.toLowerCase().split(',').map(s => s.trim())
    
    const matchedSkills = requiredSkills.filter(skill => providerSkills.includes(skill))
    score += matchedSkills.length * 15

    // 服务人员类型匹配
    if (serviceRequest.requestType.includes('医疗') && provider.type === 'doctor') {
      score += 20
    } else if (serviceRequest.requestType.includes('护理') && provider.type === 'nurse') {
      score += 15
    } else if (serviceRequest.requestType.includes('陪伴') && provider.type === 'volunteer') {
      score += 10
    }

    // 评分加分
    score += provider.rating * 2

    // 经验加分
    score += Math.min(provider.experience, 10) * 2

    return score
  }

  // 完成服务
  async completeService(serviceRequestId: number, notes?: string) {
    try {
      const serviceRequest = await ServiceRequest.findByPk(serviceRequestId)

      if (!serviceRequest || serviceRequest.status !== 'assigned') {
        throw new Error('服务请求不存在或未分配')
      }

      // 更新服务状态
      await serviceRequest.update({
        status: 'completed',
        completedAt: new Date(),
        notes
      })

      // 恢复服务人员可用性
      if (serviceRequest.assignedProviderId) {
        await ServiceProvider.update(
          { availability: true },
          { where: { id: serviceRequest.assignedProviderId } }
        )
      }

      return { success: true, data: serviceRequest }
    } catch (error) {
      console.error('完成服务失败:', error)
      throw new Error('完成服务失败')
    }
  }

  // 取消服务
  async cancelService(serviceRequestId: number, reason: string) {
    try {
      const serviceRequest = await ServiceRequest.findByPk(serviceRequestId)

      if (!serviceRequest) {
        throw new Error('服务请求不存在')
      }

      // 更新服务状态
      await serviceRequest.update({
        status: 'cancelled',
        notes: reason
      })

      // 恢复服务人员可用性
      if (serviceRequest.assignedProviderId && serviceRequest.status === 'assigned') {
        await ServiceProvider.update(
          { availability: true },
          { where: { id: serviceRequest.assignedProviderId } }
        )
      }

      return { success: true, data: serviceRequest }
    } catch (error) {
      console.error('取消服务失败:', error)
      throw new Error('取消服务失败')
    }
  }

  // 添加服务人员
  async addServiceProvider(userId: number, name: string, phone: string, type: 'nurse' | 'volunteer' | 'doctor', skills: string, currentLocation: string) {
    try {
      // 检查用户是否存在
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('用户不存在')
      }

      // 检查是否已存在服务人员记录
      const existingProvider = await ServiceProvider.findOne({ where: { userId } })
      if (existingProvider) {
        throw new Error('该用户已注册为服务人员')
      }

      // 创建服务人员记录
      const serviceProvider = await ServiceProvider.create({
        userId,
        name,
        phone,
        type,
        skills,
        availability: true,
        currentLocation,
        rating: 5.0,
        experience: 0
      })

      return { success: true, data: serviceProvider }
    } catch (error) {
      console.error('添加服务人员失败:', error)
      throw new Error('添加服务人员失败')
    }
  }

  // 更新服务人员状态
  async updateProviderStatus(providerId: number, availability: boolean) {
    try {
      const provider = await ServiceProvider.findByPk(providerId)
      if (!provider) {
        throw new Error('服务人员不存在')
      }

      await provider.update({ availability })
      return { success: true, data: provider }
    } catch (error) {
      console.error('更新服务人员状态失败:', error)
      throw new Error('更新服务人员状态失败')
    }
  }

  // 获取服务人员列表
  async getServiceProviders(type?: 'nurse' | 'volunteer' | 'doctor', availability?: boolean) {
    try {
      const whereClause: any = {}

      if (type) {
        whereClause.type = type
      }

      if (availability !== undefined) {
        whereClause.availability = availability
      }

      const providers = await ServiceProvider.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email', 'role']
          }
        ],
        order: [['rating', 'DESC']]
      })

      return { success: true, data: providers }
    } catch (error) {
      console.error('获取服务人员列表失败:', error)
      throw new Error('获取服务人员列表失败')
    }
  }
}

export default new ResourceSchedulingService()