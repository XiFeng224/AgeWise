from datetime import datetime, timedelta
from typing import Dict, List, Any

class ReportAgent:
    def __init__(self):
        self.report_templates = {
            "weekly": {
                "title": "社区养老服务周报",
                "sections": ["服务概况", "风险预警", "重点关注", "下周计划"]
            },
            "monthly": {
                "title": "社区养老服务月报", 
                "sections": ["月度总结", "数据分析", "成效评估", "改进建议"]
            },
            "risk": {
                "title": "风险预警分析报告",
                "sections": ["风险概况", "预警分析", "处理情况", "预防措施"]
            }
        }

    def generate_report(self, report_type: str, period: str = "monthly") -> Dict[str, Any]:
        """生成报告"""
        try:
            template = self.report_templates.get(report_type, self.report_templates["monthly"])
            
            # 获取报告数据
            report_data = self._get_report_data(report_type, period)
            
            # 生成报告内容
            report_content = self._generate_content(template, report_data, period)
            
            return {
                "title": template["title"],
                "period": period,
                "generated_at": datetime.now().isoformat(),
                "content": report_content,
                "summary": self._generate_summary(report_data),
                "charts": self._suggest_charts(report_data)
            }
            
        except Exception as e:
            print(f"报告生成错误: {e}")
            return {
                "title": "报告生成失败",
                "error": str(e)
            }

    def _get_report_data(self, report_type: str, period: str) -> Dict[str, Any]:
        """获取报告数据（模拟实现）"""
        
        # 模拟数据
        if report_type == "weekly":
            return {
                "total_elderly": 156,
                "services_this_week": 45,
                "new_warnings": 8,
                "resolved_warnings": 12,
                "high_risk_count": 3,
                "service_types": {
                    "health_check": 15,
                    "home_visit": 20,
                    "emergency": 5,
                    "consultation": 5
                },
                "warning_types": {
                    "health": 4,
                    "access": 2,
                    "weather": 2
                }
            }
        elif report_type == "monthly":
            return {
                "total_elderly": 156,
                "services_this_month": 210,
                "new_warnings": 45,
                "resolved_warnings": 38,
                "satisfaction_rate": 98.5,
                "risk_distribution": {
                    "low": 120,
                    "medium": 24,
                    "high": 12
                },
                "service_trend": [
                    {"month": "2024-01", "count": 210},
                    {"month": "2023-12", "count": 195},
                    {"month": "2023-11", "count": 180}
                ]
            }
        else:  # risk report
            return {
                "total_warnings": 45,
                "high_risk_warnings": 8,
                "avg_response_time": "2.5小时",
                "warning_sources": {
                    "system_auto": 30,
                    "manual_report": 10,
                    "family_report": 5
                },
                "resolution_rate": 84.4
            }

    def _generate_content(self, template: Dict[str, Any], data: Dict[str, Any], period: str) -> Dict[str, str]:
        """生成报告内容"""
        content = {}
        
        for section in template["sections"]:
            if section == "服务概况":
                content[section] = f"""本周共服务老人{data['total_elderly']}人，完成各类服务{data['services_this_week']}次。
其中健康检查{data['service_types']['health_check']}次，上门服务{data['service_types']['home_visit']}次，
紧急处理{data['service_types']['emergency']}次，咨询服务{data['service_types']['consultation']}次。"""
            
            elif section == "风险预警":
                content[section] = f"""本周系统共发出预警{data['new_warnings']}次，其中健康类预警{data['warning_types']['health']}次，
出入异常预警{data['warning_types']['access']}次，天气提醒{data['warning_types']['weather']}次。
本周处理完成预警{data['resolved_warnings']}次，当前高风险预警{data['high_risk_count']}个需要重点关注。"""
            
            elif section == "重点关注":
                content[section] = """1. 张大爷（78岁）血压指标需要持续关注
2. 李奶奶（82岁）独居老人，需加强日常关怀
3. 高风险老人群体需要定期随访检查"""
            
            elif section == "下周计划":
                content[section] = """1. 完成所有高风险老人的上门检查
2. 开展季度健康评估工作
3. 优化预警处理流程，提高响应速度"""
            
            elif section == "月度总结":
                content[section] = f"""本月社区养老服务工作稳步推进，共服务老人{data['total_elderly']}人，
完成服务{data['services_this_month']}次，服务满意度达到{data['satisfaction_rate']}%。
风险预警系统运行稳定，共处理预警{data['new_warnings']}次，解决率{data['resolution_rate']}%。"""
            
            else:
                content[section] = "该部分内容正在生成中..."
        
        return content

    def _generate_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """生成报告摘要"""
        return {
            "key_metrics": {
                "服务老人总数": data.get("total_elderly", 0),
                "完成服务次数": data.get("services_this_week", data.get("services_this_month", 0)),
                "新增预警数量": data.get("new_warnings", 0),
                "预警解决率": f"{data.get('resolution_rate', 0)}%"
            },
            "trend": "服务量稳步增长，预警处理效率提升",
            "highlight": "高风险老人关怀工作成效显著"
        }

    def _suggest_charts(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """建议图表配置"""
        charts = []
        
        if "risk_distribution" in data:
            charts.append({
                "type": "pie",
                "title": "风险等级分布",
                "data": data["risk_distribution"]
            })
        
        if "service_types" in data:
            charts.append({
                "type": "bar",
                "title": "服务类型分布", 
                "data": data["service_types"]
            })
        
        if "service_trend" in data:
            charts.append({
                "type": "line",
                "title": "服务趋势分析",
                "data": data["service_trend"]
            })
        
        return charts