import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from aliyun_bailian_client import AliyunBailianClient
from agents.nlp_agent import NLPAgent

def test_aliyun_bailian_client():
    """测试阿里云百炼客户端"""
    print("=" * 50)
    print("测试阿里云百炼客户端")
    print("=" * 50)
    
    client = AliyunBailianClient()
    
    if not client.enabled:
        print("阿里云百炼客户端未启用，请检查API密钥配置")
        return False
    
    print(f"客户端状态: {'已启用' if client.enabled else '未启用'}")
    print(f"模型: {client.model}")
    print(f"API URL: {client.api_url}")
    
    # 测试简单的对话
    print("\n测试简单对话...")
    messages = [
        {"role": "user", "content": "你好，请介绍一下社区养老系统"}
    ]
    
    response = client.chat_completion(messages)
    if response:
        print("[OK] 对话测试成功")
        print(f"响应: {response['choices'][0]['message']['content'][:100]}...")
    else:
        print("[FAIL] 对话测试失败")
        return False
    
    return True

def test_intent_recognition():
    """测试意图识别"""
    print("\n" + "=" * 50)
    print("测试意图识别")
    print("=" * 50)
    
    agent = NLPAgent()
    
    test_queries = [
        "查询张三老人的基本信息",
        "查看老人的健康状况",
        "统计一下老人的风险等级分布",
        "查询最近的服务记录"
    ]
    
    for query in test_queries:
        print(f"\n测试查询: {query}")
        result = agent.understand_intent(query)
        
        if result:
            print("[OK] 意图识别成功")
            print(f"  意图: {result.get('intent')}")
            print(f"  置信度: {result.get('confidence')}")
            print(f"  实体: {result.get('entities')}")
        else:
            print("[FAIL] 意图识别失败")
    
    return True

def test_response_generation():
    """测试响应生成"""
    print("\n" + "=" * 50)
    print("测试响应生成")
    print("=" * 50)
    
    agent = NLPAgent()
    
    test_questions = [
        "老人血压高怎么办？",
        "如何预防老人跌倒？",
        "社区养老有哪些服务？"
    ]
    
    for question in test_questions:
        print(f"\n测试问题: {question}")
        response = agent.generate_response(question)
        
        if response:
            print("[OK] 响应生成成功")
            print(f"  响应: {response[:100]}...")
        else:
            print("[FAIL] 响应生成失败")
    
    return True

def test_health_risk_analysis():
    """测试健康风险分析"""
    print("\n" + "=" * 50)
    print("测试健康风险分析")
    print("=" * 50)
    
    agent = NLPAgent()
    
    test_health_data = {
        "name": "张三",
        "age": 75,
        "blood_pressure": "150/95",
        "blood_sugar": "8.5",
        "heart_rate": "85"
    }
    
    print(f"测试健康数据: {test_health_data}")
    result = agent.analyze_health_risk(test_health_data)
    
    if result:
        print("[OK] 健康风险分析成功")
        print(f"  血压风险: {result.get('blood_pressure_risk')}")
        print(f"  血糖风险: {result.get('blood_sugar_risk')}")
        print(f"  心率风险: {result.get('heart_rate_risk')}")
        print(f"  综合风险: {result.get('overall_risk')}")
        print(f"  建议: {result.get('recommendations')}")
    else:
        print("[FAIL] 健康风险分析失败")
        return False
    
    return True

if __name__ == "__main__":
    print("开始测试阿里云百炼API集成...")
    
    try:
        # 测试客户端
        client_test = test_aliyun_bailian_client()
        
        if client_test:
            # 测试意图识别
            intent_test = test_intent_recognition()
            
            # 测试响应生成
            response_test = test_response_generation()
            
            # 测试健康风险分析
            health_test = test_health_risk_analysis()
            
            print("\n" + "=" * 50)
            print("测试总结")
            print("=" * 50)
            print(f"客户端测试: {'通过' if client_test else '失败'}")
            print(f"意图识别测试: {'通过' if intent_test else '失败'}")
            print(f"响应生成测试: {'通过' if response_test else '失败'}")
            print(f"健康风险分析测试: {'通过' if health_test else '失败'}")
            
            if all([client_test, intent_test, response_test, health_test]):
                print("\n[SUCCESS] 所有测试通过！阿里云百炼API集成成功。")
            else:
                print("\n[FAIL] 部分测试失败，请检查配置和API密钥。")
        else:
            print("\n[FAIL] 客户端测试失败，无法继续其他测试。")
            
    except Exception as e:
        print(f"\n[ERROR] 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()