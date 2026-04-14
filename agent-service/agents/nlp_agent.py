import os
import re
from typing import Dict, List, Any
import openai
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from aliyun_bailian_client import AliyunBailianClient

load_dotenv()

class NLPAgent:
    def __init__(self):
        # 初始化阿里云百炼客户端
        self.aliyun_client = AliyunBailianClient()
        
        # 初始化OpenAI客户端（作为阿里云百炼不可用时的兜底）
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key != "your-openai-api-key-here":
            try:
                self.client = openai.OpenAI(api_key=api_key)
            except TypeError:
                # 兼容旧版本OpenAI库
                self.client = openai.Client(api_key=api_key)
        else:
            self.client = None
            if not self.aliyun_client.enabled:
                print("警告：未配置可用的大模型API密钥（阿里云/ OpenAI），将使用规则模式")
            else:
                print("提示：未配置OpenAI API密钥，当前使用阿里云百炼API")
        
        # 定义意图识别模板
        self.intent_templates = {
            "query_elderly_info": [
                "查询老人", "查找老人", "老人信息", "基本信息"
            ],
            "query_health_status": [
                "健康状况", "健康情况", "血压", "血糖", "健康指标"
            ],
            "query_service_records": [
                "服务记录", "上门服务", "服务历史", "服务情况"
            ],
            "query_warnings": [
                "预警信息", "风险预警", "异常情况", "预警记录"
            ],
            "statistical_analysis": [
                "统计", "分析", "分布", "比例", "趋势"
            ]
        }
        
        # 实体识别模式
        self.entity_patterns = {
            "age": r"(\d+)岁",
            "risk_level": r"(低风险|中风险|高风险)",
            "health_status": r"(优秀|良好|一般|较差)",
            "gender": r"(男|女)",
            "time_period": r"(今天|昨天|本周|本月|今年|最近(\d+)(天|月|年))"
        }

    def understand_intent(self, query: str, context: str = "") -> Dict[str, Any]:
        """理解用户意图"""
        
        # 优先使用阿里云百炼API
        if self.aliyun_client.enabled:
            print("使用阿里云百炼API进行意图识别")
            aliyun_result = self.aliyun_client.understand_intent(query, context)
            if aliyun_result:
                return aliyun_result
        
        # 如果阿里云百炼API未启用或调用失败，使用OpenAI
        if self.client is not None:
            print("使用OpenAI API进行意图识别")
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system",
                            "content": """你是一个社区养老数据查询助手。请分析用户的查询意图，并返回JSON格式的结果。
                            
                            可能的意图类型：
                            - query_elderly_info: 查询老人基本信息
                            - query_health_status: 查询健康状况
                            - query_service_records: 查询服务记录
                            - query_warnings: 查询预警信息
                            - statistical_analysis: 统计分析
                            
                            请识别查询中的实体：姓名、年龄、风险等级、健康状况、时间范围等。
                            """
                        },
                        {
                            "role": "user", 
                            "content": f"查询: {query}\n上下文: {context}"
                        }
                    ],
                    temperature=0.1,
                    max_tokens=500
                )
                
                result = response.choices[0].message.content
                
                # 解析大模型返回的结果
                intent_result = self._parse_intent_result(result)
                
                # 补充基于规则的识别
                rule_based_intent = self._rule_based_intent_recognition(query)
                
                # 合并结果
                final_intent = self._merge_intents(intent_result, rule_based_intent)
                
                return final_intent
                
            except Exception as e:
                # 如果大模型调用失败，使用基于规则的识别
                print(f"OpenAI意图识别失败: {e}")
        
        # 如果所有大模型都失败，使用基于规则的识别
        print("使用基于规则的意图识别")
        return self._rule_based_intent_recognition(query)

    def _parse_intent_result(self, result: str) -> Dict[str, Any]:
        """解析大模型返回的意图识别结果"""
        # 这里简化处理，实际应该解析JSON格式的返回
        try:
            # 尝试解析JSON
            import json
            return json.loads(result)
        except:
            # 如果解析失败，使用基于规则的解析
            return {
                "intent": "query_elderly_info",
                "confidence": 0.8,
                "entities": {},
                "sql_hint": "SELECT * FROM elderly WHERE 1=1"
            }

    def _rule_based_intent_recognition(self, query: str) -> Dict[str, Any]:
        """基于规则的意图识别"""
        query_lower = query.lower()
        
        # 识别主要意图
        intent = "query_elderly_info"
        confidence = 0.7
        
        for intent_type, keywords in self.intent_templates.items():
            for keyword in keywords:
                if keyword in query_lower:
                    intent = intent_type
                    confidence = 0.9
                    break
        
        # 实体识别
        entities = self._extract_entities(query)
        
        # 生成SQL提示
        sql_hint = self._generate_sql_hint(intent, entities)
        
        return {
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "sql_hint": sql_hint
        }

    def _extract_entities(self, query: str) -> Dict[str, Any]:
        """从查询中提取实体"""
        entities = {}
        
        # 提取年龄
        age_match = re.search(self.entity_patterns["age"], query)
        if age_match:
            entities["age"] = int(age_match.group(1))
        
        # 提取风险等级
        risk_match = re.search(self.entity_patterns["risk_level"], query)
        if risk_match:
            entities["risk_level"] = risk_match.group(1)
        
        # 提取健康状况
        health_match = re.search(self.entity_patterns["health_status"], query)
        if health_match:
            entities["health_status"] = health_match.group(1)
        
        # 提取性别
        gender_match = re.search(self.entity_patterns["gender"], query)
        if gender_match:
            entities["gender"] = "male" if gender_match.group(1) == "男" else "female"
        
        # 提取时间范围
        time_match = re.search(self.entity_patterns["time_period"], query)
        if time_match:
            entities["time_period"] = time_match.group(1)
        
        # 提取姓名（简单规则：查询中不包含特定关键词的2-4个中文字符）
        chinese_chars = re.findall(r'[\u4e00-\u9fa5]{2,4}', query)
        for char in chinese_chars:
            # 排除常见关键词
            if char not in ["查询", "查找", "老人", "信息", "健康", "状况"]:
                entities["name"] = char
                break
        
        return entities

    def _generate_sql_hint(self, intent: str, entities: Dict[str, Any]) -> str:
        """根据意图和实体生成SQL提示"""
        base_query = ""
        
        if intent == "query_elderly_info":
            base_query = "SELECT * FROM elderly"
        elif intent == "query_health_status":
            base_query = "SELECT name, age, health_status, risk_level FROM elderly"
        elif intent == "query_service_records":
            base_query = "SELECT * FROM service_records"
        elif intent == "query_warnings":
            base_query = "SELECT * FROM warnings"
        elif intent == "statistical_analysis":
            base_query = "SELECT risk_level, COUNT(*) as count FROM elderly GROUP BY risk_level"
        
        # 添加实体条件
        conditions = []
        if "name" in entities:
            conditions.append(f"name LIKE '%{entities['name']}%'")
        if "age" in entities:
            conditions.append(f"age = {entities['age']}")
        if "risk_level" in entities:
            conditions.append(f"risk_level = '{entities['risk_level']}'")
        if "health_status" in entities:
            conditions.append(f"health_status = '{entities['health_status']}'")
        if "gender" in entities:
            conditions.append(f"gender = '{entities['gender']}'")
        
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        return base_query

    def _merge_intents(self, model_intent: Dict, rule_intent: Dict) -> Dict[str, Any]:
        """合并大模型和规则识别的结果"""
        # 优先使用大模型的结果，如果置信度较低则使用规则结果
        if model_intent.get("confidence", 0) > rule_intent.get("confidence", 0):
            return model_intent
        else:
            return rule_intent
    
    def generate_response(self, query: str, context: str = "", system_prompt: str = "") -> str:
        """生成自然语言响应"""
        # 优先使用阿里云百炼API
        if self.aliyun_client.enabled:
            print("使用阿里云百炼API生成响应")
            aliyun_response = self.aliyun_client.generate_response(query, context, system_prompt)
            if aliyun_response:
                return aliyun_response
        
        # 如果阿里云百炼API未启用或调用失败，使用OpenAI
        if self.client is not None:
            print("使用OpenAI API生成响应")
            try:
                if not system_prompt:
                    system_prompt = """你是一个社区养老智能助手，负责回答老人和家属关于养老服务的相关问题。
请用简洁、友好的语言回答，提供实用的建议和指导。"""
                
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"问题: {query}\n上下文: {context}"}
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                print(f"OpenAI生成响应失败: {e}")
        
        # 如果所有大模型都失败，返回默认响应
        return "抱歉，我暂时无法回答您的问题，请稍后再试。"
    
    def analyze_health_risk(self, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """分析健康风险"""
        # 优先使用阿里云百炼API
        if self.aliyun_client.enabled:
            print("使用阿里云百炼API分析健康风险")
            aliyun_result = self.aliyun_client.analyze_health_risk(health_data)
            if aliyun_result:
                return aliyun_result
        
        # 如果阿里云百炼API未启用或调用失败，使用简单的规则分析
        print("使用规则分析健康风险")
        return self._rule_based_health_risk_analysis(health_data)
    
    def _rule_based_health_risk_analysis(self, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """基于规则的健康风险分析"""
        blood_pressure = health_data.get('blood_pressure', '120/80')
        blood_sugar = health_data.get('blood_sugar', '5.0')
        heart_rate = health_data.get('heart_rate', '75')
        
        # 简单的风险评估规则
        bp_risk = "正常"
        if '/' in blood_pressure:
            systolic, diastolic = map(int, blood_pressure.split('/'))
            if systolic > 140 or diastolic > 90:
                bp_risk = "偏高"
            elif systolic > 160 or diastolic > 100:
                bp_risk = "很高"
        
        bs_risk = "正常"
        try:
            bs_value = float(blood_sugar)
            if bs_value > 7.0:
                bs_risk = "偏高"
            elif bs_value > 11.1:
                bs_risk = "很高"
        except:
            pass
        
        hr_risk = "正常"
        try:
            hr_value = int(heart_rate)
            if hr_value > 100 or hr_value < 60:
                hr_risk = "偏高"
        except:
            pass
        
        # 综合风险评估
        risk_count = sum([1 for risk in [bp_risk, bs_risk, hr_risk] if risk != "正常"])
        if risk_count >= 2:
            overall_risk = "高风险"
        elif risk_count == 1:
            overall_risk = "中风险"
        else:
            overall_risk = "低风险"
        
        recommendations = []
        if bp_risk != "正常":
            recommendations.append("建议定期监测血压，保持低盐饮食")
        if bs_risk != "正常":
            recommendations.append("建议控制糖分摄入，定期检查血糖")
        if hr_risk != "正常":
            recommendations.append("建议适当运动，保持规律作息")
        
        return {
            "blood_pressure_risk": bp_risk,
            "blood_sugar_risk": bs_risk,
            "heart_rate_risk": hr_risk,
            "overall_risk": overall_risk,
            "recommendations": recommendations if recommendations else ["继续保持健康的生活方式"]
        }