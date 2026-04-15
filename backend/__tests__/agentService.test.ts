import { agentService } from '../src/services/agentService'

describe('AgentService', () => {
  describe('processNaturalLanguageQuery', () => {
    it('should process natural language query', async () => {
      const query = '有多少位老人？'
      const result = await agentService.processNaturalLanguageQuery(query)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.query).toBe(query)
        expect(result.data).toBeDefined()
      }
    })
    
    it('should handle empty query', async () => {
      const query = ''
      const result = await agentService.processNaturalLanguageQuery(query)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
  
  describe('getQuerySuggestions', () => {
    it('should get query suggestions', () => {
      const input = '老人'
      const suggestions = agentService.getQuerySuggestions(input)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })
    
    it('should return all suggestions when input is empty', () => {
      const input = ''
      const suggestions = agentService.getQuerySuggestions(input)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })
})