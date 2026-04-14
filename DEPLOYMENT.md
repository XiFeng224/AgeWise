# 银龄智护 Agent 平台部署指南

## 一、系统架构

本项目采用前后端分离架构：

- 前端：React + TypeScript + Ant Design
- 后端：Node.js + Express + TypeScript
- AI 能力：千问 / NLP Agent / 规则兜底
- 数据存储：MySQL

---

## 二、环境要求

### 运行环境
- Node.js 18+
- MySQL 8+
- Python 3.8+（如使用 NLP Agent）
- Windows / Linux / macOS 均可

### 推荐环境
- 内存 8GB 以上
- 可用磁盘空间 10GB 以上

---

## 三、启动方式

### 1. 启动后端

```bash
cd backend
npm install
npm run dev
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 3. 启动 Python Agent（如启用）

```bash
cd agent-service
pip install -r requirements.txt
python run_nlp_agent.py
```

---

## 四、环境变量

### 后端常用配置
```env
PORT=8000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret
DASHSCOPE_API_KEY=your_qwen_key
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
```

### 前端常用配置
如果前端使用代理或环境变量，请确保 API 基地址配置正确。

---

## 五、访问入口

- 前端地址：`http://localhost:3000`
- 后端接口：`http://localhost:8000`

---

## 六、功能验证建议

部署完成后，建议依次检查：

1. 登录是否正常
2. 首页是否能加载
3. 智能问答是否能请求接口
4. 风险预警是否能查看列表与详情
5. 运行台是否能创建任务并接收上下文
6. 指挥中心是否能展示任务和来源统计
7. 通知中心、老人管理、健康档案是否能正常联动

---

## 七、常见问题

### 1. 问答没有回答
- 检查后端是否启动
- 检查 AI Key 是否配置
- 检查网络请求地址是否正确

### 2. 运行台无法创建任务
- 检查登录状态
- 检查后端路由是否正常
- 检查接口返回错误信息

### 3. 通知/预警列表为空
- 检查后端数据是否已初始化
- 检查当前账户权限

---

## 八、部署说明

当前项目更适合以下方式部署：
- 本地开发演示
- 局域网演示
- Docker 容器化部署（如后续扩展）

---

## 九、备注

如果你已经将代码上传到 GitHub，建议同步补充：
- 项目截图
- 演示账号
- 数据初始化说明
- 常见问题说明

这样仓库会更完整，也更方便展示与答辩。
