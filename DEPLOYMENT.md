# 银龄智护 Agent 平台部署指南

本文档基于当前仓库结构整理，适用于本地开发、局域网演示和轻量生产部署。

---

## 1. 部署架构

- 前端：`frontend`（React + TypeScript + Vite）
- 后端：`backend`（Node.js + Express + TypeScript）
- 数据库：MySQL 8+
- 可选能力：Python Agent（`agent-service`）

---

## 2. 环境要求

### 必需
- Node.js 18+
- MySQL 8+

### 可选
- Python 3.8+（启用 Python Agent 时）
- Redis（启用缓存/令牌黑名单能力时）

---

## 3. 快速启动

### 3.1 启动后端

```bash
cd backend
npm install
npm run dev
```

### 3.2 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 3.3 启动 Python Agent（可选）

```bash
cd agent-service
pip install -r requirements.txt
python run_nlp_agent.py
```

---

## 4. 环境变量建议

> 以下为常见变量示例，按你的本地/服务器实际配置填写。

### 4.1 后端（`backend/.env`）

```env
PORT=8000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=elderly_care
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret

# 模型配置（按需启用）
DASHSCOPE_API_KEY=your_qwen_key
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions

# 可选：启动时是否自动 alter 表结构
DB_SYNC_ALTER=false
```

### 4.2 前端（`frontend/.env`）

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 5. 数据初始化（强烈推荐）

首次启动后建议在 `backend` 目录执行：

```bash
npm run seed:china
npm run seed:more-elderly
npm run seed:high-risk
npm run seed:agent-bundle
```

这样可以快速得到可演示的老人、预警、健康与任务数据。

---

## 6. 验证清单

部署完成后，建议按顺序验证：

1. `GET /health` 返回 `success: true`；
2. 登录接口可正常获取 token；
3. 老人列表、预警列表可正常读取；
4. 问答页可发起查询并返回建议动作；
5. 运行台可创建任务并看到 SSE 事件流；
6. 指挥中心可看到闭环相关统计。

---

## 7. 常见问题排查

### 7.1 前端请求失败（网络错误）
- 检查后端是否已启动；
- 检查 `VITE_API_BASE_URL` 是否正确；
- 检查浏览器控制台与后端日志中的 `traceId`。

### 7.2 登录成功但接口 401
- 检查 token 是否已写入本地存储；
- 检查请求头是否带 `Authorization: Bearer <token>`；
- 检查 token 是否过期或被加入黑名单。

### 7.3 运行台看不到事件流
- 检查 `/api/agent-vnext/tasks/:taskId/events` 是否可访问；
- 确认带上 token（Header 或 query）；
- 检查反向代理是否禁用 SSE 缓冲（如 Nginx）。

### 7.4 数据为空
- 执行数据种子脚本；
- 检查数据库连接配置与库名是否一致。

---

## 8. 生产部署建议

- 使用 Nginx 统一反向代理前后端；
- 后端使用 PM2 或容器守护；
- 将敏感配置放入环境变量，不写入仓库；
- 对 `/api/agent-vnext/*` 保留限流策略；
- 增加日志聚合与告警（按 traceId 关联请求链路）。

---

## 9. 一句话总结

先确保“服务可启动 + 数据可导入 + 关键链路可跑通（问答→任务→事件流→治理）”，再进入演示或答辩。
