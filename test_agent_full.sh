#!/bin/bash
echo "=== 1. 登录获取Token ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "登录响应: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

echo "=== 2. 测试 Agent-vNext Tasks API ==="
TASK_RESPONSE=$(curl -s -X POST http://localhost:8000/api/agent-vnext/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"elderlyId": 1, "eventSummary": "血压危急需立即干预", "strategyMode": "balanced", "riskLevel": "high", "module": "护理"}')

echo "任务响应: $TASK_RESPONSE"