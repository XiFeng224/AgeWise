from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import time
from dotenv import load_dotenv

from agents.nlp_agent import NLPAgent
from agents.sql_agent import SQLAgent
from agents.risk_agent import RiskAgent
from agents.report_agent import ReportAgent

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="社区养老智能Agent服务",
    description="基于大模型的自然语言查询与风险预警智能Agent系统",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化智能Agent
nlp_agent = NLPAgent()
sql_agent = SQLAgent()
risk_agent = RiskAgent()
report_agent = ReportAgent()

class QueryRequest(BaseModel):
    query: str
    context: str = ""

class QueryResponse(BaseModel):
    success: bool
    data: list = []
    sql: str = ""
    chart_type: str = ""
    message: str = ""
    error: str = ""

class RiskAnalysisRequest(BaseModel):
    elderly_id: int
    data: dict

class RiskAnalysisResponse(BaseModel):
    risk_level: str
    score: float
    factors: list
    recommendations: list

@app.get("/")
async def root():
    return {
        "message": "社区养老智能Agent服务",
        "version": "1.0.0",
        "status": "运行中"
    }

@app.post("/query/natural", response_model=QueryResponse)
async def natural_language_query(request: QueryRequest):
    """自然语言查询接口"""
    try:
        # 1. 自然语言理解
        intent = nlp_agent.understand_intent(request.query, request.context)
        
        # 2. 生成SQL查询
        sql_query = sql_agent.generate_sql(intent)
        
        # 3. 执行查询
        result_data = sql_agent.execute_query(sql_query)
        
        # 4. 分析结果并生成图表类型建议
        chart_type = sql_agent.suggest_chart_type(result_data)
        
        return QueryResponse(
            success=True,
            data=result_data,
            sql=sql_query,
            chart_type=chart_type,
            message="查询成功"
        )
        
    except Exception as e:
        return QueryResponse(
            success=False,
            error=str(e),
            message="查询失败"
        )

@app.post("/risk/analyze", response_model=RiskAnalysisResponse)
async def analyze_risk(request: RiskAnalysisRequest):
    """风险分析接口"""
    try:
        analysis = risk_agent.analyze_risk(request.elderly_id, request.data)
        
        return RiskAnalysisResponse(**analysis)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"风险分析失败: {str(e)}")

@app.get("/risk/daily-check")
async def daily_risk_check():
    """每日风险巡检"""
    try:
        warnings = risk_agent.daily_check()
        return {
            "success": True,
            "warnings_generated": len(warnings),
            "warnings": warnings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"风险巡检失败: {str(e)}")

@app.post("/report/generate")
async def generate_report(report_type: str, period: str = "monthly"):
    """生成报告接口"""
    try:
        report = report_agent.generate_report(report_type, period)
        return {
            "success": True,
            "report_type": report_type,
            "period": period,
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-15T10:00:00Z",
        "agents": {
            "nlp_agent": "active",
            "sql_agent": "active", 
            "risk_agent": "active",
            "report_agent": "active"
        }
    }

@app.get('/health/llm')
async def llm_health_check():
    """大模型可用性检查（千问/兜底模型）"""
    started_at = time.time()
    try:
        probe = nlp_agent.generate_response('请仅回复：ok', context='health_check')
        latency_ms = int((time.time() - started_at) * 1000)

        return {
            'status': 'healthy',
            'provider': 'aliyun-bailian' if nlp_agent.aliyun_client.enabled else ('openai' if nlp_agent.client is not None else 'rule-fallback'),
            'latency_ms': latency_ms,
            'sample': (probe or '')[:80]
        }
    except Exception as e:
        latency_ms = int((time.time() - started_at) * 1000)
        raise HTTPException(status_code=503, detail={
            'status': 'unhealthy',
            'latency_ms': latency_ms,
            'error': str(e)
        })

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )