-- 社区养老智能数据查询与风险预警系统 - 完整数据库设计
-- 创建数据库
CREATE DATABASE IF NOT EXISTS elderly_care_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE elderly_care_agent;

-- =============================================
-- 一、业务数据表（老人基本信息）
-- =============================================

-- 1. 老人基本信息表
CREATE TABLE IF NOT EXISTS elderly (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '老人ID',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    age INT NOT NULL COMMENT '年龄',
    gender ENUM('male', 'female') NOT NULL COMMENT '性别',
    id_card VARCHAR(18) UNIQUE NOT NULL COMMENT '身份证号',
    phone VARCHAR(20) NOT NULL COMMENT '联系电话',
    address VARCHAR(255) NOT NULL COMMENT '居住地址',
    emergency_contact VARCHAR(50) NOT NULL COMMENT '紧急联系人',
    emergency_phone VARCHAR(20) NOT NULL COMMENT '紧急联系电话',
    is_alone BOOLEAN DEFAULT FALSE COMMENT '是否独居',
    living_condition ENUM('alone', 'with_family', 'nursing_home') DEFAULT 'with_family' COMMENT '居住状况',
    grid_member_id INT NOT NULL COMMENT '负责网格员ID',
    family_member_id INT COMMENT '家属ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '软删除时间',
    INDEX idx_elderly_grid (grid_member_id),
    INDEX idx_elderly_family (family_member_id),
    INDEX idx_elderly_age (age),
    INDEX idx_elderly_alone (is_alone)
) COMMENT '老人基本信息表';

-- =============================================
-- 二、健康与行为数据表
-- =============================================

-- 2. 老人健康数据表
CREATE TABLE IF NOT EXISTS health_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    elderly_id INT NOT NULL COMMENT '老人ID',
    record_date DATE NOT NULL COMMENT '记录日期',
    blood_pressure_systolic INT COMMENT '收缩压',
    blood_pressure_diastolic INT COMMENT '舒张压',
    blood_sugar DECIMAL(4,2) COMMENT '血糖值',
    heart_rate INT COMMENT '心率',
    temperature DECIMAL(3,1) COMMENT '体温',
    weight DECIMAL(5,2) COMMENT '体重',
    health_status ENUM('excellent', 'good', 'fair', 'poor') COMMENT '健康状况评估',
    notes TEXT COMMENT '备注',
    recorded_by INT COMMENT '记录人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (elderly_id) REFERENCES elderly(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_health_elderly_date (elderly_id, record_date),
    INDEX idx_health_date (record_date)
) COMMENT '老人健康数据表';

-- 3. 门禁出入记录表
CREATE TABLE IF NOT EXISTS access_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    elderly_id INT NOT NULL COMMENT '老人ID',
    access_time DATETIME NOT NULL COMMENT '出入时间',
    access_type ENUM('in', 'out') NOT NULL COMMENT '出入类型',
    device_id VARCHAR(50) COMMENT '设备ID',
    location VARCHAR(100) COMMENT '位置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (elderly_id) REFERENCES elderly(id),
    INDEX idx_access_elderly_time (elderly_id, access_time),
    INDEX idx_access_time (access_time),
    INDEX idx_access_type (access_type)
) COMMENT '门禁出入记录表';

-- =============================================
-- 三、系统数据表
-- =============================================

-- 4. 用户表（管理员/网格员/家属）
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    role ENUM('admin', 'manager', 'grid', 'family') DEFAULT 'grid' COMMENT '角色',
    real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
    avatar VARCHAR(255) COMMENT '头像',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    last_login DATETIME COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at DATETIME COMMENT '软删除时间',
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
) COMMENT '用户表';

-- 5. 预警记录表
CREATE TABLE IF NOT EXISTS warnings (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '预警ID',
    elderly_id INT NOT NULL COMMENT '老人ID',
    warning_type VARCHAR(50) NOT NULL COMMENT '预警类型',
    risk_level ENUM('low', 'medium', 'high') NOT NULL COMMENT '风险等级',
    title VARCHAR(200) NOT NULL COMMENT '预警标题',
    description TEXT NOT NULL COMMENT '预警描述',
    trigger_data JSON NOT NULL COMMENT '触发数据',
    status ENUM('pending', 'processing', 'resolved') DEFAULT 'pending' COMMENT '处理状态',
    handler_id INT COMMENT '处理人ID',
    handle_time DATETIME COMMENT '处理时间',
    handle_notes TEXT COMMENT '处理备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (elderly_id) REFERENCES elderly(id),
    FOREIGN KEY (handler_id) REFERENCES users(id),
    INDEX idx_warnings_elderly (elderly_id),
    INDEX idx_warnings_status (status),
    INDEX idx_warnings_level (risk_level),
    INDEX idx_warnings_created (created_at)
) COMMENT '预警记录表';

-- 6. 服务记录表
CREATE TABLE IF NOT EXISTS service_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '服务ID',
    elderly_id INT NOT NULL COMMENT '老人ID',
    service_type ENUM('health_check', 'home_visit', 'emergency', 'consultation', 'other') NOT NULL COMMENT '服务类型',
    service_date DATE NOT NULL COMMENT '服务日期',
    service_time TIME COMMENT '服务时间',
    service_provider VARCHAR(100) NOT NULL COMMENT '服务提供者',
    description TEXT NOT NULL COMMENT '服务描述',
    location VARCHAR(200) COMMENT '服务地点',
    notes TEXT COMMENT '备注',
    rating INT CHECK (rating >= 1 AND rating <= 5) COMMENT '评分(1-5)',
    created_by INT NOT NULL COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (elderly_id) REFERENCES elderly(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_service_elderly (elderly_id),
    INDEX idx_service_date (service_date),
    INDEX idx_service_type (service_type)
) COMMENT '服务记录表';

-- 7. 查询日志表
CREATE TABLE IF NOT EXISTS query_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    user_id INT NOT NULL COMMENT '用户ID',
    query_text TEXT NOT NULL COMMENT '查询文本',
    intent_type VARCHAR(50) COMMENT '意图类型',
    generated_sql TEXT COMMENT '生成SQL',
    result_count INT COMMENT '结果数量',
    execution_time DECIMAL(10,4) COMMENT '执行时间(秒)',
    success BOOLEAN DEFAULT TRUE COMMENT '是否成功',
    error_message TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_logs_user (user_id),
    INDEX idx_logs_created (created_at),
    INDEX idx_logs_success (success)
) COMMENT '查询日志表';

-- 8. 系统操作日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    user_id INT COMMENT '用户ID',
    action_type VARCHAR(50) NOT NULL COMMENT '操作类型',
    action_target VARCHAR(100) COMMENT '操作目标',
    action_description TEXT COMMENT '操作描述',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_syslogs_user (user_id),
    INDEX idx_syslogs_action (action_type),
    INDEX idx_syslogs_created (created_at)
) COMMENT '系统操作日志表';

-- 9. 预警规则配置表
CREATE TABLE IF NOT EXISTS warning_rules (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '规则ID',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type VARCHAR(50) NOT NULL COMMENT '规则类型',
    description TEXT NOT NULL COMMENT '规则描述',
    conditions JSON NOT NULL COMMENT '触发条件',
    risk_level ENUM('low', 'medium', 'high') NOT NULL COMMENT '风险等级',
    is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    notification_targets JSON COMMENT '通知目标',
    created_by INT NOT NULL COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_rules_type (rule_type),
    INDEX idx_rules_enabled (is_enabled)
) COMMENT '预警规则配置表';

-- 10. 消息推送记录表
CREATE TABLE IF NOT EXISTS push_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    user_id INT NOT NULL COMMENT '用户ID',
    message_type VARCHAR(50) NOT NULL COMMENT '消息类型',
    title VARCHAR(200) NOT NULL COMMENT '消息标题',
    content TEXT NOT NULL COMMENT '消息内容',
    related_id INT COMMENT '关联ID',
    related_type VARCHAR(50) COMMENT '关联类型',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_time DATETIME COMMENT '阅读时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_push_user (user_id),
    INDEX idx_push_type (message_type),
    INDEX idx_push_read (is_read),
    INDEX idx_push_created (created_at)
) COMMENT '消息推送记录表';

-- =============================================
-- 外键约束和关联关系
-- =============================================

-- 更新老人表的外键约束
ALTER TABLE elderly 
ADD CONSTRAINT fk_elderly_grid_member 
FOREIGN KEY (grid_member_id) REFERENCES users(id);

ALTER TABLE elderly 
ADD CONSTRAINT fk_elderly_family_member 
FOREIGN KEY (family_member_id) REFERENCES users(id);

-- =============================================
-- 初始化数据
-- =============================================

-- 插入默认用户数据（密码均为：admin123）
INSERT INTO users (username, password, email, phone, role, real_name) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'admin@elderlycare.com', '13800000000', 'admin', '系统管理员'),
('manager1', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'manager1@elderlycare.com', '13800000001', 'manager', '社区管理员张三'),
('grid1', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'grid1@elderlycare.com', '13800000002', 'grid', '网格员李四'),
('family1', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'family1@elderlycare.com', '13800000003', 'family', '家属王五');

-- 插入示例老人数据
INSERT INTO elderly (name, age, gender, id_card, phone, address, emergency_contact, emergency_phone, is_alone, living_condition, grid_member_id, family_member_id) VALUES 
('张大爷', 78, 'male', '110101194501011234', '13800138001', '幸福小区1栋101室', '张大妈', '13800138002', TRUE, 'alone', 3, 4),
('李奶奶', 82, 'female', '110101194201011235', '13800138003', '和谐小区3栋205室', '李大伯', '13800138004', FALSE, 'with_family', 3, 4),
('王爷爷', 75, 'male', '110101194801011236', '13800138005', '平安小区5栋302室', '王大妈', '13800138006', TRUE, 'alone', 3, 4),
('赵奶奶', 85, 'female', '110101193901011237', '13800138007', '安康小区7栋401室', '赵大伯', '13800138008', FALSE, 'nursing_home', 3, 4);

-- 插入健康记录数据
INSERT INTO health_records (elderly_id, record_date, blood_pressure_systolic, blood_pressure_diastolic, blood_sugar, heart_rate, health_status, recorded_by) VALUES 
(1, '2024-01-15', 145, 90, 6.2, 75, 'good', 3),
(1, '2024-01-14', 150, 95, 6.5, 78, 'fair', 3),
(2, '2024-01-15', 130, 80, 5.8, 72, 'excellent', 3),
(3, '2024-01-15', 140, 85, 6.0, 76, 'good', 3);

-- 插入门禁记录数据
INSERT INTO access_records (elderly_id, access_time, access_type, device_id, location) VALUES 
(1, '2024-01-15 08:30:00', 'out', 'device001', '小区大门'),
(1, '2024-01-15 18:15:00', 'in', 'device001', '小区大门'),
(2, '2024-01-15 09:00:00', 'out', 'device002', '单元门'),
(2, '2024-01-15 17:30:00', 'in', 'device002', '单元门');

-- 插入预警规则数据
INSERT INTO warning_rules (rule_name, rule_type, description, conditions, risk_level, created_by) VALUES 
('独居老人出入异常', 'access_abnormal', '独居老人48小时无门禁出入记录', '{"metric": "last_access_hours", "operator": ">", "threshold": 48, "require_alone": true}', 'medium', 1),
('健康指标连续异常', 'health_abnormal', '血压/血糖连续3次超过警戒值', '{"metric": "blood_pressure", "operator": ">", "threshold": 140, "duration": 3}', 'high', 1),
('极端天气提醒', 'weather_warning', '极端天气条件下的健康提醒', '{"metric": "temperature", "operator": "<", "threshold": 0}', 'low', 1);

COMMIT;