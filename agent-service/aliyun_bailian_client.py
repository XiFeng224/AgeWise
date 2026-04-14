import os
import json
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class AliyunBailianClient:
    """阿里云百炼API客户端"""
    
    def __init__(self):
        self.api_key = os.getenv("ALIYUN_BAILIAN_API_KEY")
        self.model = os.getenv("ALIYUN_BAILIAN_MODEL", "qwen-plus")
        self.max_tokens = int(os.getenv("ALIYUN_BAILIAN_MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("ALIYUN_BAILIAN_TEMPERATURE", "0.1"))
        self.api_url = os.getenv("ALIYUN_BAILIAN_API_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        
        if not self.api_key or self.api_key == "your-aliyun-bailian-api-key-here":
            print("警告：未配置阿里云百炼API密钥")
            self.enabled = False
        else:
            self.enabled = True
            print(f"阿里云百炼API客户端初始化成功，模型: {self.model}")
    
    def chat_completion(self, messages: list, **kwargs) -> Optional[Dict[str, Any]]:
        """调用聊天完成API"""
        if not self.enabled:
            print("阿里云百炼API未启用")
            return None
        
        try:
            url = f"{self.api_url}/chat/completions"
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": kwargs.get("model", self.model),
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "temperature": kwargs.get("temperature", self.temperature)
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"阿里云百炼API请求失败: {e}")
            return None
        except Exception as e:
            print(f"阿里云百炼API调用异常: {e}")
            return None
    
    def understand_intent(self, query: str, context: str = "") -> Optional[Dict[str, Any]]:
        """理解用户查询意图"""
        if not self.enabled:
            return None
        
        system_prompt = """你是一个社区养老数据查询助手。请分析用户的查询意图，并返回JSON格式的结果。

可能的意图类型：
- query_elderly_info: 查询老人基本信息
- query_health_status: 查询健康状况
- query_service_records: 查询服务记录
- query_warnings: 查询预警信息
- statistical_analysis: 统计分析

请识别查询中的实体：姓名、年龄、风险等级、健康状况、时间范围等。

返回格式：
{
  "intent": "意图类型",
  "confidence": 0.9,
  "entities": {
    "name": "姓名",
    "age": 80,
    "risk_level": "高风险",
    "health_status": "良好"
  },
  "sql_hint": "SELECT * FROM elderly WHERE ..."
}"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"查询: {query}\n上下文: {context}"}
        ]
        
        try:
            response = self.chat_completion(messages)
            if response and "choices" in response:
                content = response["choices"][0]["message"]["content"]
                
                # 尝试解析JSON
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError:
                    print(f"无法解析大模型返回的JSON: {content}")
                    return None
            
            return None
            
        except Exception as e:
            print(f"意图识别失败: {e}")
            return None
    
    def generate_response(self, query: str, context: str = "", system_prompt: str = "") -> Optional[str]:
        """生成自然语言响应"""
        if not self.enabled:
            return None
        
        if not system_prompt:
            system_prompt = """你是一个社区养老智能助手，负责回答老人和家属关于养老服务的相关问题。
请用简洁、友好的语言回答，提供实用的建议和指导。"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"问题: {query}\n上下文: {context}"}
        ]
        
        try:
            response = self.chat_completion(messages)
            if response and "choices" in response:
                return response["choices"][0]["message"]["content"]
            
            return None
            
        except Exception as e:
            print(f"生成响应失败: {e}")
            return None
    
    def analyze_health_risk(self, health_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """分析健康风险"""
        if not self.enabled:
            return None
        
        system_prompt = """你是一个健康风险评估专家。请根据提供的健康数据分析老人的健康风险。

分析维度：
1. 血压风险：收缩压/舒张压是否在正常范围
2. 血糖风险：空腹血糖是否在正常范围
3. 心率风险：心率是否在正常范围
4. 综合评估：基于以上指标给出综合风险等级

返回格式：
{
  "blood_pressure_risk": "正常/偏高/偏高/很高",
  "blood_sugar_risk": "正常/偏高/偏高/很高",
  "heart_rate_risk": "正常/偏高/偏高/很高",
  "overall_risk": "低风险/中风险/高风险",
  "recommendations": ["建议1", "建议2"]
}"""
        
        user_content = f"""健康数据：
姓名: {health_data.get('name', '未知')}
年龄: {health_data.get('age', '未知')}
血压: {health_data.get('blood_pressure', '未知')}
血糖: {health_data.get('blood_sugar', '未知')}
心率: {health_data.get('heart_rate', '未知')}
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        try:
            response = self.chat_completion(messages)
            if response and "choices" in response:
                content = response["choices"][0]["message"]["content"]
                
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError:
                    print(f"无法解析健康风险分析结果: {content}")
                    return None
            
            return None
            
        except Exception as e:
            print(f"健康风险分析失败: {e}")
            return None