class AiMetricsService {
  private static instance: AiMetricsService

  private totalQueries = 0
  private answeredQueries = 0
  private fallbackQueries = 0
  private highRiskDetected = 0
  private confidenceSum = 0
  private recentCalls: Array<{
    time: string
    source: 'qwen' | 'nlp' | 'rule' | 'unknown'
    query: string
    latencyMs: number
    success: boolean
  }> = []

  static getInstance() {
    if (!AiMetricsService.instance) {
      AiMetricsService.instance = new AiMetricsService()
    }
    return AiMetricsService.instance
  }

  recordQuery(params: {
    success: boolean
    usedFallback: boolean
    confidence?: number
    riskLevel?: string
    source?: 'qwen' | 'nlp' | 'rule' | 'unknown'
    query?: string
    latencyMs?: number
  }) {
    this.totalQueries += 1
    if (params.success) this.answeredQueries += 1
    if (params.usedFallback) this.fallbackQueries += 1
    if (params.riskLevel === 'high') this.highRiskDetected += 1
    if (typeof params.confidence === 'number') this.confidenceSum += params.confidence

    this.recentCalls.unshift({
      time: new Date().toISOString(),
      source: params.source || 'unknown',
      query: params.query || '',
      latencyMs: params.latencyMs || 0,
      success: params.success
    })

    if (this.recentCalls.length > 50) {
      this.recentCalls = this.recentCalls.slice(0, 50)
    }
  }

  getMetrics() {
    const accuracy = this.totalQueries > 0 ? Number(((this.answeredQueries / this.totalQueries) * 100).toFixed(1)) : 0
    const fallbackRate = this.totalQueries > 0 ? Number(((this.fallbackQueries / this.totalQueries) * 100).toFixed(1)) : 0
    const avgConfidence = this.totalQueries > 0 ? Number(((this.confidenceSum / this.totalQueries) * 100).toFixed(1)) : 0

    return {
      totalQueries: this.totalQueries,
      answeredQueries: this.answeredQueries,
      highRiskDetected: this.highRiskDetected,
      accuracy,
      fallbackRate,
      avgConfidence,
      recentCalls: this.recentCalls
    }
  }
}

export const aiMetricsService = AiMetricsService.getInstance()
