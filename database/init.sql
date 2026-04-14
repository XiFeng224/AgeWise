-- 社区养老数据查询与风险预警系统数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS elderly_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE elderly_care;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('admin', 'manager', 'grid', 'family') DEFAULT 'grid',
    real_name VARCHAR(50) NOT NULL,
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

-- 老人信息表
CREATE TABLE IF NOT EXISTS elderly (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    id_card VARCHAR(18) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    emergency_contact VARCHAR(50) NOT NULL,
    emergency_phone VARCHAR(20) NOT NULL,
    health_status ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
    is_alone BOOLEAN DEFAULT FALSE,
    grid_member_id INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (grid_member_id) REFERENCES users(id)
);

-- 预警记录表
CREATE TABLE IF NOT EXISTS warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    warning_type VARCHAR(50) NOT NULL,
    risk_level ENUM('low', 'medium', 'high') NOT NULL,
    description TEXT NOT NULL,
    trigger_data JSON NOT NULL,
    status ENUM('pending', 'processing', 'resolved') DEFAULT 'pending',
    handler_id INT,
    handle_time DATETIME,
    handle_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id),
    FOREIGN KEY (handler_id) REFERENCES users(id)
);

-- 服务记录表
CREATE TABLE IF NOT EXISTS service_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    service_provider VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id)
);

-- 健康记录表（扩展功能）
CREATE TABLE IF NOT EXISTS health_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    record_date DATE NOT NULL,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    blood_sugar DECIMAL(4,2),
    heart_rate INT,
    temperature DECIMAL(3,1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id)
);

-- 门禁记录表（扩展功能）
CREATE TABLE IF NOT EXISTS access_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    access_time DATETIME NOT NULL,
    access_type ENUM('in', 'out') NOT NULL,
    device_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id)
);

-- 查询历史记录表
CREATE TABLE IF NOT EXISTS query_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query_text TEXT NOT NULL,
    generated_sql TEXT,
    result_count INT,
    execution_time DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_elderly_risk_level ON elderly(risk_level);
CREATE INDEX idx_elderly_health_status ON elderly(health_status);
CREATE INDEX idx_elderly_grid_member ON elderly(grid_member_id);
CREATE INDEX idx_warnings_elderly_id ON warnings(elderly_id);
CREATE INDEX idx_warnings_status ON warnings(status);
CREATE INDEX idx_warnings_created_at ON warnings(created_at);
CREATE INDEX idx_service_records_elderly_id ON service_records(elderly_id);
CREATE INDEX idx_service_records_service_date ON service_records(service_date);
CREATE INDEX idx_access_records_elderly_time ON access_records(elderly_id, access_time);

-- 插入初始数据
-- 默认管理员用户（密码：admin123）
INSERT INTO users (username, password, email, phone, role, realName, isActive) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'admin@elderlycare.com', '13800000000', 'admin', '系统管理员', true),
('manager1', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'manager1@elderlycare.com', '13800000001', 'manager', '社区管理员张三', true),
('grid1', '$2a$12$LQv3c1yqBWVHrn6Z5qU0QeY8QnZ5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Qb5Q', 'grid1@elderlycare.com', '13800000002', 'grid', '网格员李四', true);

-- 插入示例老人数据
INSERT INTO elderly (name, age, gender, id_card, phone, address, emergency_contact, emergency_phone, health_status, risk_level, is_alone, grid_member_id) VALUES 
('张大爷', 78, 'male', '110101194501011234', '13800138001', '幸福小区1栋101室', '张大妈', '13800138002', 'good', 'medium', TRUE, 3),
('李奶奶', 82, 'female', '110101194201011235', '13800138003', '和谐小区3栋205室', '李大伯', '13800138004', 'fair', 'high', FALSE, 3),
('王爷爷', 75, 'male', '110101194801011236', '13800138005', '平安小区5栋302室', '王大妈', '13800138006', 'excellent', 'low', TRUE, 3);

-- 插入示例预警记录
INSERT INTO warnings (elderly_id, warning_type, risk_level, description, trigger_data) VALUES 
(1, 'health_abnormal', 'high', '血压连续3次超过180/110mmHg', '{"blood_pressure": 185, "duration": 3}'),
(2, 'no_access_record', 'medium', '48小时无门禁出入记录', '{"last_access_hours": 50}');

-- 插入示例服务记录
INSERT INTO service_records (elderly_id, service_type, service_date, service_provider, description, rating) VALUES 
(1, 'health_check', '2024-01-15', '社区医生', '定期健康检查，血压偏高需关注', 4),
(2, 'home_visit', '2024-01-14', '网格员李四', '日常上门关怀服务', 5);

COMMIT;