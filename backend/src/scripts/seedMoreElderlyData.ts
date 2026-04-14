import dotenv from 'dotenv'
import database, { testConnection } from '../config/database'
import { User, Elderly } from '../models'

dotenv.config()

type SeedElderly = {
  name: string
  age: number
  gender: 'male' | 'female'
  idCard: string
  phone: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
  riskLevel: 'low' | 'medium' | 'high'
  isAlone: boolean
  notes: string
}

const moreData: SeedElderly[] = [
  { name: '叶志兰', age: 78, gender: 'female', idCard: '110101194803152261', phone: '13911002201', address: '北京市海淀区中关村南大街12号2单元301', emergencyContact: '叶晨', emergencyPhone: '13911009201', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '慢性关节炎，需定期康复训练' },
  { name: '宋建华', age: 82, gender: 'male', idCard: '310101194402093372', phone: '13821002202', address: '上海市闵行区莘庄工业区88号6栋901', emergencyContact: '宋婷', emergencyPhone: '13821009202', healthStatus: 'poor', riskLevel: 'high', isAlone: false, notes: '冠心病史，需关注心率变化' },
  { name: '马淑英', age: 76, gender: 'female', idCard: '440101195004114483', phone: '13726002203', address: '广州市越秀区环市东路33号5单元602', emergencyContact: '马骏', emergencyPhone: '13726009203', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '日常作息规律' },
  { name: '赵庆安', age: 85, gender: 'male', idCard: '320101194105226594', phone: '13651002204', address: '南京市建邺区江东中路188号4栋1101', emergencyContact: '赵宇', emergencyPhone: '13651009204', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '夜间呼吸不稳，需重点关注' },
  { name: '卢慧芳', age: 73, gender: 'female', idCard: '330101195305067705', phone: '13566002205', address: '杭州市拱墅区湖墅南路76号3幢402', emergencyContact: '卢斌', emergencyPhone: '13566009205', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '血压控制较稳定' },
  { name: '姚文杰', age: 80, gender: 'male', idCard: '510101194611188816', phone: '13482002206', address: '成都市锦江区红星路三段26号9栋201', emergencyContact: '姚欣', emergencyPhone: '13482009206', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '偶发头晕，需复查血糖' },
  { name: '唐美玲', age: 79, gender: 'female', idCard: '420101194709299927', phone: '13392002207', address: '武汉市汉阳区鹦鹉大道100号11栋503', emergencyContact: '唐浩', emergencyPhone: '13392009207', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '骨密度偏低，防跌倒重点' },
  { name: '高世民', age: 77, gender: 'male', idCard: '120101194912101038', phone: '13222002208', address: '天津市河西区友谊路65号2单元702', emergencyContact: '高颖', emergencyPhone: '13222009208', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '心肺功能尚可' },
  { name: '曾秀华', age: 84, gender: 'female', idCard: '610101194203211149', phone: '13171002209', address: '西安市碑林区长安北路88号5幢1002', emergencyContact: '曾超', emergencyPhone: '13171009209', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '慢阻肺，需监测体温和血氧' },
  { name: '邵国平', age: 75, gender: 'male', idCard: '500101195107022250', phone: '13055002210', address: '重庆市南岸区南坪西路32号8栋401', emergencyContact: '邵玲', emergencyPhone: '13055009210', healthStatus: 'fair', riskLevel: 'medium', isAlone: false, notes: '2型糖尿病，餐后血糖波动' },
  { name: '冯桂珍', age: 81, gender: 'female', idCard: '430101194508133361', phone: '13973002211', address: '长沙市开福区芙蓉中路一段56号3栋1202', emergencyContact: '冯凯', emergencyPhone: '13973009211', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '睡眠质量差，夜间易醒' },
  { name: '任立群', age: 74, gender: 'male', idCard: '370101195211084472', phone: '13853102212', address: '济南市市中区经十路200号6单元305', emergencyContact: '任雪', emergencyPhone: '13853109212', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '日常运动良好' }
]

async function seedMoreElderlyData() {
  try {
    await testConnection()
    await database.sync()

    let gridUser = await User.findOne({ where: { role: 'grid' } })
    if (!gridUser) {
      gridUser = await User.create({
        username: 'grid_seed_more',
        password: 'seed_only_not_for_login',
        email: 'grid-more@elderlycare.com',
        phone: '13900009999',
        role: 'grid',
        realName: '社区网格员(增量种子)',
        isActive: true
      })
    }

    let createdCount = 0
    for (const item of moreData) {
      const [, created] = await Elderly.findOrCreate({
        where: { idCard: item.idCard },
        defaults: {
          ...item,
          gridMemberId: gridUser.id
        }
      })
      if (created) createdCount += 1
    }

    const total = await Elderly.count()
    console.log(`增量老人数据导入完成：本次新增 ${createdCount} 条，当前总计 ${total} 条老人数据。`)
    process.exit(0)
  } catch (error) {
    console.error('导入失败:', error)
    process.exit(1)
  }
}

seedMoreElderlyData()
