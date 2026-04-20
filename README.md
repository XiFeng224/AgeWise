# 银龄智护 Agent 平台

面向社区养老场景的智能化业务平台，围绕 **“先理解问题，再升级任务，再执行闭环”** 设计，打通智能问答、风险预警、任务运行和治理看板。

---

## 1. 项目简介

银龄智护 Agent 平台不是单一查询系统，也不是通用聊天机器人，而是一个面向养老业务的执行型平台：

- 问答：支持自然语言提问，优先给出解释性回答；
- 路由：当问题涉及风险或处置时，可升级为任务；
- 执行：运行台完成规划、审批/自动执行、结果追踪；
- 治理：指挥中心统一查看来源、效率与闭环情况。

---

## 2. 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design
- ECharts
- React Router

### 后端
- Node.js + Express + TypeScript
- Sequelize
- MySQL
- JWT 鉴权
- SSE 事件流
- WebSocket（`/ws`）

### AI / Agent
- 多模型路由（`auto | qwen | deepseek | rule`）
- 任务规划 / 自主决策 / 工具执行 / 结果回写
- Python Agent（可选）

---

## 3. 当前项目结构

```text
项目三/
├─ backend/                      # 后端服务（Express + TS）
│  ├─ src/
│  │  ├─ routes/                 # 路由（auth/elderly/warnings/agent-vnext...）
│  │  ├─ controllers/            # 控制器
│  │  ├─ services/               # 业务服务与 Agent 能力
│  │  ├─ middleware/             # 认证、校验、限流、上下文
│  │  ├─ models/                 # Sequelize 模型
│  │  └─ scripts/                # 数据种子脚本
├─ frontend/                     # 前端管理端（React + TS）
│  └─ src/
│     ├─ pages/                  # 页面模块
│     ├─ components/             # 公共组件
│     └─ utils/                  # axios 实例等
├─ docs/                         # 详细文档（架构、API、Agent 平台说明）
├─ DATA_SEED_GUIDE.md            # 数据增强指南
├─ DEPLOYMENT.md                 # 部署指南
├─ DEMO_SCRIPT.md                # 演示脚本
├─ OPERATION_FLOW.md             # 操作流程与联动说明
└─ PROJECT_SUMMARY.md            # 项目总结
```

---

## 4. 主要页面与能力

- `Dashboard`：平台入口与概览
- `DataQuery`：智能问答与任务升级入口
- `RiskWarning`：风险预警列表、统计、处置
- `RiskAnalysis`：单老人风险分析报告
- `ElderlyManagement`：老人信息管理与联动
- `HealthRecords`：健康数据、建议与异常联动
- `Notifications`：通知管理与快速跳转
- `AgentVNext`：任务运行台（创建、规划、审批/执行、追踪）
- `AgentCommandCenter`：治理总览（SLA、闭环率、来源统计）

---

## 5. 快速启动

### 5.1 环境要求
- Node.js 18+
- MySQL 8+
- Python 3.8+（仅当启用 Python Agent）

### 5.2 启动后端

```bash
cd backend
npm install
npm run dev
```

默认后端端口：`8000`（可通过 `PORT` 覆盖）

### 5.3 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认前端开发地址：`http://localhost:3000`

### 5.4 启动 Python Agent（可选）

```bash
cd agent-service
pip install -r requirements.txt
python run_nlp_agent.py
```

---

## 6. 数据初始化（推荐）

在 `backend` 目录执行：

```bash
npm run seed:china
npm run seed:more-elderly
npm run seed:high-risk
npm run seed:agent-bundle
```

用于快速构建“有老人、有风险、有任务、有闭环”的演示数据。

---

## 7. 关键接口入口

- 健康检查：`GET /health`
- API 文档摘要：`GET /api/docs`
- 运行台任务：`/api/agent-vnext/*`
- 风险分析：`GET /api/risk-analysis/:elderlyId`
- 预警管理：`/api/warnings/*`

详细契约见 `docs/api-contract.md`。

---

## 8. 推荐演示链路

1. `DataQuery` 提问并触发升级建议；
2. 跳转 `AgentVNext` 创建任务并查看事件流；
3. 在 `RiskWarning` 展示预警处置与回访；
4. 在 `AgentCommandCenter` 展示闭环治理指标。

---

## 9. 文档导航

- 架构：`docs/architecture.md`
- API 契约：`docs/api-contract.md`
- Agent 模块：`docs/agent-platform.md`
- 部署：`DEPLOYMENT.md`
- 操作流程：`OPERATION_FLOW.md`
- 数据增强：`DATA_SEED_GUIDE.md`
- 演示脚本：`DEMO_SCRIPT.md`
- 项目总结：`PROJECT_SUMMARY.md`

---

## 10. 项目定位一句话

**银龄智护 Agent 平台：面向社区养老的智能问答、任务路由、执行编排与闭环治理平台。**
