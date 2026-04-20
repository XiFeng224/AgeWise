#!/bin/bash
echo "=== 1. 登录获取token ==="
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "登录失败，尝试其他账号..."
  TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"manager1","password":"123456"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token: $TOKEN"
fi

echo ""
echo "=== 2. 测试AI Agent对话 ==="
curl -s -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"你好，请介绍一下你自己","stream":false}' | head -500