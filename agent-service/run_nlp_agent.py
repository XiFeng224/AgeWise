#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行NLP Agent的脚本
用于接收查询并返回意图分析结果
"""

import sys
import json
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.nlp_agent import NLPAgent

def main():
    """主函数"""
    try:
        # 获取命令行参数
        if len(sys.argv) < 2:
            print(json.dumps({"error": "缺少查询参数"}))
            return
        
        query = sys.argv[1]
        
        # 初始化NLP Agent
        nlp_agent = NLPAgent()
        
        # 分析查询意图
        result = nlp_agent.understand_intent(query)
        
        # 输出结果
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        # 处理异常
        print(json.dumps({"error": str(e)}))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()