#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzY0OTkwNjcsImV4cCI6MTc3NjU4NTQ2N30.POqZznB_vNIaUkGjKPLjYB5KCHwLgcRHRZEh1Z_h7VQ"

echo "=== 测试 AI Copilot ==="
curl -s -X POST http://localhost:8000/api/ai-agent/copilot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"老人血压偏高应该注意什么？","context":{}}'

echo ""
echo ""
echo "=== 测试 AI Triage ==="
curl -s -X POST http://localhost:8000/api/ai-agent/triage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"elderlyName":"张三","age":75,"metrics":{"blood_pressure":"145/95","heart_rate":78}}'