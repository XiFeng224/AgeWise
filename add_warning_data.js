const axios = require('axios');

// 配置后端 API 地址
const API_BASE_URL = 'http://localhost:8003/api';

// 登录信息
const loginData = {
  username: 'admin',
  password: '123456'
};

// 老人数据
const elderlyDataList = [
  {
    name: '张大爷',
    age: 78,
    gender: 'male',
    idCard: '110101194701011234',
    phone: '13800001234',
    address: '幸福小区1栋101室',
    emergencyContact: '张小明',
    emergencyPhone: '13800005678',
    healthStatus: 'good',
    riskLevel: 'low',
    isAlone: true,
    gridMemberId: 1,
    notes: '独居老人'
  },
  {
    name: '李奶奶',
    age: 82,
    gender: 'female',
    idCard: '110101194402022345',
    phone: '13800002345',
    address: '幸福小区2栋202室',
    emergencyContact: '李小红',
    emergencyPhone: '13800006789',
    healthStatus: 'fair',
    riskLevel: 'medium',
    isAlone: true,
    gridMemberId: 1,
    notes: '高血压'
  }
];

// 预警数据 - 后续会根据实际老人 ID 动态更新
const warningDataList = [
  {
    warningType: 'health_abnormal',
    riskLevel: 'high',
    title: '血压危急，需立即干预',
    description: '老人血压高达 180/110 mmHg，超过正常范围，需要立即医疗干预。',
    triggerData: {
      bloodPressure: { systolic: 180, diastolic: 110 },
      timestamp: new Date().toISOString()
    }
  },
  {
    warningType: 'fall_risk',
    riskLevel: 'medium',
    title: '跌倒风险升高',
    description: '老人近24小时活动异常，多次在夜间起夜，存在跌倒风险。',
    triggerData: {
      activityPattern: '异常',
      nightActivities: 5,
      timestamp: new Date().toISOString()
    }
  },
  {
    warningType: 'medication_abnormal',
    riskLevel: 'low',
    title: '用药提醒',
    description: '老人今日未按时服用降压药，需要提醒。',
    triggerData: {
      medicationName: '降压药',
      missedDose: true,
      timestamp: new Date().toISOString()
    }
  },
  {
    warningType: 'emotion_abnormal',
    riskLevel: 'medium',
    title: '情绪异常',
    description: '老人近3天情绪低落，不愿与人交流，需要关注。',
    triggerData: {
      emotionScore: 30,
      socialInteraction: '减少',
      timestamp: new Date().toISOString()
    }
  },
  {
    warningType: 'stroke_risk',
    riskLevel: 'high',
    title: '中风风险',
    description: '老人出现短暂性言语不清，可能是中风前兆，需要紧急就医。',
    triggerData: {
      symptoms: ['言语不清', '面部麻木'],
      timestamp: new Date().toISOString()
    }
  }
];

// 登录获取 token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    if (response.data.success) {
      return response.data.data.accessToken;
    } else {
      throw new Error('登录失败');
    }
  } catch (error) {
    console.error('登录错误:', error.message);
    throw error;
  }
}

// 获取老人列表
async function getElderlyList(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/elderly`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 100
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('获取老人列表错误:', error.message);
    throw error;
  }
}

// 添加老人数据
async function addElderly(token, elderlyData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/elderly`, elderlyData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`老人添加成功: ${elderlyData.name}`);
    return response.data.data;
  } catch (error) {
    console.error(`添加老人错误: ${elderlyData.name}`, error.message);
    throw error;
  }
}

// 添加预警数据
async function addWarning(token, warningData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/warnings`, warningData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`预警添加成功: ${warningData.title}`);
    return response.data.data;
  } catch (error) {
    console.error(`添加预警错误: ${warningData.title}`, error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log('开始添加预警数据...');
    
    // 登录获取 token
    const token = await login();
    console.log('登录成功，获取到 token');
    
    // 获取老人列表
    let elderlyList = await getElderlyList(token);
    console.log(`当前老人数量: ${elderlyList.length}`);
    console.log('老人列表:', JSON.stringify(elderlyList, null, 2));
    
    // 如果没有老人，添加老人数据
    if (elderlyList.length === 0) {
      console.log('没有老人数据，开始添加老人...');
      for (const elderlyData of elderlyDataList) {
        await addElderly(token, elderlyData);
        // 等待 1 秒，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('老人数据添加完成！');
      
      // 重新获取老人列表
      elderlyList = await getElderlyList(token);
      console.log(`添加后老人数量: ${elderlyList.length}`);
      console.log('添加后老人列表:', JSON.stringify(elderlyList, null, 2));
    }
    
    // 批量添加预警数据
    for (let i = 0; i < warningDataList.length; i++) {
      const warningData = warningDataList[i];
      // 使用实际存在的老人 ID
      const elderlyId = elderlyList[i % elderlyList.length].id;
      const warningDataWithElderlyId = {
        ...warningData,
        elderlyId,
        triggerData: {
          ...warningData.triggerData,
          timestamp: new Date().toISOString()
        }
      };
      console.log('添加预警数据:', JSON.stringify(warningDataWithElderlyId, null, 2));
      await addWarning(token, warningDataWithElderlyId);
      // 等待 1 秒，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('预警数据添加完成！');
  } catch (error) {
    console.error('添加预警数据失败:', error);
  }
}

// 执行主函数
main();
