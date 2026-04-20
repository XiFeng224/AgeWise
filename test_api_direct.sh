#!/bin/bash

# 测试 DeepSeek API
echo "=== 测试 DeepSeek API ==="

DEEPSEEK_API_KEY="sk-f567076fed1047a786a2d54ce332fdd3"

response=$(curl -s -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"你好"}],"temperature":0.7,"max_tokens":100}')

echo "DeepSeek 响应: $response"
echo ""

# 测试 Qwen API
echo "=== 测试 Qwen API ==="

QWEN_API_KEY="sk-3a5537d432d745dbb8f40a6c6270f357"

response=$(curl -s -X POST "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $QWEN_API_KEY" \
  -d '{"model":"qwen-plus","messages":[{"role":"user","content":"你好"}],"temperature":0.7,"max_tokens":100}')

echo "Qwen 响应: $response"
echo ""

echo "=== 测试完成 ==="