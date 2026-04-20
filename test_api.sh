#!/bin/bash

echo "=== 1. 测试登录接口 ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "提取的Token: $TOKEN"

# 保存token
echo "$TOKEN" > /tmp/token.txt

echo ""
echo "=== 2. 测试 Agent-vNext Tasks ==="
cat > /tmp/task.json << EOF
{
  "eventId": "test-123",
  "eventType": "elderly_monitoring",
  "eventSummary": "血压异常",
  "elderlyId": 1,
  "patientInfo": {
    "id": "1",
    "name": "张三",
    "age": 75,
    "gender": "男",
    "bloodType": "A型",
    "allergies": ["青霉素"],
    "chronicDiseases": ["高血压", "糖尿病"],
    "medications": ["降压药", "降糖药"],
    "emergencyContact": {
      "name": "李四",
      "relationship": "子女",
      "phone": "13800138000"
    }
  },
  "eventData": {
    "timestamp": "2024-01-15T10:30:00Z",
    "location": "家中",
    "deviceId": "sensor-001",
    "vitalSigns": {
      "bloodPressure": {
        "systolic": 180,
        "diastolic": 110
      },
      "heartRate": 95,
      "bloodOxygen": 92,
      "bodyTemperature": 36.8
    },
    "symptoms": ["头痛", "头晕"],
    "activity": "休息中"
  },
  "riskLevel": "high",
  "priority": "high",
  "notificationSent": false
}
EOF

curl -s -X POST http://localhost:8000/api/agent-vnext/tasks \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d @/tmp/task.json