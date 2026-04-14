# 社区养老数据查询与风险预警系统部署指南

## 系统架构概述

本项目采用前后端分离的微服务架构：

- **前端**：React + TypeScript + Ant Design Pro (端口: 3000)
- **后端API服务**：Node.js + Express + TypeScript (端口: 8000) 
- **智能Agent服务**：Python FastAPI (端口: 8001)
- **数据库**：MySQL 5.7+

## 环境要求

### 硬件要求
- 内存：4GB+ 
- 存储：10GB+ 可用空间
- 网络：稳定的互联网连接（用于大模型API调用）

### 软件要求
- Node.js 16.0+
- Python 3.8+
- MySQL 5.7+ 或 PostgreSQL 12+
- Redis 6.0+（可选，用于缓存）

## 部署步骤

### 1. 数据库准备

```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source database/init.sql
```

### 2. 后端服务部署

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑环境变量（根据实际情况修改）
vi .env

# 启动开发服务器
npm run dev

# 或构建生产版本
npm run build
npm start
```

### 3. 智能Agent服务部署

```bash
# 进入Agent服务目录
cd agent-service

# 创建Python虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp .env.example .env

# 编辑环境变量（配置OpenAI API密钥等）
vi .env

# 启动Agent服务
python main.py
```

### 4. 前端部署

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或构建生产版本
npm run build
```

### 5. 使用Docker部署（可选）

项目支持Docker容器化部署，具体配置参考 `docker-compose.yml` 文件。

## 配置说明

### 后端服务配置 (.env)

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=elderly_care
DB_USER=root
DB_PASSWORD=your_password

# JWT密钥
JWT_SECRET=your-jwt-secret-key

# 服务器配置
PORT=8000
NODE_ENV=production
```

### Agent服务配置 (.env)

```env
# OpenAI配置
OPENAI_API_KEY=your-openai-api-key

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=elderly_care
DB_USER=root
DB_PASSWORD=your_password

# 服务配置
AGENT_PORT=8001
```

## 系统初始化

1. **访问系统**：打开浏览器访问 `http://localhost:3000`
2. **初始登录**：使用默认管理员账户
   - 用户名：`admin`
   - 密码：`admin123`
3. **配置系统**：在系统设置中配置预警规则、用户权限等

## 功能验证

部署完成后，请验证以下核心功能：

1. ✅ 用户登录认证
2. ✅ 老人信息管理
3. ✅ 自然语言查询
4. ✅ 风险预警生成
5. ✅ 数据统计分析
6. ✅ 多端数据同步

## 监控与维护

### 服务监控

```bash
# 检查后端服务状态
curl http://localhost:8000/health

# 检查Agent服务状态  
curl http://localhost:8001/health

# 检查数据库连接
mysql -u root -p -e "USE elderly_care; SELECT COUNT(*) FROM users;"
```

### 日志查看

- 后端日志：`backend/logs/`
- Agent服务日志：`agent-service/logs/` 
- 数据库日志：MySQL错误日志

### 数据备份

```sql
# 数据库备份
mysqldump -u root -p elderly_care > backup_$(date +%Y%m%d).sql

# 定期备份脚本（建议每天执行）
0 2 * * * /usr/bin/mysqldump -u root -p密码 elderly_care > /backup/elderly_care_$(date +%Y%m%d).sql
```

## 故障排除

### 常见问题

1. **端口冲突**：修改对应服务的端口配置
2. **数据库连接失败**：检查数据库服务状态和连接参数
3. **大模型API调用失败**：检查网络连接和API密钥配置
4. **前端无法访问**：检查前端服务是否正常启动

### 日志分析

查看各服务的日志文件，定位具体错误：

- 后端错误：查看 `backend/logs/error.log`
- Agent服务错误：查看控制台输出或日志文件
- 数据库错误：查看MySQL错误日志

## 安全建议

1. **修改默认密码**：首次部署后立即修改默认管理员密码
2. **配置HTTPS**：生产环境务必启用HTTPS
3. **防火墙配置**：只开放必要的端口（3000, 8000, 8001）
4. **定期更新**：保持系统和依赖库的最新版本
5. **数据加密**：敏感数据在传输和存储时进行加密

## 性能优化

### 数据库优化

```sql
-- 添加索引优化查询性能
CREATE INDEX idx_elderly_compound ON elderly(risk_level, health_status, grid_member_id);
CREATE INDEX idx_warnings_composite ON warnings(elderly_id, status, created_at);
```

### 缓存优化

启用Redis缓存高频查询结果：

```javascript
// 后端缓存配置
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

### 前端优化

- 启用Gzip压缩
- 配置CDN加速静态资源
- 使用懒加载优化大型数据集

## 扩展开发

系统支持以下扩展方向：

1. **移动端开发**：基于现有API开发微信小程序
2. **第三方集成**：对接医疗设备、智能家居等
3. **AI功能增强**：引入更多大模型能力
4. **报表定制**：支持自定义报表模板

## 技术支持

如遇部署问题，请联系：
- 项目文档：查看项目README.md
- 问题反馈：创建GitHub Issue
- 技术交流：加入开发者社区