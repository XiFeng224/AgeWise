# 银龄智护 Agent 平台 API 契约（V1）

> 基础前缀：`/api`
> 
> 统一响应约定：
> - 成功：`{ success: true, data, message?, traceId? }`
> - 失败：`{ success: false, error, details?, traceId? }`

---

## 1. 认证 Auth

### 1.1 登录
- `POST /auth/login`
- Body:

```json
{
  "username": "admin",
  "password": "123456"
}
```

- Success `200`:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 1.2 刷新令牌
- `POST /auth/refresh`
- Body:

```json
{
  "refreshToken": "..."
}
```

### 1.3 获取当前用户
- `GET /auth/profile`
- Header: `Authorization: Bearer <token>`

---

## 2. 老人 Elderly

### 2.1 获取老人列表
- `GET /elderly?page=1&limit=200`

### 2.2 获取老人详情
- `GET /elderly/:id`

### 2.3 创建老人
- `POST /elderly`

### 2.4 更新老人
- `PUT /elderly/:id`

### 2.5 删除老人
- `DELETE /elderly/:id`

---

## 3. 预警 Warning（主动预警 Agent）

### 3.1 预警列表
- `GET /warnings`
- Query:
  - `page`, `limit`
  - `status`: `pending|processing|resolved`
  - `riskLevel`: `low|medium|high`
  - `startDate`, `endDate`

### 3.2 预警详情
- `GET /warnings/:id`

### 3.3 更新预警状态
- `PUT /warnings/:id`
- Body:

```json
{
  "status": "processing",
  "handleNotes": "已电话联系",
  "followUpAt": "2026-04-18T10:00:00.000Z",
  "followUpResult": "待复查"
}
```

### 3.4 预警统计
- `GET /warnings/stats/overview`
- `GET /warnings/stats`

---

## 4. 健康 Health

### 4.1 设备健康数据接入
- `POST /health/health-data`

### 4.2 健康历史
- `GET /health/health-data/:elderlyId?dataType=heart_rate&days=7`

### 4.3 健康趋势
- `GET /health/health-data/:elderlyId/trend?dataType=blood_pressure&days=30`

### 4.4 主动感知设备接入（门磁/水表/床垫/服务空窗）
- `POST /health/proactive/sensor`
- Body:

```json
{
  "elderlyId": 1,
  "sensorType": "door_contact",
  "value": 12,
  "value2": 0,
  "textValue": "",
  "observedAt": "2026-04-18T10:00:00.000Z",
  "meta": {
    "source": "simulator"
  }
}
```

- `sensorType` 枚举：
  - `door_contact`（门磁）
  - `water_meter`（用水）
  - `mattress`（床垫）
  - `activity`（活动异常）
  - `service_gap`（服务空窗）

---

## 5. 风险分析 Risk Analysis（风险分析 Agent）

### 5.1 获取单老人风险分析报告
- `GET /risk-analysis/:elderlyId?days=7`

- Success `200` 示例：

```json
{
  "success": true,
  "data": {
    "elderly": {
      "id": 1,
      "name": "张爷爷",
      "age": 78,
      "riskLevel": "medium",
      "healthStatus": "fair",
      "isAlone": true
    },
    "summary": {
      "riskScore": 76,
      "riskLevel": "high",
      "trend": "worsening",
      "confidence": 84
    },
    "analysis": {
      "healthAbnormalities": [],
      "activityAbnormalities": [],
      "warningSignals": [],
      "serviceGaps": [],
      "emotionalSignals": [],
      "cognitiveSignals": []
    },
    "recommendations": [
      {
        "priority": "high",
        "timeWindow": "10分钟",
        "owner": "网格员",
        "action": "电话确认老人状态",
        "reason": "先确认是否存在急性异常"
      }
    ],
    "dataSnapshot": {
      "healthPoints": 20,
      "activityPoints": 12,
      "warningCount": 3,
      "recentNotificationCount": 4,
      "serviceRequestCount": 1
    }
  }
}
```

---

## 6. Agent VNext（运行台）

### 6.1 创建任务
- `POST /agent-vnext/tasks`
- Body（核心字段）：

```json
{
  "elderlyId": 1,
  "eventSummary": "血压危急，需立即干预",
  "strategyMode": "balanced",
  "riskLevel": "high",
  "module": "医护",
  "modelPreference": "auto",
  "sourceQuery": "",
  "sourceAnswer": "",
  "sourceSuggestedAction": [],
  "riskAnalysis": {}
}
```

### 6.2 获取任务快照
- `GET /agent-vnext/tasks/:taskId`

### 6.3 SSE 事件流
- `GET /agent-vnext/tasks/:taskId/events?token=<accessToken>`
- 返回：`text/event-stream`
- 典型事件：
  - `TASK_CREATED`
  - `TASK_PLANNING`
  - `TASK_PLANNED`
  - `TASK_EXECUTING`
  - `TASK_TRACKING`
  - `TASK_DONE`
  - `TASK_FAILED`
  - `TASK_REJECTED`

### 6.4 审批执行
- `POST /agent-vnext/tasks/:taskId/approve`

### 6.5 驳回任务
- `POST /agent-vnext/tasks/:taskId/reject`

### 6.6 周策略更新
- `POST /agent-vnext/policy/weekly-update`

### 6.7 仅规划（不落地任务）
- `POST /agent-vnext/plan`
- 额外字段约定：
  - `modelPreference`: `auto|qwen|deepseek|rule`
  - `sourceQuery`: `string`
  - `sourceAnswer`: `string`
  - `sourceSuggestedAction`: `string[]`（最多20条，非字符串会被过滤）
  - `riskAnalysis`: `object|null`

### 6.8 自主决策执行
- `POST /agent-vnext/autonomous`
- 额外字段约定：
  - `autoExecute`: `boolean`（默认 `true`）
  - `modelPreference`: `auto|qwen|deepseek|rule`
  - `sourceQuery`: `string`
  - `sourceAnswer`: `string`
  - `sourceSuggestedAction`: `string[]`（最多20条，非字符串会被过滤）
  - `riskAnalysis`: `object|null`

---

## 7. 错误码建议（统一）

- `400` 参数错误/校验失败
- `401` 未登录或 token 失效
- `403` 权限不足
- `404` 资源不存在
- `409` 状态冲突（如不可审批状态）
- `422` 业务规则不满足
- `500` 服务器内部错误
- `504` 上游/处理超时

---

## 8. 前端对接建议

1. 所有请求通过 `axiosInstance`（统一鉴权与错误处理）
2. SSE 失败保留轮询兜底（已实现）
3. 对 `401` 做统一跳转登录
4. 对网络断连/超时做明确提示，不与业务错误混淆

---

## 9. 版本化建议

- 当前版本：`V1`（无显式 URI version）
- 后续建议：
  - 新增 `/api/v2` 逐步迁移
  - 关键契约字段保持向后兼容
  - 为风险分析与Agent任务新增 schema 校验（zod/joi）
