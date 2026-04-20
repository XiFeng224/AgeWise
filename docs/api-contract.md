# 银龄智护 Agent 平台 API 契约（V1）

> 基础前缀：`/api`

统一响应：
- 成功：`{ success: true, data, message?, traceId? }`
- 失败：`{ success: false, error, details?, traceId? }`

统一错误码建议：`400/401/403/404/409/422/500/504`

---

## 1. 认证 Auth

### 1.1 登录
- `POST /auth/login`

```json
{
  "username": "admin",
  "password": "123456"
}
```

### 1.2 刷新令牌
- `POST /auth/refresh`

### 1.3 当前用户信息
- `GET /auth/profile`
- Header: `Authorization: Bearer <accessToken>`

---

## 2. 老人 Elderly

- `GET /elderly`：列表（支持分页）
- `GET /elderly/:id`：详情
- `POST /elderly`：创建
- `PUT /elderly/:id`：更新
- `DELETE /elderly/:id`：删除

---

## 3. 预警 Warnings

### 3.1 列表
- `GET /warnings`
- Query：
  - `page`, `limit`
  - `status`（`pending|processing|resolved`）
  - `riskLevel`（兼容中英文多值）
  - `elderlyName`
  - `startDate`, `endDate`

### 3.2 详情
- `GET /warnings/:id`

### 3.3 创建
- `POST /warnings`
- 角色：`admin|manager`

### 3.4 更新状态
- `PUT /warnings/:id`

```json
{
  "status": "processing",
  "handleNotes": "已电话联系",
  "followUpAt": "2026-04-18T10:00:00.000Z",
  "followUpResult": "待复查"
}
```

### 3.5 统计
- `GET /warnings/stats/overview`
- `GET /warnings/stats`

### 3.6 手动触发风险检查
- `POST /warnings/check/manual`
- 角色：`admin|manager`

---

## 4. 健康 Health

### 4.1 健康数据接入
- `POST /health/health-data`
- `POST /health/health-data/batch`

### 4.2 健康历史与趋势
- `GET /health/health-data/:elderlyId`
- `GET /health/health-data/:elderlyId/trend`

### 4.3 主动感知设备接入
- `POST /health/proactive/sensor`

```json
{
  "elderlyId": 1,
  "sensorType": "door_contact",
  "value": 12,
  "value2": 0,
  "textValue": "",
  "observedAt": "2026-04-18T10:00:00.000Z",
  "meta": { "source": "simulator" }
}
```

`sensorType`：`door_contact | water_meter | mattress | activity | service_gap`

### 4.4 其他健康能力（同一路由组）
包含活动轨迹、情绪分析、认知测试、用药依从性、风险预测、报告生成等接口，统一在 `/health/*` 下。

---

## 5. 风险分析 Risk Analysis

### 5.1 单老人风险报告
- `GET /risk-analysis/:elderlyId?days=7`

说明：`days` 取值范围 `1~90`，默认 `7`。

---

## 6. Agent VNext（运行台）

### 6.1 创建任务
- `POST /agent-vnext/tasks`

```json
{
  "elderlyId": 1,
  "eventSummary": "血压危急，需立即干预",
  "strategyMode": "balanced",
  "riskLevel": "high",
  "module": "医护",
  "autoExecute": true,
  "modelPreference": "auto",
  "sourceQuery": "",
  "sourceAnswer": "",
  "sourceSuggestedAction": [],
  "riskAnalysis": {}
}
```

字段说明：
- `strategyMode`: `conservative|balanced|aggressive`
- `riskLevel`: `low|medium|high`
- `module`: `护理|医护|后勤|收费|接待`
- `modelPreference`: `auto|qwen|deepseek|rule`

### 6.2 获取任务快照
- `GET /agent-vnext/tasks/:taskId`

### 6.3 SSE 事件流
- `GET /agent-vnext/tasks/:taskId/events?token=<accessToken>`
- Content-Type：`text/event-stream`
- 典型事件：
  - `TASK_CREATED`
  - `TASK_PLANNING`
  - `TASK_PLANNED`
  - `TASK_PENDING_APPROVAL`
  - `TASK_EXECUTING`
  - `TASK_TRACKING`
  - `TASK_DONE`
  - `TASK_FAILED`
  - `TASK_REJECTED`

### 6.4 审批执行
- `POST /agent-vnext/tasks/:taskId/approve`
- 角色：`admin|manager`

### 6.5 驳回任务
- `POST /agent-vnext/tasks/:taskId/reject`
- 角色：`admin|manager`

### 6.6 上下文快照
- `GET /agent-vnext/context/:elderlyId`

### 6.7 仅规划
- `POST /agent-vnext/plan`

### 6.8 工具执行
- `POST /agent-vnext/tools/execute`
- 角色：`admin|manager`

### 6.9 自主决策
- `POST /agent-vnext/autonomous`
- 角色：`admin|manager`

### 6.10 结果追踪
- `POST /agent-vnext/outcome`

### 6.11 周策略更新
- `POST /agent-vnext/policy/weekly-update`
- 角色：`admin`

---

## 7. 统计与系统

- `GET /statistics/overview`
- `GET /statistics/elderly`
- `GET /statistics/services`
- `GET /system/*`（系统状态与辅助接口）

---

## 8. 前端对接建议

1. 统一走 `axiosInstance`（鉴权、错误处理、401 跳转）；
2. SSE 断连后建议重连并保留轮询兜底；
3. 对 `traceId` 做日志透传，便于联调排障；
4. Agent 相关请求需处理超时与限流提示。

---

## 9. 版本建议

- 当前为 V1（无显式 URI version）；
- 后续可通过 `/api/v2` 逐步演进；
- 建议对高价值接口补充 schema 校验（zod/joi）与示例响应。
