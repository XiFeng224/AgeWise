import re
import json
from typing import List, Dict, Any, Tuple
import openai
from dotenv import load_dotenv
import os

load_dotenv()

class EnhancedSQLAgent:
    """增强版SQL Agent，支持安全校验、语法纠错和多表关联"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # 危险SQL操作黑名单
        self.dangerous_operations = [
            "DROP TABLE", "DELETE FROM", "TRUNCATE TABLE", 
            "ALTER TABLE", "CREATE TABLE", "INSERT INTO",
            "UPDATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"
        ]
        
        # 允许的表和字段白名单
        self.allowed_tables = {
            "elderly": ["id", "name", "age", "gender", "phone", "address", "is_alone", "living_condition"],
            "health_records": ["elderly_id", "record_date", "blood_pressure_systolic", "blood_pressure_diastolic", "blood_sugar", "heart_rate"],
            "service_records": ["elderly_id", "service_type", "service_date", "service_provider", "description"],
            "warnings": ["elderly_id", "warning_type", "risk_level", "description", "created_at"],
            "access_records": ["elderly_id", "access_time", "access_type", "location"]
        }
        
        # SQL模板库
        self.sql_templates = self._build_sql_templates()

    def _build_sql_templates(self) -> Dict[str, Dict[str, Any]]:
        """构建SQL查询模板库"""
        return {
            "basic_info": {
                "description": "老人基本信息查询",
                "base_sql": "SELECT id, name, age, gender, phone, address, is_alone FROM elderly",
                "filters": {
                    "name": "name LIKE '%{value}%'",
                    "age": "age = {value}",
                    "age_range": "age BETWEEN {min} AND {max}",
                    "gender": "gender = '{value}'",
                    "is_alone": "is_alone = {value}"
                }
            },
            "health_data": {
                "description": "健康数据查询",
                "base_sql": """
                    SELECT e.name, e.age, h.record_date, 
                           h.blood_pressure_systolic, h.blood_pressure_diastolic,
                           h.blood_sugar, h.heart_rate
                    FROM health_records h
                    JOIN elderly e ON h.elderly_id = e.id
                """,
                "filters": {
                    "elderly_name": "e.name LIKE '%{value}%'",
                    "age_range": "e.age BETWEEN {min} AND {max}",
                    "time_period": "h.record_date {condition}",
                    "blood_pressure": "(h.blood_pressure_systolic {operator} {value} OR h.blood_pressure_diastolic {operator} {value})",
                    "blood_sugar": "h.blood_sugar {operator} {value}"
                }
            },
            "service_analysis": {
                "description": "服务记录分析",
                "base_sql": """
                    SELECT e.name, s.service_type, s.service_date, 
                           s.service_provider, s.description
                    FROM service_records s
                    JOIN elderly e ON s.elderly_id = e.id
                """,
                "filters": {
                    "elderly_name": "e.name LIKE '%{value}%'",
                    "service_type": "s.service_type = '{value}'",
                    "time_period": "s.service_date {condition}",
                    "service_provider": "s.service_provider LIKE '%{value}%'"
                }
            },
            "warning_analysis": {
                "description": "预警信息分析",
                "base_sql": """
                    SELECT e.name, w.warning_type, w.risk_level, 
                           w.description, w.created_at, w.status
                    FROM warnings w
                    JOIN elderly e ON w.elderly_id = e.id
                """,
                "filters": {
                    "elderly_name": "e.name LIKE '%{value}%'",
                    "warning_type": "w.warning_type = '{value}'",
                    "risk_level": "w.risk_level = '{value}'",
                    "status": "w.status = '{value}'",
                    "time_period": "w.created_at {condition}"
                }
            },
            "statistical_queries": {
                "risk_distribution": "SELECT risk_level, COUNT(*) as count FROM elderly GROUP BY risk_level",
                "age_distribution": "SELECT FLOOR(age/10)*10 as age_group, COUNT(*) as count FROM elderly GROUP BY age_group ORDER BY age_group",
                "health_status": "SELECT health_status, COUNT(*) as count FROM health_records GROUP BY health_status",
                "service_trend": "SELECT DATE_FORMAT(service_date, '%Y-%m') as month, COUNT(*) as count FROM service_records GROUP BY month ORDER BY month",
                "warning_trend": "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, warning_type, COUNT(*) as count FROM warnings GROUP BY month, warning_type ORDER BY month"
            }
        }

    def generate_sql(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """生成SQL查询，包含安全校验和语法检查"""
        
        try:
            # 第一步：基于模板生成基础SQL
            base_sql = self._generate_from_template(intent)
            
            # 第二步：安全校验
            safety_check = self._safety_check(base_sql)
            if not safety_check["is_safe"]:
                return {
                    "success": False,
                    "sql": "",
                    "error": f"安全校验失败: {safety_check['reason']}",
                    "suggested_sql": safety_check.get("suggested_sql", "")
                }
            
            # 第三步：语法检查和优化
            optimized_sql = self._optimize_sql(base_sql)
            
            # 第四步：最终校验
            final_check = self._final_validation(optimized_sql)
            if not final_check["is_valid"]:
                return {
                    "success": False,
                    "sql": "",
                    "error": f"SQL语法错误: {final_check['error']}",
                    "suggested_sql": final_check.get("suggested_sql", "")
                }
            
            return {
                "success": True,
                "sql": optimized_sql,
                "explanation": self._explain_sql(optimized_sql),
                "estimated_rows": self._estimate_result_size(optimized_sql)
            }
            
        except Exception as e:
            return {
                "success": False,
                "sql": "",
                "error": f"SQL生成异常: {str(e)}",
                "suggested_sql": "SELECT * FROM elderly LIMIT 10"  # 默认安全查询
            }

    def _generate_from_template(self, intent: Dict[str, Any]) -> str:
        """基于模板生成SQL"""
        intent_type = intent.get("intent", "basic_info")
        entities = intent.get("entities", {})
        
        if intent_type == "statistical_analysis":
            # 统计分析类查询
            return self._generate_statistical_sql(entities)
        else:
            # 普通查询
            return self._generate_normal_sql(intent_type, entities)

    def _generate_normal_sql(self, intent_type: str, entities: Dict[str, Any]) -> str:
        """生成普通查询SQL"""
        template_key = self._map_intent_to_template(intent_type)
        template = self.sql_templates.get(template_key, self.sql_templates["basic_info"])
        
        base_sql = template["base_sql"].strip()
        filters = template["filters"]
        
        # 构建WHERE条件
        conditions = []
        for entity_key, entity_value in entities.items():
            condition = self._build_condition(entity_key, entity_value, filters)
            if condition:
                conditions.append(condition)
        
        # 组合SQL
        if conditions:
            sql = f"{base_sql} WHERE {' AND '.join(conditions)}"
        else:
            sql = base_sql
        
        # 添加排序和限制
        sql += self._add_ordering_and_limits(intent_type, entities)
        
        return sql

    def _generate_statistical_sql(self, entities: Dict[str, Any]) -> str:
        """生成统计分析SQL"""
        query_text = entities.get("query_text", "")
        
        # 根据查询内容选择统计类型
        if "风险" in query_text or "risk" in query_text.lower():
            return self.sql_templates["statistical_queries"]["risk_distribution"]
        elif "年龄" in query_text or "age" in query_text.lower():
            return self.sql_templates["statistical_queries"]["age_distribution"]
        elif "健康" in query_text or "health" in query_text.lower():
            return self.sql_templates["statistical_queries"]["health_status"]
        elif "服务" in query_text or "service" in query_text.lower():
            return self.sql_templates["statistical_queries"]["service_trend"]
        elif "预警" in query_text or "warning" in query_text.lower():
            return self.sql_templates["statistical_queries"]["warning_trend"]
        else:
            # 默认返回风险分布统计
            return self.sql_templates["statistical_queries"]["risk_distribution"]

    def _build_condition(self, entity_key: str, entity_value: Any, filters: Dict[str, str]) -> str:
        """构建单个查询条件"""
        if entity_key not in filters:
            return ""
        
        filter_template = filters[entity_key]
        
        if entity_key == "time_period":
            time_condition = self._parse_time_period(entity_value)
            return filter_template.format(condition=time_condition) if time_condition else ""
        
        elif entity_key == "age_range":
            if "min" in entity_value and "max" in entity_value:
                return filter_template.format(min=entity_value["min"], max=entity_value["max"])
        
        elif entity_key in ["blood_pressure", "blood_sugar"]:
            operator = entities.get("comparison_operator", ">")
            value = entities.get("comparison_value", 140)
            return filter_template.format(operator=operator, value=value)
        
        else:
            return filter_template.format(value=entity_value)
        
        return ""

    def _safety_check(self, sql: str) -> Dict[str, Any]:
        """SQL安全校验"""
        
        # 检查危险操作
        sql_upper = sql.upper()
        for dangerous_op in self.dangerous_operations:
            if dangerous_op in sql_upper:
                return {
                    "is_safe": False,
                    "reason": f"检测到危险操作: {dangerous_op}",
                    "suggested_sql": "SELECT * FROM elderly LIMIT 10"
                }
        
        # 检查表和字段白名单
        table_check = self._check_table_access(sql_upper)
        if not table_check["is_allowed"]:
            return {
                "is_safe": False,
                "reason": table_check["reason"],
                "suggested_sql": table_check.get("suggested_sql", "")
            }
        
        # 检查查询复杂度（防止DoS）
        if self._is_too_complex(sql):
            return {
                "is_safe": False,
                "reason": "查询过于复杂，可能影响系统性能",
                "suggested_sql": "SELECT * FROM elderly LIMIT 50"
            }
        
        return {"is_safe": True}

    def _check_table_access(self, sql: str) -> Dict[str, Any]:
        """检查表和字段访问权限"""
        
        # 提取所有表名
        table_matches = re.findall(r'FROM\s+(\w+)', sql, re.IGNORECASE)
        table_matches.extend(re.findall(r'JOIN\s+(\w+)', sql, re.IGNORECASE))
        
        for table in set(table_matches):
            if table not in self.allowed_tables:
                return {
                    "is_allowed": False,
                    "reason": f"不允许访问表: {table}",
                    "suggested_sql": "SELECT * FROM elderly LIMIT 10"
                }
        
        # 检查字段（简化检查）
        if "*" in sql and "COUNT(*)" not in sql:
            return {
                "is_allowed": True,
                "warning": "建议明确指定查询字段而不是使用SELECT *"
            }
        
        return {"is_allowed": True}

    def _optimize_sql(self, sql: str) -> str:
        """优化SQL查询"""
        
        # 移除多余的空格
        sql = re.sub(r'\s+', ' ', sql).strip()
        
        # 确保有LIMIT子句
        if "LIMIT" not in sql.upper() and "COUNT" not in sql.upper():
            sql += " LIMIT 100"
        
        # 优化WHERE条件顺序（将等值条件放在前面）
        if "WHERE" in sql.upper():
            sql = self._optimize_where_conditions(sql)
        
        return sql

    def _final_validation(self, sql: str) -> Dict[str, Any]:
        """最终语法校验"""
        
        try:
            # 这里可以集成真正的SQL语法检查器
            # 目前进行简单的格式检查
            
            if not sql.strip():
                return {"is_valid": False, "error": "SQL为空"}
            
            if not sql.upper().startswith("SELECT"):
                return {"is_valid": False, "error": "只支持SELECT查询"}
            
            # 检查基本的SQL结构
            if "FROM" not in sql.upper():
                return {"is_valid": False, "error": "缺少FROM子句"}
            
            return {"is_valid": True}
            
        except Exception as e:
            return {"is_valid": False, "error": str(e)}

    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """执行SQL查询（模拟实现）"""
        
        # 在实际项目中，这里应该连接真实数据库
        # 为了演示，返回模拟数据
        
        if "risk_level" in sql and "COUNT" in sql:
            return [
                {"risk_level": "低风险", "count": 120},
                {"risk_level": "中风险", "count": 24},
                {"risk_level": "高风险", "count": 12}
            ]
        elif "age_group" in sql:
            return [
                {"age_group": 60, "count": 25},
                {"age_group": 70, "count": 68},
                {"age_group": 80, "count": 45},
                {"age_group": 90, "count": 18}
            ]
        else:
            return [
                {
                    "id": 1, "name": "张大爷", "age": 78, "gender": "男",
                    "phone": "138****1234", "address": "幸福小区1栋101", "is_alone": True
                },
                {
                    "id": 2, "name": "李奶奶", "age": 82, "gender": "女",
                    "phone": "139****5678", "address": "和谐小区3栋205", "is_alone": False
                }
            ]

    def suggest_chart_type(self, data: List[Dict[str, Any]]) -> str:
        """根据数据特征推荐图表类型"""
        if not data:
            return "table"
        
        first_row = data[0]
        
        if "count" in first_row and "risk_level" in first_row:
            return "pie"  # 风险分布饼图
        elif "count" in first_row and "age_group" in first_row:
            return "bar"   # 年龄分布柱状图
        elif "count" in first_row and "month" in first_row:
            return "line"  # 趋势折线图
        else:
            return "table"  # 默认表格

    # 辅助方法
    def _map_intent_to_template(self, intent: str) -> str:
        """映射意图到模板"""
        mapping = {
            "query_elderly_info": "basic_info",
            "query_health_data": "health_data", 
            "query_service_records": "service_analysis",
            "query_warnings": "warning_analysis"
        }
        return mapping.get(intent, "basic_info")

    def _parse_time_period(self, time_period: str) -> str:
        """解析时间范围"""
        conditions = {
            "今天": "= CURDATE()",
            "昨天": "= DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
            "本周": ">= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
            "本月": ">= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
        }
        return conditions.get(time_period, "")

    def _is_too_complex(self, sql: str) -> bool:
        """判断SQL是否过于复杂"""
        # 简单的复杂度判断：JOIN数量、子查询数量等
        join_count = len(re.findall(r'JOIN', sql, re.IGNORECASE))
        subquery_count = len(re.findall(r'\(SELECT', sql, re.IGNORECASE))
        
        return join_count > 3 or subquery_count > 2

    def _optimize_where_conditions(self, sql: str) -> str:
        """优化WHERE条件顺序"""
        # 简化实现：实际应该分析条件的选择性
        return sql

    def _explain_sql(self, sql: str) -> str:
        """解释SQL查询意图"""
        if "COUNT" in sql.upper():
            return "统计查询：计算符合条件的记录数量"
        elif "GROUP BY" in sql.upper():
            return "分组统计：按指定字段分组统计"
        else:
            return "数据查询：检索符合条件的详细记录"

    def _estimate_result_size(self, sql: str) -> int:
        """估计结果集大小"""
        # 简化实现
        if "COUNT" in sql.upper():
            return 1
        elif "GROUP BY" in sql.upper():
            return 5  # 估计分组数量
        else:
            return 50  # 估计记录数量