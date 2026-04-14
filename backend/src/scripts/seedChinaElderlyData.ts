import dotenv from 'dotenv'
import { Op } from 'sequelize'
import database, { testConnection } from '../config/database'
import { User, Elderly, HealthData } from '../models'

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

const seedData: SeedElderly[] = [
  { name: '刘桂兰', age: 79, gender: 'female', idCard: '110101194702121122', phone: '13911001101', address: '北京市朝阳区望京西园1号楼101', emergencyContact: '王建国', emergencyPhone: '13911009901', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '高血压，需每日监测血压' },
  { name: '陈国栋', age: 83, gender: 'male', idCard: '310101194301083457', phone: '13821001102', address: '上海市浦东新区金桥路66弄2号楼302', emergencyContact: '陈晓琳', emergencyPhone: '13821009902', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '糖尿病史，夜间需关注低血糖' },
  { name: '周秀珍', age: 74, gender: 'female', idCard: '440101195201204568', phone: '13726001103', address: '广州市天河区体育西路88号5栋202', emergencyContact: '李志强', emergencyPhone: '13726009903', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '运动习惯良好' },
  { name: '孙德福', age: 88, gender: 'male', idCard: '320101193801153679', phone: '13651001104', address: '南京市鼓楼区中山北路120号1单元601', emergencyContact: '孙丽', emergencyPhone: '13651009904', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '既往心脏病，需重点关注心率' },
  { name: '何美琴', age: 76, gender: 'female', idCard: '330101194912114781', phone: '13566001105', address: '杭州市西湖区文三路18号3幢501', emergencyContact: '何志远', emergencyPhone: '13566009905', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '睡眠障碍，晚间醒来频繁' },
  { name: '邓志诚', age: 72, gender: 'male', idCard: '510101195401063892', phone: '13482001106', address: '成都市高新区天府大道北段168号7栋1102', emergencyContact: '邓琳', emergencyPhone: '13482009906', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '日常步行活跃' },
  { name: '徐玉梅', age: 81, gender: 'female', idCard: '420101194510074903', phone: '13392001107', address: '武汉市武昌区中北路99号4栋402', emergencyContact: '徐刚', emergencyPhone: '13392009907', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '轻度骨质疏松，防跌倒管理' },
  { name: '蒋文海', age: 78, gender: 'male', idCard: '120101194612255014', phone: '13222001108', address: '天津市南开区白堤路12号2门303', emergencyContact: '蒋欣', emergencyPhone: '13222009908', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '血压偶有波动' },
  { name: '韩淑芬', age: 85, gender: 'female', idCard: '610101194001095125', phone: '13171001109', address: '西安市雁塔区小寨东路45号6栋804', emergencyContact: '韩宇', emergencyPhone: '13171009909', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '慢阻肺病史，需关注体温与心率' },
  { name: '郭建平', age: 77, gender: 'male', idCard: '500101194811085236', phone: '13055001110', address: '重庆市渝中区解放碑民权路31号2楼', emergencyContact: '郭婷婷', emergencyPhone: '13055009910', healthStatus: 'fair', riskLevel: 'medium', isAlone: false, notes: '2型糖尿病' },
  { name: '罗佩兰', age: 80, gender: 'female', idCard: '430101194602176347', phone: '13973001111', address: '长沙市芙蓉区五一大道200号8栋603', emergencyContact: '罗佳', emergencyPhone: '13973009911', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '独居，社区上门频次每周2次' },
  { name: '朱荣昌', age: 73, gender: 'male', idCard: '370101195309106458', phone: '13853101112', address: '济南市历下区泉城路100号3单元203', emergencyContact: '朱鹏', emergencyPhone: '13853109912', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '体重控制良好' },
  { name: '彭月华', age: 84, gender: 'female', idCard: '350101194203187569', phone: '13759101113', address: '福州市鼓楼区东街口26号9栋502', emergencyContact: '彭超', emergencyPhone: '13759109913', healthStatus: 'poor', riskLevel: 'high', isAlone: true, notes: '近期食欲下降' },
  { name: '蔡永安', age: 75, gender: 'male', idCard: '210101195102038670', phone: '13640001114', address: '沈阳市和平区太原街58号1栋901', emergencyContact: '蔡晓', emergencyPhone: '13640009914', healthStatus: 'good', riskLevel: 'low', isAlone: false, notes: '有晨练习惯' },
  { name: '魏春兰', age: 82, gender: 'female', idCard: '530101194405129781', phone: '13587001115', address: '昆明市盘龙区北京路122号7栋1201', emergencyContact: '魏晓东', emergencyPhone: '13587009915', healthStatus: 'fair', riskLevel: 'medium', isAlone: true, notes: '夜间起夜频繁，防跌倒重点户' }
]

const randomRange = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10

const buildHealthPoints = (elderlyId: number) => {
  const now = Date.now()
  return [
    {
      elderlyId,
      dataType: 'heart_rate' as const,
      value: randomRange(58, 105),
      unit: '次/分钟',
      isAbnormal: false,
      deviceId: 'seed-device-hr',
      dataSource: 'system' as const,
      createdAt: new Date(now - 1000 * 60 * 20),
      updatedAt: new Date(now - 1000 * 60 * 20)
    },
    {
      elderlyId,
      dataType: 'blood_sugar' as const,
      value: randomRange(4.2, 9.8),
      unit: 'mmol/L',
      isAbnormal: false,
      deviceId: 'seed-device-bs',
      dataSource: 'system' as const,
      createdAt: new Date(now - 1000 * 60 * 15),
      updatedAt: new Date(now - 1000 * 60 * 15)
    },
    {
      elderlyId,
      dataType: 'temperature' as const,
      value: randomRange(36.1, 37.8),
      unit: '°C',
      isAbnormal: false,
      deviceId: 'seed-device-temp',
      dataSource: 'system' as const,
      createdAt: new Date(now - 1000 * 60 * 10),
      updatedAt: new Date(now - 1000 * 60 * 10)
    },
    {
      elderlyId,
      dataType: 'steps' as const,
      value: randomRange(600, 6200),
      unit: '步',
      isAbnormal: false,
      deviceId: 'seed-device-step',
      dataSource: 'system' as const,
      createdAt: new Date(now - 1000 * 60 * 5),
      updatedAt: new Date(now - 1000 * 60 * 5)
    }
  ]
}

async function seedChinaElderlyData() {
  try {
    await testConnection()
    await database.sync()

    let gridUser = await User.findOne({ where: { role: 'grid' } })
    if (!gridUser) {
      gridUser = await User.create({
        username: 'grid_seed_cn',
        password: 'seed_only_not_for_login',
        email: 'grid-seed@elderlycare.com',
        phone: '13900008888',
        role: 'grid',
        realName: '社区网格员(种子)',
        isActive: true
      })
    }

    let createdCount = 0
    for (const item of seedData) {
      const [elderly, created] = await Elderly.findOrCreate({
        where: { idCard: item.idCard },
        defaults: {
          ...item,
          gridMemberId: gridUser.id
        }
      })

      if (created) {
        createdCount += 1
      }

      const existingRecent = await HealthData.count({
        where: {
          elderlyId: elderly.id,
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })

      if (existingRecent === 0) {
        await HealthData.bulkCreate(buildHealthPoints(elderly.id))
      }
    }

    const total = await Elderly.count()
    console.log(`中国老人样例数据导入完成：本次新增 ${createdCount} 条，当前总计 ${total} 条老人数据。`)
    process.exit(0)
  } catch (error) {
    console.error('导入失败:', error)
    process.exit(1)
  }
}

seedChinaElderlyData()
