#!/bin/bash

echo "=== 开始系统综合测试 ==="
echo ""

# 1. 测试登录功能
echo "1. 测试登录功能"
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
echo ""

# 2. 测试 AI Copilot 功能
echo "2. 测试 AI Copilot 功能"
COPILOT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ai-agent/copilot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"老人血压偏高应该注意什么？","context":{}}')

if echo $COPILOT_RESPONSE | grep -q "success":true; then
  echo "✅ AI Copilot 测试成功"
  echo "AI 回复: $(echo $COPILOT_RESPONSE | grep -o '"answer":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ AI Copilot 测试失败: $COPILOT_RESPONSE"
fi
echo ""

# 3. 测试 AI Triage 功能
echo "3. 测试 AI Triage 功能"
TRIAGE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ai-agent/triage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"elderlyName":"张三","age":75,"metrics":{"blood_pressure":"145/95","heart_rate":78}}')

if echo $TRIAGE_RESPONSE | grep -q "success":true; then
  echo "✅ AI Triage 测试成功"
  echo "风险等级: $(echo $TRIAGE_RESPONSE | grep -o '"riskLevel":"[^"]*"' | cut -d'"' -f4)"
  echo "建议: $(echo $TRIAGE_RESPONSE | grep -o '"actions":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ AI Triage 测试失败: $TRIAGE_RESPONSE"
fi
echo ""

# 4. 测试 AI Dispatch 功能
echo "4. 测试 AI Dispatch 功能"
DISPATCH_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ai-agent/dispatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"riskLevel":"medium","module":"护理","shift":"白班","eventSummary":"老人血压偏高"}')

if echo $DISPATCH_RESPONSE | grep -q "success":true; then
  echo "✅ AI Dispatch 测试成功"
  echo "派单角色: $(echo $DISPATCH_RESPONSE | grep -o '"assigneeRole":"[^"]*"' | cut -d'"' -f4)"
  echo "优先级: $(echo $DISPATCH_RESPONSE | grep -o '"priority":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ AI Dispatch 测试失败: $DISPATCH_RESPONSE"
fi
echo ""

# 5. 测试基础 API 功能 (用户信息)
echo "5. 测试基础 API 功能 (用户信息)"
USER_RESPONSE=$(curl -s -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN")

if echo $USER_RESPONSE | grep -q "success":true; then
  echo "✅ 基础 API 测试成功"
  echo "用户名: $(echo $USER_RESPONSE | grep -o '"username":"[^"]*"' | cut -d'"' -f4)"
  echo "角色: $(echo $USER_RESPONSE | grep -o '"role":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ 基础 API 测试失败: $USER_RESPONSE"
fi
echo ""

# 6. 测试数据库连接 (健康检查)
echo "6. 测试数据库连接 (健康检查)"
HEALTH_RESPONSE=$(curl -s -X GET http://localhost:8000/health)

if echo $HEALTH_RESPONSE | grep -q "status":"OK"; then
  echo "✅ 数据库连接测试成功"
  echo "状态: $(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
  echo "环境: $(echo $HEALTH_RESPONSE | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ 数据库连接测试失败: $HEALTH_RESPONSE"
fi
echo ""

# 7. 测试老人列表 API
echo "7. 测试老人列表 API"
ELDERLY_RESPONSE=$(curl -s -X GET http://localhost:8000/api/elderly \
  -H "Authorization: Bearer $TOKEN")

if echo $ELDERLY_RESPONSE | grep -q "success":true; then
  echo "✅ 老人列表 API 测试成功"
  ELDERLY_COUNT=$(echo $ELDERLY_RESPONSE | grep -o '"data":\[\{[^}]*\}\]' | grep -o '\{[^}]*\}' | wc -l)
  echo "老人数量: $ELDERLY_COUNT"
else
  echo "❌ 老人列表 API 测试失败: $ELDERLY_RESPONSE"
fi
echo ""

echo "=== 测试完成 ==="