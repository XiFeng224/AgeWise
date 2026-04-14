import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class RiskAgent:
    def __init__(self):
        # 风险规则配置
        self.risk_rules = {
            "health_abnormal": {
                "name": "健康指标异常",
                "conditions": [
                    {"metric": "blood_pressure", "operator": ">", "threshold": 140, "duration": 3},
                    {"metric": "blood_sugar", "operator": ">", "threshold": 7.8, "duration": 3}
                ],
                "risk_level": "high",
                "description": "健康指标连续异常"
            },
            "no_access_record": {
                "name": "无出入记录",
                "conditions": [
                    {"metric": "last_access_hours", "operator": ">", "threshold": 48}
                ],
                "risk_level": "medium", 
                "description": "独居老人长时间无出入记录"
            },
            "extreme_weather": {
                "name": "极端天气提醒",
                "conditions": [
                    {"metric": "temperature", "operator": "<", "threshold": 0},
                    {"metric": "temperature", "operator": ">", "threshold": 35}
                ],
                "risk_level": "low",
                "description": "极端天气条件下的健康提醒"
            },
            "season_change": {
                "name": "季节变化提醒", 
                "conditions": [],
                "risk_level": "low",
                "description": "季节变化时的健康关注提醒"
            }
        }
        
        # 风险评分权重
        self.risk_weights = {
            "age": 0.15,
            "health_status": 0.25,
            "living_condition": 0.20,
            "recent_warnings": 0.30,
            "service_frequency": 0.10
        }

    def analyze_risk(self, elderly_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """分析老人风险"""
        try:
            # 计算基础风险分数
            base_score = self._calculate_base_risk_score(data)
            
            # 应用风险规则
            rule_scores = self._apply_risk_rules(data)
            
            # 综合风险评分
            total_score = base_score + sum(rule_scores.values())
            
            # 确定风险等级
            risk_level = self._determine_risk_level(total_score)
            
            # 识别风险因素
            risk_factors = self._identify_risk_factors(data, rule_scores)
            
            # 生成建议
            recommendations = self._generate_recommendations(risk_level, risk_factors)
            
            return {
                "risk_level": risk_level,
                "score": round(total_score, 2),
                "factors": risk_factors,
                "recommendations": recommendations
            }
            
        except Exception as e:
            print(f"风险分析错误: {e}")
            return {
                "risk_level": "low",
                "score": 0.0,
                "factors": [],
                "recommendations": ["风险分析暂时不可用"]
            }

    def _calculate_base_risk_score(self, data: Dict[str, Any]) -> float:
        """计算基础风险分数"""
        score = 0.0
        
        # 年龄风险
        age = data.get("age", 60)
        if age >= 80:
            score += self.risk_weights["age"] * 1.0
        elif age >= 70:
            score += self.risk_weights["age"] * 0.7
        elif age >= 60:
            score += self.risk_weights["age"] * 0.3
        
        # 健康状况风险
        health_status = data.get("health_status", "good")
        health_scores = {"excellent": 0.1, "good": 0.3, "fair": 0.7, "poor": 1.0}
        score += self.risk_weights["health_status"] * health_scores.get(health_status, 0.3)
        
        # 居住状况风险
        is_alone = data.get("is_alone", False)
        if is_alone:
            score += self.risk_weights["living_condition"] * 0.8
        
        # 近期预警数量
        recent_warnings = data.get("recent_warnings", 0)
        warning_score = min(recent_warnings / 10.0, 1.0)  # 最多10个预警
        score += self.risk_weights["recent_warnings"] * warning_score
        
        # 服务频率
        service_frequency = data.get("service_frequency", 7)  # 默认7天一次
        if service_frequency > 14:  # 超过14天无服务
            score += self.risk_weights["service_frequency"] * 0.8
        elif service_frequency > 7:
            score += self.risk_weights["service_frequency"] * 0.4
        
        return score

    def _apply_risk_rules(self, data: Dict[str, Any]) -> Dict[str, float]:
        """应用风险规则"""
        rule_scores = {}
        
        for rule_id, rule in self.risk_rules.items():
            if self._check_rule_conditions(rule, data):
                # 根据风险等级分配分数
                level_scores = {"high": 0.8, "medium": 0.5, "low": 0.2}
                rule_scores[rule_id] = level_scores.get(rule["risk_level"], 0.2)
        
        return rule_scores

    def _check_rule_conditions(self, rule: Dict[str, Any], data: Dict[str, Any]) -> bool:
        """检查规则条件是否满足"""
        conditions = rule.get("conditions", [])
        
        if not conditions:  # 无条件规则（如季节提醒）
            return True
        
        for condition in conditions:
            metric = condition["metric"]
            operator = condition["operator"]
            threshold = condition["threshold"]
            
            value = data.get(metric, 0)
            
            if operator == ">" and value <= threshold:
                return False
            elif operator == "<" and value >= threshold:
                return False
            elif operator == "==" and value != threshold:
                return False
        
        return True

    def _determine_risk_level(self, score: float) -> str:
        """根据分数确定风险等级"""
        if score >= 0.8:
            return "high"
        elif score >= 0.5:
            return "medium"
        else:
            return "low"

    def _identify_risk_factors(self, data: Dict[str, Any], rule_scores: Dict[str, float]) -> List[str]:
        """识别风险因素"""
        factors = []
        
        # 年龄因素
        age = data.get("age", 0)
        if age >= 80:
            factors.append("高龄老人")
        
        # 健康状况
        health_status = data.get("health_status", "")
        if health_status in ["fair", "poor"]:
            factors.append("健康状况不佳")
        
        # 居住状况
        if data.get("is_alone", False):
            factors.append("独居老人")
        
        # 触发规则
        for rule_id in rule_scores.keys():
            rule = self.risk_rules.get(rule_id, {})
            factors.append(rule.get("description", rule_id))
        
        return factors

    def _generate_recommendations(self, risk_level: str, risk_factors: List[str]) -> List[str]:
        """生成建议"""
        recommendations = []
        
        if risk_level == "high":
            recommendations.append("立即安排上门检查")
            recommendations.append("通知家属和社区医生")
            recommendations.append("加强日常监测频率")
        elif risk_level == "medium":
            recommendations.append("近期安排上门服务")
            recommendations.append("定期电话随访")
            recommendations.append("关注健康指标变化")
        else:
            recommendations.append("保持常规服务频率")
            recommendations.append("定期健康检查")
        
        # 根据风险因素添加具体建议
        if "独居老人" in risk_factors:
            recommendations.append("加强独居老人关怀服务")
        if "健康状况不佳" in risk_factors:
            recommendations.append("增加健康监测频次")
        if "高龄老人" in risk_factors:
            recommendations.append("提供适老化服务支持")
        
        return recommendations

    def daily_check(self) -> List[Dict[str, Any]]:
        """每日风险巡检"""
        warnings = []
        
        # 模拟巡检过程
        # 实际应该从数据库获取老人数据进行分析
        
        # 模拟生成一些预警
        sample_warnings = [
            {
                "elderly_id": 1,
                "warning_type": "health_abnormal",
                "risk_level": "high",
                "description": "血压连续3次超过180/110mmHg",
                "trigger_data": {"blood_pressure": 185}
            },
            {
                "elderly_id": 2,
                "warning_type": "no_access_record", 
                "risk_level": "medium",
                "description": "48小时无门禁出入记录",
                "trigger_data": {"last_access_hours": 50}
            }
        ]
        
        warnings.extend(sample_warnings)
        
        return warnings