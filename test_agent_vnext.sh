#!/bin/bash

# 测试 agent-vnext/tasks 端点
echo "=== 测试 agent-vnext/tasks 端点 ==="

# 1. 获取登录token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败: $LOGIN_RESPONSE"
  exit 1
else
  echo "✅ 登录成功，获取到Token"
  echo "Token: $TOKEN"
fi

# 2. 测试 agent-vnext/tasks 端点 (POST)
echo "\n测试 POST /api/agent-vnext/tasks 端点..."
TASK_RESPONSE=$(curl -s -X POST http://localhost:8000/api/agent-vnext/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"elderlyId": 1, "eventSummary": "测试任务摘要", "strategyMode": "balanced", "riskLevel": "medium", "module": "护理"}')

echo "响应: $TASK_RESPONSE"

if echo $TASK_RESPONSE | grep -q "success":true; then
  echo "\n✅ POST /api/agent-vnext/tasks 测试成功"
  TASK_ID=$(echo $TASK_RESPONSE | grep -o '"taskId":"[^"]*"' | cut -d'"' -f4)
  echo "任务ID: $TASK_ID"
  
  # 3. 测试 GET /api/agent-vnext/tasks/:taskId 端点
  if [ ! -z "$TASK_ID" ]; then
    echo "\n测试 GET /api/agent-vnext/tasks/$TASK_ID 端点..."
    TASK_DETAIL_RESPONSE=$(curl -s -X GET http://localhost:8000/api/agent-vnext/tasks/$TASK_ID \
      -H "Authorization: Bearer $TOKEN")
    
    echo "响应: $TASK_DETAIL_RESPONSE"
    
    if echo $TASK_DETAIL_RESPONSE | grep -q "success":true; then
      echo "\n✅ GET /api/agent-vnext/tasks/:taskId 测试成功"
    else
      echo "\n❌ GET /api/agent-vnext/tasks/:taskId 测试失败"
    fi
  fi
else
  echo "\n❌ POST /api/agent-vnext/tasks 测试失败"
fi

echo "\n=== 测试完成 ==="