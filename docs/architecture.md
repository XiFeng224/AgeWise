# 银龄智护 Agent 平台架构说明

## 1. 架构目标

系统围绕社区养老的真实处理链路设计：

- 从“信息查询”升级为“问题理解 + 任务执行”；
- 从“单模块处理”升级为“跨模块联动”；
- 从“结果分散”升级为“治理视角统一闭环”。

---

## 2. 总体架构

```text
前端管理端（React + TS + Ant Design + ECharts）
                │ HTTP / SSE / WebSocket
                ▼
后端 API 网关（Express + TS）
  ├─ 鉴权与权限（JWT + RBAC）
  ├─ 校验与限流（validate + rateLimit）
  ├─ 请求上下文（traceId）
  ├─ 业务路由（elderly / warnings / health / query / agent-vnext ...）
  └─ Agent 任务编排与执行
                │
                ├──────────────► MySQL（业务数据）
                ├──────────────► Redis（缓存/令牌黑名单，可选）
                └──────────────► 外部模型服务（qwen / deepseek / rule / python agent）
```

---

## 3. 前端层

### 3.1 技术栈
- React 18 + TypeScript + Vite
- Ant Design + ECharts
- React Router

### 3.2 主要页面
- `Dashboard`：平台总览与入口
- `DataQuery`：智能问答与升级任务入口
- `RiskWarning`：预警管理与处置
- `RiskAnalysis`：单老人风险分析
- `ElderlyManagement`：老人档案管理
- `HealthRecords`：健康记录与异常联动
- `Notifications`：通知管理
- `AgentVNext`：运行台（任务全流程）
- `AgentCommandCenter`：治理看板

### 3.3 前端通信模式
- 普通查询：REST API
- 任务执行进度：SSE（`/api/agent-vnext/tasks/:taskId/events`）
- 实时消息能力：WebSocket（`/ws`）

---

## 4. 后端层

### 4.1 技术栈
- Node.js + Express + TypeScript
- Sequelize ORM
- JWT 鉴权 + RBAC

### 4.2 核心中间件
- `auth`：鉴权与角色授权
- `validate`：参数/Body/Query 校验
- `requestContext`：traceId 注入
- `rateLimit`：全局与 Agent 路由限流
- `errorHandler`：统一异常处理

### 4.3 核心路由分组（`/api`）
- `/auth`：登录、refresh、profile
- `/elderly`：老人档案 CRUD
- `/warnings`：预警查询、处置、统计
- `/health`：健康数据接入、趋势、主动感知
- `/query`：自然语言查询
- `/notifications`：通知中心
- `/risk-analysis`：单老人风险分析
- `/agent-vnext`：任务运行台能力
- `/statistics`、`/system`、`/agent`、`/ai-agent`

---

## 5. Agent 执行架构

### 5.1 运行台任务状态机
`queued -> planning -> pending_approval -> executing -> tracking -> done`

失败或中断状态：`failed`、`rejected`

### 5.2 关键能力
- **plan**：生成任务规划与执行建议
- **autonomous**：自主决策并执行工具链
- **tools/execute**：工具批量执行
- **outcome**：结果追踪与回写
- **events(SSE)**：实时事件流推送

### 5.3 事件示例
- `TASK_CREATED`
- `TASK_PLANNING`
- `TASK_PLANNED`
- `TASK_PENDING_APPROVAL`
- `TASK_EXECUTING`
- `TASK_TRACKING`
- `TASK_DONE`
- `TASK_FAILED`
- `TASK_REJECTED`

---

## 6. 数据层

### 6.1 MySQL
承载老人档案、健康数据、预警、服务请求、通知、用户等核心业务数据。

### 6.2 Redis（可选）
用于缓存、令牌黑名单与临时会话数据。

---

## 7. 关键业务流

### 7.1 问答升级任务流
1. 用户在 `DataQuery` 提问；
2. 后端返回 answer + 建议动作；
3. 若识别为需处置场景，跳转 `AgentVNext`；
4. 运行台创建任务并规划；
5. 自动执行或审批后执行；
6. 通过 SSE 回传过程；
7. `AgentCommandCenter` 汇总治理指标。

### 7.2 预警处置流
1. 预警由健康数据或主动感知触发；
2. 用户在 `RiskWarning` 查看并处理；
3. 可一键进入问答或运行台；
4. 处置结果回写并计入统计。

---

## 8. 安全与可观测性

- JWT + 角色权限
- 参数校验与统一错误响应
- 路由级限流（尤其是 Agent 相关接口）
- traceId 贯穿请求、执行、回写链路
- 健康检查端点：`GET /health`
- API 摘要端点：`GET /api/docs`

---

## 9. 部署形态

- 开发环境：前后端分离本地启动
- 演示环境：局域网/单机部署
- 生产扩展方向：
  - Nginx 反向代理
  - 容器化部署
  - Agent 能力独立服务化

---

## 10. 小结

本架构将养老业务中的“问答、预警、任务执行、治理分析”解耦为清晰分层，并通过统一上下文与事件机制完成贯通，兼顾了演示效果、工程可维护性和后续扩展空间。
