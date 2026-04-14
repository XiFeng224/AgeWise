import { DataTypes, Model, Optional } from 'sequelize'
import database from '../config/database'

// 用户模型
interface UserAttributes {
  id: number
  username: string
  password: string
  email: string
  phone: string
  role: 'admin' | 'manager' | 'grid' | 'family'
  realName: string
  avatar?: string
  isActive: boolean
  lastLogin?: Date
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive'> {}

class User extends Model<UserAttributes, UserCreationAttributes> {
  public id!: number
  public username!: string
  public password!: string
  public email!: string
  public phone!: string
  public role!: 'admin' | 'manager' | 'grid' | 'family'
  public realName!: string
  public avatar?: string
  public isActive!: boolean
  public lastLogin?: Date
  
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'grid', 'family'),
    allowNull: false,
    defaultValue: 'grid'
  },
  realName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(255)
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  sequelize: database,
  tableName: 'users',
  modelName: 'User'
})

// 老人模型
interface ElderlyAttributes {
  id: number
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
  gridMemberId: number
  notes?: string
}

interface ElderlyCreationAttributes extends Optional<ElderlyAttributes, 'id'> {}

class Elderly extends Model<ElderlyAttributes, ElderlyCreationAttributes> {
  public id!: number
  public name!: string
  public age!: number
  public gender!: 'male' | 'female'
  public idCard!: string
  public phone!: string
  public address!: string
  public emergencyContact!: string
  public emergencyPhone!: string
  public healthStatus!: 'excellent' | 'good' | 'fair' | 'poor'
  public riskLevel!: 'low' | 'medium' | 'high'
  public isAlone!: boolean
  public gridMemberId!: number
  public notes?: string
  
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Elderly.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: false
  },
  idCard: {
    type: DataTypes.STRING(18),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  emergencyContact: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  emergencyPhone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  healthStatus: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
    allowNull: false,
    defaultValue: 'good'
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'low'
  },
  isAlone: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  gridMemberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  sequelize: database,
  tableName: 'elderly',
  modelName: 'Elderly'
})

// 预警记录模型
interface WarningAttributes {
  id: number
  elderlyId: number
  warningType: string
  riskLevel: 'low' | 'medium' | 'high'
  title: string
  description: string
  triggerData: object
  status: 'pending' | 'processing' | 'resolved'
  handlerId?: number
  handleTime?: Date
  handleNotes?: string
  followUpAt?: Date
  followUpResult?: string
  createdAt: Date
  updatedAt: Date
}

interface WarningCreationAttributes extends Optional<WarningAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

class Warning extends Model<WarningAttributes, WarningCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public warningType!: string
  public riskLevel!: 'low' | 'medium' | 'high'
  public title!: string
  public description!: string
  public triggerData!: any
  public status!: 'pending' | 'processing' | 'resolved'
  public handlerId?: number
  public handleTime?: Date
  public handleNotes?: string
  public followUpAt?: Date
  public followUpResult?: string
  
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Warning.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  warningType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  triggerData: {
    type: DataTypes.JSON,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved'),
    allowNull: false,
    defaultValue: 'pending'
  },
  handlerId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  handleTime: {
    type: DataTypes.DATE
  },
  handleNotes: {
    type: DataTypes.TEXT
  },
  followUpAt: {
    type: DataTypes.DATE
  },
  followUpResult: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'warnings',
  modelName: 'Warning'
})

// 服务记录模型
interface ServiceRecordAttributes {
  id: number
  elderlyId: number
  serviceType: string
  serviceDate: Date
  serviceProvider: string
  description: string
  notes?: string
  rating?: number
  createdAt?: Date
  updatedAt?: Date
}

interface ServiceRecordCreationAttributes extends Optional<ServiceRecordAttributes, 'id'> {}

class ServiceRecord extends Model<ServiceRecordAttributes, ServiceRecordCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public serviceType!: string
  public serviceDate!: Date
  public serviceProvider!: string
  public description!: string
  public notes?: string
  public rating?: number
  
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

ServiceRecord.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  serviceType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  serviceDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  serviceProvider: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  rating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  sequelize: database,
  tableName: 'service_records',
  modelName: 'ServiceRecord'
})

// 健康档案模型
interface HealthRecordAttributes {
  id: number
  elderlyId: number
  recordType: string
  recordDate: Date
  bloodPressure?: string
  bloodSugar?: number
  heartRate?: number
  temperature?: number
  weight?: number
  height?: number
  symptoms?: string
  diagnosis?: string
  medication?: string
  notes?: string
  recordedBy: string
}

interface HealthRecordCreationAttributes extends Optional<HealthRecordAttributes, 'id'> {}

class HealthRecord extends Model<HealthRecordAttributes, HealthRecordCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public recordType!: string
  public recordDate!: Date
  public bloodPressure?: string
  public bloodSugar?: number
  public heartRate?: number
  public temperature?: number
  public weight?: number
  public height?: number
  public symptoms?: string
  public diagnosis?: string
  public medication?: string
  public notes?: string
  public recordedBy!: string
  
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

HealthRecord.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  recordType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  recordDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  bloodPressure: {
    type: DataTypes.STRING(20)
  },
  bloodSugar: {
    type: DataTypes.FLOAT
  },
  heartRate: {
    type: DataTypes.INTEGER
  },
  temperature: {
    type: DataTypes.FLOAT
  },
  weight: {
    type: DataTypes.FLOAT
  },
  height: {
    type: DataTypes.FLOAT
  },
  symptoms: {
    type: DataTypes.TEXT
  },
  diagnosis: {
    type: DataTypes.TEXT
  },
  medication: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.TEXT
  },
  recordedBy: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  sequelize: database,
  tableName: 'health_records',
  modelName: 'HealthRecord'
})

// 通知模型
interface NotificationAttributes {
  id: number
  userId: number
  title: string
  content: string
  type: string
  relatedId?: number
  isRead: boolean
  createdAt: Date
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead' | 'createdAt'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> {
  public id!: number
  public userId!: number
  public title!: string
  public content!: string
  public type!: string
  public relatedId?: number
  public isRead!: boolean
  public readonly createdAt!: Date
}

Notification.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  relatedId: {
    type: DataTypes.INTEGER
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'notifications',
  modelName: 'Notification'
})

// 健康数据模型
interface HealthDataAttributes {
  id: number
  elderlyId: number
  dataType: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
  value: number
  value2?: number
  unit: string
  isAbnormal: boolean
  deviceId?: string
  dataSource: 'device' | 'manual' | 'system'
  createdAt: Date
  updatedAt: Date
}

interface HealthDataCreationAttributes extends Optional<HealthDataAttributes, 'id' | 'isAbnormal' | 'dataSource' | 'createdAt' | 'updatedAt'> {}

class HealthData extends Model<HealthDataAttributes, HealthDataCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public dataType!: 'heart_rate' | 'blood_pressure' | 'blood_sugar' | 'temperature' | 'steps' | 'sleep'
  public value!: number
  public value2?: number
  public unit!: string
  public isAbnormal!: boolean
  public deviceId?: string
  public dataSource!: 'device' | 'manual' | 'system'
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

HealthData.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  dataType: {
    type: DataTypes.ENUM('heart_rate', 'blood_pressure', 'blood_sugar', 'temperature', 'steps', 'sleep'),
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  value2: {
    type: DataTypes.FLOAT
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  isAbnormal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  deviceId: {
    type: DataTypes.STRING(100)
  },
  dataSource: {
    type: DataTypes.ENUM('device', 'manual', 'system'),
    allowNull: false,
    defaultValue: 'device'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'health_data',
  modelName: 'HealthData'
})

// 行为轨迹模型
interface ActivityTrackAttributes {
  id: number
  elderlyId: number
  activityType: 'movement' | 'rest' | 'bathroom' | 'kitchen' | 'bedroom'
  startTime: Date
  endTime?: Date
  duration: number
  location?: string
  sensorId?: string
  isAbnormal: boolean
  createdAt: Date
  updatedAt: Date
}

interface ActivityTrackCreationAttributes extends Optional<ActivityTrackAttributes, 'id' | 'isAbnormal' | 'createdAt' | 'updatedAt'> {}

class ActivityTrack extends Model<ActivityTrackAttributes, ActivityTrackCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public activityType!: 'movement' | 'rest' | 'bathroom' | 'kitchen' | 'bedroom'
  public startTime!: Date
  public endTime?: Date
  public duration!: number
  public location?: string
  public sensorId?: string
  public isAbnormal!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

ActivityTrack.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.ENUM('movement', 'rest', 'bathroom', 'kitchen', 'bedroom'),
    allowNull: false
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100)
  },
  sensorId: {
    type: DataTypes.STRING(100)
  },
  isAbnormal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'activity_tracks',
  modelName: 'ActivityTrack'
})

// 情绪记录模型
interface EmotionRecordAttributes {
  id: number
  elderlyId: number
  emotionType: 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral'
  intensity: number
  analysisMethod: 'voice' | 'text' | 'behavior'
  context?: string
  createdAt: Date
  updatedAt: Date
}

interface EmotionRecordCreationAttributes extends Optional<EmotionRecordAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class EmotionRecord extends Model<EmotionRecordAttributes, EmotionRecordCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public emotionType!: 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral'
  public intensity!: number
  public analysisMethod!: 'voice' | 'text' | 'behavior'
  public context?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

EmotionRecord.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  emotionType: {
    type: DataTypes.ENUM('happy', 'sad', 'anxious', 'angry', 'neutral'),
    allowNull: false
  },
  intensity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10
    }
  },
  analysisMethod: {
    type: DataTypes.ENUM('voice', 'text', 'behavior'),
    allowNull: false
  },
  context: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'emotion_records',
  modelName: 'EmotionRecord'
})

// 认知测试模型
interface CognitiveTestAttributes {
  id: number
  elderlyId: number
  testType: 'memory' | 'attention' | 'language' | 'executive'
  score: number
  maxScore: number
  testDate: Date
  testDuration: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface CognitiveTestCreationAttributes extends Optional<CognitiveTestAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class CognitiveTest extends Model<CognitiveTestAttributes, CognitiveTestCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public testType!: 'memory' | 'attention' | 'language' | 'executive'
  public score!: number
  public maxScore!: number
  public testDate!: Date
  public testDuration!: number
  public notes?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CognitiveTest.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  testType: {
    type: DataTypes.ENUM('memory', 'attention', 'language', 'executive'),
    allowNull: false
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  maxScore: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  testDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  testDuration: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'cognitive_tests',
  modelName: 'CognitiveTest'
})

// 用药依从性模型
interface MedicationAdherenceAttributes {
  id: number
  elderlyId: number
  medicationName: string
  dosage: string
  schedule: string
  lastTaken?: Date
  missedCount: number
  adherenceRate: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface MedicationAdherenceCreationAttributes extends Optional<MedicationAdherenceAttributes, 'id' | 'missedCount' | 'adherenceRate' | 'createdAt' | 'updatedAt'> {}

class MedicationAdherence extends Model<MedicationAdherenceAttributes, MedicationAdherenceCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public medicationName!: string
  public dosage!: string
  public schedule!: string
  public lastTaken?: Date
  public missedCount!: number
  public adherenceRate!: number
  public notes?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

MedicationAdherence.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  medicationName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  schedule: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lastTaken: {
    type: DataTypes.DATE
  },
  missedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  adherenceRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'medication_adherence',
  modelName: 'MedicationAdherence'
})

// 服务人员模型
interface ServiceProviderAttributes {
  id: number
  userId: number
  name: string
  phone: string
  type: 'nurse' | 'volunteer' | 'doctor'
  skills: string
  availability: boolean
  currentLocation: string
  rating: number
  experience: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface ServiceProviderCreationAttributes extends Optional<ServiceProviderAttributes, 'id' | 'availability' | 'rating' | 'experience' | 'createdAt' | 'updatedAt'> {}

class ServiceProvider extends Model<ServiceProviderAttributes, ServiceProviderCreationAttributes> {
  public id!: number
  public userId!: number
  public name!: string
  public phone!: string
  public type!: 'nurse' | 'volunteer' | 'doctor'
  public skills!: string
  public availability!: boolean
  public currentLocation!: string
  public rating!: number
  public experience!: number
  public notes?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

ServiceProvider.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('nurse', 'volunteer', 'doctor'),
    allowNull: false
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  availability: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  currentLocation: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  rating: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 5.0
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'service_providers',
  modelName: 'ServiceProvider'
})

// 服务请求模型
interface ServiceRequestAttributes {
  id: number
  elderlyId: number
  requestType: string
  priority: 'low' | 'medium' | 'high'
  description: string
  location: string
  requiredSkills: string
  status: 'pending' | 'assigned' | 'completed' | 'cancelled'
  assignedProviderId?: number
  requestedAt: Date
  assignedAt?: Date
  completedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface ServiceRequestCreationAttributes extends Optional<ServiceRequestAttributes, 'id' | 'status' | 'requestedAt' | 'createdAt' | 'updatedAt'> {}

class ServiceRequest extends Model<ServiceRequestAttributes, ServiceRequestCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public requestType!: string
  public priority!: 'low' | 'medium' | 'high'
  public description!: string
  public location!: string
  public requiredSkills!: string
  public status!: 'pending' | 'assigned' | 'completed' | 'cancelled'
  public assignedProviderId?: number
  public requestedAt!: Date
  public assignedAt?: Date
  public completedAt?: Date
  public notes?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

ServiceRequest.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  requestType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  requiredSkills: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  assignedProviderId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'service_providers',
      key: 'id'
    }
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  assignedAt: {
    type: DataTypes.DATE
  },
  completedAt: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'service_requests',
  modelName: 'ServiceRequest'
})

// 社区积分模型
interface CommunityPointAttributes {
  id: number
  elderlyId: number
  points: number
  lastUpdated: Date
  createdAt: Date
  updatedAt: Date
}

interface CommunityPointCreationAttributes extends Optional<CommunityPointAttributes, 'id' | 'points' | 'lastUpdated' | 'createdAt' | 'updatedAt'> {}

class CommunityPoint extends Model<CommunityPointAttributes, CommunityPointCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public points!: number
  public lastUpdated!: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CommunityPoint.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'community_points',
  modelName: 'CommunityPoint'
})

// 积分交易记录模型
interface PointTransactionAttributes {
  id: number
  elderlyId: number
  type: 'earn' | 'spend'
  amount: number
  reason: string
  transactionDate: Date
  createdAt: Date
  updatedAt: Date
}

interface PointTransactionCreationAttributes extends Optional<PointTransactionAttributes, 'id' | 'transactionDate' | 'createdAt' | 'updatedAt'> {}

class PointTransaction extends Model<PointTransactionAttributes, PointTransactionCreationAttributes> {
  public id!: number
  public elderlyId!: number
  public type!: 'earn' | 'spend'
  public amount!: number
  public reason!: string
  public transactionDate!: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

PointTransaction.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  elderlyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'elderly',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('earn', 'spend'),
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'point_transactions',
  modelName: 'PointTransaction'
})

// 预警操作日志模型
interface WarningActionLogAttributes {
  id: number
  warningId: number
  operatorId: number
  action: string
  fromStatus?: 'pending' | 'processing' | 'resolved'
  toStatus?: 'pending' | 'processing' | 'resolved'
  notes?: string
  followUpResult?: string
  createdAt: Date
}

interface WarningActionLogCreationAttributes extends Optional<WarningActionLogAttributes, 'id' | 'createdAt'> {}

class WarningActionLog extends Model<WarningActionLogAttributes, WarningActionLogCreationAttributes> {
  public id!: number
  public warningId!: number
  public operatorId!: number
  public action!: string
  public fromStatus?: 'pending' | 'processing' | 'resolved'
  public toStatus?: 'pending' | 'processing' | 'resolved'
  public notes?: string
  public followUpResult?: string
  public readonly createdAt!: Date
}

WarningActionLog.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  warningId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warnings',
      key: 'id'
    }
  },
  operatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fromStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved')
  },
  toStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved')
  },
  notes: {
    type: DataTypes.TEXT
  },
  followUpResult: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize: database,
  tableName: 'warning_action_logs',
  modelName: 'WarningActionLog',
  updatedAt: false
})

// 定义模型关联
User.hasMany(Elderly, { foreignKey: 'gridMemberId', as: 'elderly' })
Elderly.belongsTo(User, { foreignKey: 'gridMemberId', as: 'gridMember' })

Elderly.hasMany(Warning, { foreignKey: 'elderlyId', as: 'warnings' })
Warning.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

User.hasMany(Warning, { foreignKey: 'handlerId', as: 'handledWarnings' })
Warning.belongsTo(User, { foreignKey: 'handlerId', as: 'handler' })

Warning.hasMany(WarningActionLog, { foreignKey: 'warningId', as: 'actionLogs' })
WarningActionLog.belongsTo(Warning, { foreignKey: 'warningId', as: 'warning' })
User.hasMany(WarningActionLog, { foreignKey: 'operatorId', as: 'warningActions' })
WarningActionLog.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' })

Elderly.hasMany(ServiceRecord, { foreignKey: 'elderlyId', as: 'serviceRecords' })
ServiceRecord.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(HealthRecord, { foreignKey: 'elderlyId', as: 'healthRecords' })
HealthRecord.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' })
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' })

Elderly.hasMany(HealthData, { foreignKey: 'elderlyId', as: 'healthData' })
HealthData.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(ActivityTrack, { foreignKey: 'elderlyId', as: 'activityTracks' })
ActivityTrack.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(EmotionRecord, { foreignKey: 'elderlyId', as: 'emotionRecords' })
EmotionRecord.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(CognitiveTest, { foreignKey: 'elderlyId', as: 'cognitiveTests' })
CognitiveTest.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(MedicationAdherence, { foreignKey: 'elderlyId', as: 'medicationAdherence' })
MedicationAdherence.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

User.hasOne(ServiceProvider, { foreignKey: 'userId', as: 'serviceProvider' })
ServiceProvider.belongsTo(User, { foreignKey: 'userId', as: 'user' })

Elderly.hasMany(ServiceRequest, { foreignKey: 'elderlyId', as: 'serviceRequests' })
ServiceRequest.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

ServiceProvider.hasMany(ServiceRequest, { foreignKey: 'assignedProviderId', as: 'assignedRequests' })
ServiceRequest.belongsTo(ServiceProvider, { foreignKey: 'assignedProviderId', as: 'assignedProvider' })

Elderly.hasOne(CommunityPoint, { foreignKey: 'elderlyId', as: 'communityPoint' })
CommunityPoint.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

Elderly.hasMany(PointTransaction, { foreignKey: 'elderlyId', as: 'pointTransactions' })
PointTransaction.belongsTo(Elderly, { foreignKey: 'elderlyId', as: 'elderly' })

export {
  User,
  Elderly,
  Warning,
  ServiceRecord,
  HealthRecord,
  Notification,
  HealthData,
  ActivityTrack,
  EmotionRecord,
  CognitiveTest,
  MedicationAdherence,
  ServiceProvider,
  ServiceRequest,
  CommunityPoint,
  PointTransaction,
  WarningActionLog
}