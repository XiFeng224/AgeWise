import re
from typing import List, Dict, Any

class SQLAgent:
    def __init__(self):
        # SQL生成模板
        self.sql_templates = {
            "query_elderly_info": {
                "base": "SELECT id, name, age, gender, phone, address, health_status, risk_level FROM elderly",
                "filters": {
                    "name": "name LIKE '%{value}%'",
                    "age": "age = {value}",
                    "risk_level": "risk_level = '{value}'",
                    "health_status": "health_status = '{value}'",
                    "gender": "gender = '{value}'"
                }
            },
            "query_health_status": {
                "base": "SELECT name, age, health_status, risk_level, last_checkup FROM elderly",
                "filters": {
                    "health_status": "health_status = '{value}'",
                    "risk_level": "risk_level = '{value}'"
                }
            },
            "query_service_records": {
                "base": "SELECT sr.*, e.name as elderly_name FROM service_records sr JOIN elderly e ON sr.elderly_id = e.id",
                "filters": {
                    "elderly_name": "e.name LIKE '%{value}%'",
                    "service_type": "sr.service_type = '{value}'",
                    "date_range": "sr.service_date BETWEEN '{start}' AND '{end}'"
                }
            },
            "query_warnings": {
                "base": "SELECT w.*, e.name as elderly_name FROM warnings w JOIN elderly e ON w.elderly_id = e.id",
                "filters": {
                    "elderly_name": "e.name LIKE '%{value}%'",
                    "warning_type": "w.warning_type = '{value}'",
                    "risk_level": "w.risk_level = '{value}'",
                    "status": "w.status = '{value}'"
                }
            },
            "statistical_analysis": {
                "risk_distribution": "SELECT risk_level, COUNT(*) as count FROM elderly GROUP BY risk_level",
                "age_distribution": "SELECT FLOOR(age/10)*10 as age_group, COUNT(*) as count FROM elderly GROUP BY age_group ORDER BY age_group",
                "health_status": "SELECT health_status, COUNT(*) as count FROM elderly GROUP BY health_status",
                "service_trend": "SELECT DATE_FORMAT(service_date, '%Y-%m') as month, COUNT(*) as count FROM service_records GROUP BY month ORDER BY month"
            }
        }

    def generate_sql(self, intent: Dict[str, Any]) -> str:
        """根据意图生成SQL查询"""
        intent_type = intent.get("intent", "query_elderly_info")
        entities = intent.get("entities", {})
        
        if intent_type == "statistical_analysis":
            # 统计分析类查询
            return self._generate_statistical_sql(entities)
        else:
            # 普通查询
            return self._generate_normal_sql(intent_type, entities)

    def _generate_normal_sql(self, intent_type: str, entities: Dict[str, Any]) -> str:
        """生成普通查询SQL"""
        if intent_type not in self.sql_templates:
            intent_type = "query_elderly_info"
        
        template = self.sql_templates[intent_type]
        base_sql = template["base"]
        filters = template["filters"]
        
        # 构建WHERE条件
        conditions = []
        for entity_key, entity_value in entities.items():
            if entity_key in filters:
                filter_template = filters[entity_key]
                
                if entity_key == "date_range":
                    # 处理日期范围
                    date_condition = self._parse_date_range(entity_value)
                    if date_condition:
                        conditions.append(date_condition)
                else:
                    # 普通条件
                    condition = filter_template.format(value=entity_value)
                    conditions.append(condition)
        
        # 组合SQL
        if conditions:
            sql = f"{base_sql} WHERE {' AND '.join(conditions)}"
        else:
            sql = base_sql
        
        # 添加排序和限制
        if intent_type in ["query_warnings", "query_service_records"]:
            sql += " ORDER BY created_at DESC LIMIT 100"
        else:
            sql += " LIMIT 100"
        
        return sql

    def _generate_statistical_sql(self, entities: Dict[str, Any]) -> str:
        """生成统计分析SQL"""
        # 根据查询内容选择统计类型
        query_text = entities.get("query_text", "")
        
        if "风险" in query_text or "risk" in query_text.lower():
            return self.sql_templates["statistical_analysis"]["risk_distribution"]
        elif "年龄" in query_text or "age" in query_text.lower():
            return self.sql_templates["statistical_analysis"]["age_distribution"]
        elif "健康" in query_text or "health" in query_text.lower():
            return self.sql_templates["statistical_analysis"]["health_status"]
        elif "服务" in query_text or "service" in query_text.lower():
            return self.sql_templates["statistical_analysis"]["service_trend"]
        else:
            # 默认返回风险分布统计
            return self.sql_templates["statistical_analysis"]["risk_distribution"]

    def _parse_date_range(self, date_str: str) -> str:
        """解析日期范围"""
        # 简化处理，实际应该更复杂
        if "今天" in date_str:
            return "service_date = CURDATE()"
        elif "本周" in date_str:
            return "service_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)"
        elif "本月" in date_str:
            return "service_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
        else:
            return ""

    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """执行SQL查询（模拟实现）"""
        # 这里应该是实际的数据库查询
        # 为了演示，返回模拟数据
        
        if "risk_level" in sql and "COUNT" in sql:
            # 风险分布统计
            return [
                {"risk_level": "低风险", "count": 120},
                {"risk_level": "中风险", "count": 24},
                {"risk_level": "高风险", "count": 12}
            ]
        elif "age_group" in sql:
            # 年龄分布统计
            return [
                {"age_group": 60, "count": 25},
                {"age_group": 70, "count": 68},
                {"age_group": 80, "count": 45},
                {"age_group": 90, "count": 18}
            ]
        elif "health_status" in sql and "COUNT" in sql:
            # 健康状况统计
            return [
                {"health_status": "优秀", "count": 32},
                {"health_status": "良好", "count": 78},
                {"health_status": "一般", "count": 35},
                {"health_status": "较差", "count": 11}
            ]
        else:
            # 普通查询
            return [
                {
                    "id": 1,
                    "name": "张大爷",
                    "age": 78,
                    "gender": "男",
                    "phone": "138****1234",
                    "address": "幸福小区1栋101",
                    "health_status": "良好",
                    "risk_level": "中风险"
                },
                {
                    "id": 2,
                    "name": "李奶奶", 
                    "age": 82,
                    "gender": "女",
                    "phone": "139****5678",
                    "address": "和谐小区3栋205",
                    "health_status": "一般",
                    "risk_level": "高风险"
                }
            ]

    def suggest_chart_type(self, data: List[Dict[str, Any]]) -> str:
        """根据数据特征推荐图表类型"""
        if not data:
            return "table"
        
        # 分析数据特征
        first_row = data[0]
        
        if "count" in first_row and "risk_level" in first_row:
            return "pie"  # 风险分布饼图
        elif "count" in first_row and "age_group" in first_row:
            return "bar"   # 年龄分布柱状图
        elif "count" in first_row and "health_status" in first_row:
            return "bar"   # 健康状况柱状图
        elif "count" in first_row and "month" in first_row:
            return "line"  # 服务趋势折线图
        else:
            return "table"  # 默认表格