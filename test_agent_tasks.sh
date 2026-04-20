#!/bin/bash
echo "=== 测试 Agent-vNext Tasks API ==="
curl -s -X POST http://localhost:8000/api/agent-vnext/tasks \
  -H "Content-Type: application/json" \
  -d '{"elderlyId": 1, "eventSummary": "血压危急需立即干预", "strategyMode": "balanced", "riskLevel": "high", "module": "护理"}'