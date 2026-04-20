# Agent 平台模块说明（VNext）

## 1. 模块定位

Agent 平台是本项目的执行核心，负责把“问题分析”转为“任务闭环”。

在养老场景中，它承担三件事：

1. 生成可执行计划（Plan）；
2. 驱动执行流程（Auto/Approve）；
3. 追踪并回写结果（Outcome）。

---

## 2. 代码位置

### 后端核心
- `backend/src/routes/agentVNextRoutes.ts`
- `backend/src/services/agentVNextService.ts`
- `backend/src/services/agentOrchestratorService.ts`
- `backend/src/services/aiAgentService.ts`

### 前端核心
- `frontend/src/pages/AgentVNext.tsx`
- `frontend/src/pages/AgentCommandCenter.tsx`
- `frontend/src/pages/DataQuery.tsx`（上游上下文来源）

---

## 3. 核心能力

### 3.1 任务生命周期管理
任务状态：

- `queued`
- `planning`
- `pending_approval`
- `executing`
- `tracking`
- `done`
- `failed`
- `rejected`

支持从任务创建到完成闭环的全过程跟踪。

### 3.2 智能规划（Plan）
输入老人、事件、风险、模块、模型偏好等上下文，输出规划摘要和执行建议。

### 3.3 自主执行（Autonomous）
在允许自动执行时，系统可自动调用执行链路并返回执行轨迹。

### 3.4 人工审批（Approve/Reject）
当任务处于 `pending_approval`，管理员或经理可审批执行或驳回。

### 3.5 事件流推送（SSE）
通过 `text/event-stream` 推送任务进度，支持前端实时渲染执行阶段。

### 3.6 结果追踪（Outcome）
执行结束后记录跟踪结果，支持闭环指标沉淀（满意度、复发、逾期等）。

---

## 4. API 能力清单

基础前缀：`/api/agent-vnext`

- `POST /tasks`：创建任务（可自动执行）
- `GET /tasks/:taskId`：查询任务快照
- `GET /tasks/:taskId/events`：订阅任务 SSE 事件流
- `POST /tasks/:taskId/approve`：审批并执行任务
- `POST /tasks/:taskId/reject`：驳回任务
- `GET /context/:elderlyId`：上下文快照
- `POST /plan`：只规划不落地任务
- `POST /tools/execute`：批量工具执行
- `POST /autonomous`：自主决策执行
- `POST /outcome`：结果追踪记录
- `POST /policy/weekly-update`：周策略更新（admin）

详细字段见 `docs/api-contract.md`。

---

## 5. 权限模型（关键）

- 创建任务 / 查询任务：登录用户
- 审批 / 驳回 / 自主执行 / 工具执行：`admin` 或 `manager`
- 周策略更新：`admin`

---

## 6. 上下文贯通设计

运行台支持接收以下上游信息：

- `sourceQuery`：来源问题
- `sourceAnswer`：来源回答
- `sourceSuggestedAction`：建议动作数组
- `riskAnalysis`：风险分析对象
- `traceId`：请求链路追踪

这保证了问答、预警、运行台之间的连续性。

---

## 7. 典型流程

### 流程 A：自动执行
1. `POST /tasks`（`autoExecute=true`）
2. 系统规划完成后进入 `executing`
3. 自动执行并进入 `tracking`
4. 记录 outcome，任务 `done`

### 流程 B：审批执行
1. `POST /tasks`（`autoExecute=false`）
2. 状态进入 `pending_approval`
3. 管理员调用 `POST /tasks/:taskId/approve`
4. 系统执行并回写 outcome

### 流程 C：驳回
1. 任务处于 `pending_approval`
2. 管理员调用 `POST /tasks/:taskId/reject`
3. 状态更新为 `rejected`

---

## 8. 与业务模块协同

- `DataQuery`：提供问题语义和升级入口
- `RiskWarning`：提供预警驱动的任务来源
- `RiskAnalysis`：提供风险结构化输入
- `AgentCommandCenter`：承接结果统计和治理视图

---

## 9. 稳定性设计

- 路由级超时保护（withTimeout）
- Agent 接口单独限流（`/api/agent-vnext`）
- 参数校验与错误码规范
- SSE 心跳维持与断链清理

---

## 10. 演示建议

建议用一条真实场景串联：

1. 在 `DataQuery` 提问高风险问题；
2. 升级到 `AgentVNext` 创建任务；
3. 展示 SSE 事件流；
4. 在 `AgentCommandCenter` 展示闭环指标变化。

---

## 11. 小结

Agent 平台的价值不在“回答问题”本身，而在“推动问题被处理并可追踪地完成闭环”。这是本项目区别于传统查询系统和纯聊天系统的核心。
