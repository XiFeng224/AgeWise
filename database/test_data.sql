-- 社区养老系统测试数据
-- 创建时间：2025-03-30

-- 插入用户数据
INSERT INTO users (username, password, email, phone, role, realName, isActive) VALUES
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@elderly.com', '13800000000', 'admin', '系统管理员', 1),
('manager1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager1@elderly.com', '13800000001', 'manager', '张社区管理员', 1),
('grid1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'grid1@elderly.com', '13800000002', 'grid', '李网格员', 1),
('grid2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'grid2@elderly.com', '13800000003', 'grid', '王网格员', 1),
('family1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'family1@elderly.com', '13800000004', 'family', '赵家属', 1);

-- 插入老人数据
INSERT INTO elderly (name, age, gender, idCard, phone, address, emergencyContact, emergencyPhone, healthStatus, riskLevel, isAlone, gridMemberId, notes) VALUES
('张大爷', 78, 'male', '110101194501011234', '13800010001', '幸福小区1栋101室', '张小张', '13800010002', 'good', 'low', 1, 3, '独居老人，身体状况良好，定期需要血压监测'),
('李奶奶', 82, 'female', '110101194301021234', '13800010003', '阳光小区2栋202室', '李小李', '13800010004', 'fair', 'medium', 0, 3, '与儿子同住，有高血压病史，需要定期服药'),
('王爷爷', 75, 'male', '110101194801031234', '13800010005', '和谐小区3栋303室', '王小王', '13800010006', 'good', 'low', 1, 4, '独居老人，喜欢散步，社交活跃'),
('赵奶奶', 85, 'female', '110101193901041234', '13800010007', '平安小区4栋404室', '赵小赵', '13800010008', 'poor', 'high', 1, 4, '高龄独居老人，行动不便，需要重点关注'),
('刘大爷', 80, 'male', '110101194201051234', '13800010009', '温馨小区5栋505室', '刘小刘', '13800010010', 'fair', 'medium', 0, 3, '与女儿同住，有糖尿病史'),
('陈奶奶', 79, 'female', '110101194401061234', '13800010011', '祥和小区6栋606室', '陈小陈', '13800010012', 'good', 'low', 1, 4, '独居老人，精神状态良好'),
('杨爷爷', 83, 'male', '110101194001071234', '13800010013', '和谐小区7栋707室', '杨小杨', '13800010014', 'fair', 'medium', 0, 3, '与老伴同住，需要定期健康检查'),
('黄奶奶', 81, 'female', '110101194101081234', '13800010015', '平安小区8栋808室', '黄小黄', '13800010016', 'poor', 'high', 1, 4, '高龄独居，有心脏病史'),
('周大爷', 77, 'male', '110101194601091234', '13800010017', '幸福小区9栋909室', '周小周', '13800010018', 'good', 'low', 1, 3, '独居老人，喜欢下棋'),
('吴奶奶', 84, 'female', '110101193801101234', '13800010019', '阳光小区10栋1010室', '吴小吴', '13800010020', 'fair', 'medium', 0, 4, '与儿子同住，需要生活照料');

-- 插入预警记录数据
INSERT INTO warnings (elderlyId, warningType, riskLevel, description, triggerData, status, handlerId, handleTime, handleNotes) VALUES
(4, 'health_abnormal', 'high', '赵奶奶血压连续3天异常偏高', '{"type": "blood_pressure", "value": "180/110", "threshold": "140/90"}', 'pending', NULL, NULL, NULL),
(8, 'no_movement', 'medium', '黄奶奶48小时无门禁出入记录', '{"last_movement": "2025-03-28 10:00:00", "threshold_hours": 48}', 'processing', 3, '2025-03-30 09:00:00', '已电话联系确认安全'),
(2, 'health_abnormal', 'medium', '李奶奶血糖指标异常', '{"type": "blood_sugar", "value": "12.5", "threshold": "7.8"}', 'resolved', 3, '2025-03-29 15:30:00', '已安排上门检查，调整用药方案'),
(1, 'weather_risk', 'low', '寒潮预警，提醒张大爷注意保暖', '{"weather": "cold_wave", "temperature": "-5℃", "warning_level": "蓝色"}', 'pending', NULL, NULL, NULL),
(6, 'no_movement', 'low', '陈奶奶24小时无门禁出入记录', '{"last_movement": "2025-03-29 14:00:00", "threshold_hours": 24}', 'pending', NULL, NULL, NULL);

-- 插入服务记录数据
INSERT INTO service_records (elderlyId, serviceType, serviceDate, serviceProvider, description, notes, rating) VALUES
(2, 'health_check', '2025-03-28 10:00:00', '李网格员', '定期血压血糖测量', '血压140/85，血糖7.2，情况稳定', 5),
(4, 'home_visit', '2025-03-27 14:30:00', '王网格员', '上门关怀服务', '老人精神状态良好，生活需求正常', 4),
(1, 'health_check', '2025-03-26 09:00:00', '李网格员', '常规健康检查', '血压正常，心肺功能良好', 5),
(8, 'emergency', '2025-03-25 16:00:00', '张社区管理员', '紧急情况处理', '老人突发不适，及时送医', 5),
(3, 'activity', '2025-03-24 15:00:00', '社区志愿者', '社区健康讲座', '老人积极参与，收获良好', 4);

-- 插入健康记录数据（模拟表）
INSERT INTO health_records (elderlyId, recordDate, bloodPressure, bloodSugar, heartRate, temperature, weight, notes) VALUES
(1, '2025-03-30 08:00:00', '125/80', '5.6', 72, 36.5, 65.2, '身体状况良好'),
(2, '2025-03-30 08:30:00', '140/85', '7.2', 75, 36.6, 58.7, '血压偏高，需继续监测'),
(4, '2025-03-30 09:00:00', '180/110', '6.8', 82, 36.7, 62.3, '血压异常，需要医疗干预'),
(8, '2025-03-30 09:30:00', '130/85', '8.5', 78, 36.5, 61.8, '血糖控制需加强');

-- 插入门禁记录数据（模拟表）
INSERT INTO access_records (elderlyId, accessTime, accessType, location, notes) VALUES
(1, '2025-03-30 07:30:00', 'out', '小区大门', '早晨散步'),
(1, '2025-03-30 08:15:00', 'in', '小区大门', '返回家中'),
(2, '2025-03-30 09:00:00', 'out', '小区侧门', '买菜'),
(2, '2025-03-30 10:30:00', 'in', '小区侧门', '返回家中'),
(3, '2025-03-30 14:00:00', 'out', '小区大门', '社区活动'),
(3, '2025-03-30 16:30:00', 'in', '小区大门', '返回家中');

-- 插入系统日志数据（模拟表）
INSERT INTO system_logs (userId, action, module, description, ipAddress, userAgent) VALUES
(1, 'login', 'auth', '用户登录系统', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(3, 'query', 'data', '查询老人列表', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'),
(3, 'update', 'warning', '处理预警记录', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'),
(4, 'create', 'service', '创建服务记录', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'export', 'report', '导出统计报表', '192.168.1.103', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

-- 演示数据统计信息
SELECT 
  '系统统计' as category,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT e.id) as elderly_count,
  COUNT(DISTINCT w.id) as warning_count,
  COUNT(DISTINCT s.id) as service_count
FROM 
  users u, elderly e, warnings w, service_records s
WHERE 
  u.isActive = 1;