import re
import json
from typing import Dict, List, Any, Tuple
import openai
from dotenv import load_dotenv
import os

load_dotenv()

class EnhancedNLPAgent:
    """增强版自然语言理解Agent，支持多轮对话和上下文记忆"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.conversation_context = {}
        
        # 养老领域专业词汇
        self.elderly_domain_terms = {
            "老人": ["老人", "老年人", "长者", "老人家"],
            "健康": ["健康", "身体状况", "健康状况", "体检"],
            "服务": ["服务", "上门", "关怀", "照顾"],
            "预警": ["预警", "风险", "异常", "提醒"],
            "统计": ["统计", "分析", "分布", "比例", "趋势"]
        }
        
        # 复杂查询模式识别
        self.complex_patterns = {
            "age_range": r"(\d+)[-到至](\d+)岁",
            "time_period": r"(今天|昨天|本周|本月|今年|最近(\d+)(天|月|年))",
            "comparison": r"(超过|高于|低于|少于|多于)(\d+)",
            "multiple_conditions": r"(并且|而且|同时|还要)"
        }

    def understand_intent(self, query: str, user_id: str, context: str = "") -> Dict[str, Any]:
        """理解用户意图，支持多轮对话和上下文记忆"""
        
        # 获取对话上下文
        user_context = self.conversation_context.get(user_id, {
            "history": [],
            "current_intent": "",
            "entities": {}
        })
        
        # 构建上下文提示
        context_prompt = self._build_context_prompt(user_context, query)
        
        try:
            # 使用大模型进行深度意图识别
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """你是一个专业的社区养老数据查询助手。请分析用户的查询意图，并返回结构化的JSON结果。
                        
                        核心功能分类：
                        1. 基本信息查询：查询老人基本信息、联系方式、居住状况等
                        2. 健康数据查询：查询血压、血糖等健康指标
                        3. 服务记录查询：查询上门服务、健康检查等记录
                        4. 预警信息查询：查询风险预警、异常情况
                        5. 统计分析：统计老人分布、健康状况、服务趋势等
                        6. 复杂组合查询：多条件组合的复杂查询
                        
                        请识别以下关键信息：
                        - 查询主体（老人姓名、群体特征）
                        - 查询条件（年龄范围、健康状况、时间范围等）
                        - 查询类型（基本信息、健康数据、统计等）
                        - 排序和分组要求
                        
                        返回JSON格式：
                        {
                            "intent": "查询类型",
                            "confidence": 0.95,
                            "entities": {"key": "value"},
                            "sql_hint": "SQL查询提示",
                            "requires_followup": false,
                            "followup_question": ""
                        }
                        """
                    },
                    {
                        "role": "user", 
                        "content": f"当前对话上下文：{context_prompt}\n用户查询：{query}"
                    }
                ],
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            intent_result = json.loads(result_text)
            
            # 补充基于规则的实体识别
            rule_entities = self._rule_based_entity_extraction(query)
            intent_result["entities"].update(rule_entities)
            
            # 更新对话上下文
            self._update_conversation_context(user_id, query, intent_result)
            
            return intent_result
            
        except Exception as e:
            print(f"大模型意图识别失败: {e}")
            # 降级到规则识别
            return self._fallback_intent_recognition(query, user_id)

    def _build_context_prompt(self, context: Dict[str, Any], current_query: str) -> str:
        """构建对话上下文提示"""
        if not context["history"]:
            return "这是对话的开始"
        
        # 取最近3轮对话作为上下文
        recent_history = context["history"][-3:]
        context_prompt = "之前的对话：\n"
        
        for i, (q, a) in enumerate(recent_history):
            context_prompt += f"用户{i+1}: {q}\n"
            context_prompt += f"系统{i+1}: {a}\n"
        
        return context_prompt

    def _rule_based_entity_extraction(self, query: str) -> Dict[str, Any]:
        """基于规则的实体提取"""
        entities = {}
        
        # 提取年龄范围
        age_range_match = re.search(self.complex_patterns["age_range"], query)
        if age_range_match:
            entities["age_min"] = int(age_range_match.group(1))
            entities["age_max"] = int(age_range_match.group(2))
        
        # 提取时间范围
        time_match = re.search(self.complex_patterns["time_period"], query)
        if time_match:
            entities["time_period"] = time_match.group(1)
        
        # 提取比较条件
        comparison_match = re.search(self.complex_patterns["comparison"], query)
        if comparison_match:
            entities["comparison_operator"] = comparison_match.group(1)
            entities["comparison_value"] = int(comparison_match.group(2))
        
        # 提取多条件标识
        if re.search(self.complex_patterns["multiple_conditions"], query):
            entities["has_multiple_conditions"] = True
        
        # 提取老人姓名（2-4个中文字符，排除常见词汇）
        chinese_names = re.findall(r'[\u4e00-\u9fa5]{2,4}', query)
        excluded_terms = ["查询", "查找", "老人", "信息", "健康", "状况", "统计", "分析"]
        for name in chinese_names:
            if name not in excluded_terms and not any(term in name for term in excluded_terms):
                entities["elderly_name"] = name
                break
        
        # 识别查询类型关键词
        query_lower = query.lower()
        if any(term in query_lower for term in ["血压", "血糖", "心率"]):
            entities["query_type"] = "health_data"
        elif any(term in query_lower for term in ["服务", "上门", "关怀"]):
            entities["query_type"] = "service_records"
        elif any(term in query_lower for term in ["预警", "风险", "异常"]):
            entities["query_type"] = "warnings"
        elif any(term in query_lower for term in ["统计", "分析", "分布"]):
            entities["query_type"] = "statistics"
        
        return entities

    def _fallback_intent_recognition(self, query: str, user_id: str) -> Dict[str, Any]:
        """降级意图识别（当大模型不可用时）"""
        
        # 基于关键词的意图分类
        intent = "query_elderly_info"
        confidence = 0.7
        
        query_lower = query.lower()
        
        if any(term in query_lower for term in ["血压", "血糖", "健康"]):
            intent = "query_health_data"
            confidence = 0.8
        elif any(term in query_lower for term in ["服务", "上门"]):
            intent = "query_service_records"
            confidence = 0.8
        elif any(term in query_lower for term in ["预警", "风险"]):
            intent = "query_warnings"
            confidence = 0.9
        elif any(term in query_lower for term in ["统计", "分析", "分布"]):
            intent = "statistical_analysis"
            confidence = 0.85
        
        # 实体提取
        entities = self._rule_based_entity_extraction(query)
        
        # SQL提示生成
        sql_hint = self._generate_sql_hint(intent, entities)
        
        return {
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "sql_hint": sql_hint,
            "requires_followup": False,
            "followup_question": ""
        }

    def _generate_sql_hint(self, intent: str, entities: Dict[str, Any]) -> str:
        """生成SQL查询提示"""
        
        base_queries = {
            "query_elderly_info": "SELECT id, name, age, gender, phone, address, is_alone FROM elderly",
            "query_health_data": "SELECT e.name, h.record_date, h.blood_pressure_systolic, h.blood_pressure_diastolic, h.blood_sugar FROM health_records h JOIN elderly e ON h.elderly_id = e.id",
            "query_service_records": "SELECT e.name, s.service_type, s.service_date, s.service_provider, s.description FROM service_records s JOIN elderly e ON s.elderly_id = e.id",
            "query_warnings": "SELECT e.name, w.warning_type, w.risk_level, w.description, w.created_at FROM warnings w JOIN elderly e ON w.elderly_id = e.id",
            "statistical_analysis": "SELECT risk_level, COUNT(*) as count FROM elderly GROUP BY risk_level"
        }
        
        base_sql = base_queries.get(intent, base_queries["query_elderly_info"])
        
        # 构建WHERE条件
        conditions = []
        
        if "elderly_name" in entities:
            conditions.append(f"e.name LIKE '%{entities['elderly_name']}%'")
        
        if "age_min" in entities and "age_max" in entities:
            conditions.append(f"e.age BETWEEN {entities['age_min']} AND {entities['age_max']}")
        elif "age" in entities:
            conditions.append(f"e.age = {entities['age']}")
        
        if "time_period" in entities:
            time_condition = self._parse_time_period(entities["time_period"])
            if time_condition:
                conditions.append(time_condition)
        
        if conditions:
            base_sql += " WHERE " + " AND ".join(conditions)
        
        # 添加排序和限制
        if intent in ["query_warnings", "query_service_records"]:
            base_sql += " ORDER BY created_at DESC LIMIT 100"
        else:
            base_sql += " LIMIT 100"
        
        return base_sql

    def _parse_time_period(self, time_period: str) -> str:
        """解析时间范围条件"""
        time_conditions = {
            "今天": "record_date = CURDATE()",
            "昨天": "record_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
            "本周": "record_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
            "本月": "record_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
            "今年": "record_date >= DATE_FORMAT(CURDATE(), '%Y-01-01')"
        }
        
        return time_conditions.get(time_period, "")

    def _update_conversation_context(self, user_id: str, query: str, intent_result: Dict[str, Any]):
        """更新对话上下文"""
        if user_id not in self.conversation_context:
            self.conversation_context[user_id] = {
                "history": [],
                "current_intent": "",
                "entities": {}
            }
        
        context = self.conversation_context[user_id]
        
        # 记录对话历史（限制最多10轮）
        context["history"].append((query, intent_result.get("sql_hint", "")))
        if len(context["history"]) > 10:
            context["history"] = context["history"][-10:]
        
        # 更新当前意图和实体
        context["current_intent"] = intent_result.get("intent", "")
        context["entities"].update(intent_result.get("entities", {}))

    def clear_conversation_context(self, user_id: str):
        """清空用户对话上下文"""
        if user_id in self.conversation_context:
            self.conversation_context[user_id] = {
                "history": [],
                "current_intent": "",
                "entities": {}
            }

    def get_conversation_summary(self, user_id: str) -> Dict[str, Any]:
        """获取对话摘要"""
        if user_id not in self.conversation_context:
            return {"message": "暂无对话记录"}
        
        context = self.conversation_context[user_id]
        return {
            "conversation_count": len(context["history"]),
            "current_intent": context["current_intent"],
            "recent_queries": context["history"][-3:] if context["history"] else []
        }