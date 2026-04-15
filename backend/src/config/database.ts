import { Sequelize } from 'sequelize'
import * as dotenv from 'dotenv'

dotenv.config()

// 数据库名称
const dbName = process.env.DB_NAME || 'elderly_care'
const dbUser = process.env.DB_USER || 'root'
const dbPassword = process.env.DB_PASSWORD || ''
const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = parseInt(process.env.DB_PORT || '3306')

if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  throw new Error('DB_NAME 格式非法，仅允许字母、数字和下划线')
}

// 首先创建一个不指定数据库的连接来创建数据库
async function createDatabaseIfNotExists() {
  const tempSequelize = new Sequelize({
    username: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  })

  try {
    console.log('数据库连接配置', {
      DB_USER: dbUser,
      DB_HOST: dbHost,
      DB_PORT: dbPort,
      DB_NAME: dbName,
      DB_PASSWORD: dbPassword ? 'SET' : 'EMPTY'
    })

    await tempSequelize.authenticate()
    console.log('临时数据库连接成功')

    const safeDbName = `\`${dbName.replace(/`/g, '``')}\``
    await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${safeDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`数据库 ${dbName} 已创建或已存在`)

    await tempSequelize.close()
  } catch (error) {
    console.error('创建数据库失败:', error)
    await tempSequelize.close()
    throw error
  }
}

// 然后创建实际的数据库连接
const database = new Sequelize({
  database: dbName,
  username: dbUser,
  password: dbPassword,
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+08:00', // 北京时间
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true
  }
})

// 测试数据库连接
async function testConnection() {
  try {
    // 先尝试创建数据库
    await createDatabaseIfNotExists()

    // 然后连接到数据库
    await database.authenticate()
    console.log('数据库连接成功')
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default database
export { testConnection }
