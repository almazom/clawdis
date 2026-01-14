# 03. AI Analysis Block

**SP:** 4 | **Status:** ⏳ Pending | **Priority:** Medium | **Tags:** feature, ai

## Description

Generate AI-powered analysis and summary of all 5 agent responses for HTML report.

## Requirements

### Must Have
- [ ] After all 5 agents complete, use Kimi to analyze all responses
- [ ] Generate comparison summary including:
  - Different perspectives from each agent
  - Consensus points
  - Contradictions or gaps
  - Best answer recommendation
- [ ] Include analysis in HTML report

### Should Have
- [ ] Quality assessment of each response
- [ ] Recommendations for follow-up

### Nice to Have
- [ ] Confidence scores for analysis

## Implementation Details

### Analysis Workflow
```
All 5 agents complete
         │
         ▼
Generate analysis prompt with all responses
         │
         ▼
Call kimi_cli_web with analysis prompt
         │
         ▼
Parse AI response
         │
         ▼
Include in HTML report
```

### Detailed Analysis Prompt
```typescript
function generateAnalysisPrompt(query: string, agents: AgentResult[]): string {
  const responses = agents
    .filter(a => a.success)
    .map(a => `${a.agentDisplay}: ${a.response?.substring(0, 500) || 'N/A'}`)
    .join('\n\n---\n\n');

  return `Ты — экспертный аналитик AI-систем. Проанализируй 5 ответов на запрос: "${query}"

Ответы AI агентов:
${responses}

ТРЕБУЕТСЯ анализ в следующем формате (на русском языке):

## Краткое резюме (2-3 предложения)
[твой анализ]

## Общие выводы (3-5 пунктов)
- [пункт 1]
- [пункт 2]
- [пункт 3]

## Уникальные особенности каждого ответа
- **${getAgentName(1)}**: [что выделяет]
- **${getAgentName(2)}**: [что выделяет]
- ...

## Противоречия и расхождения
[если есть - опишите, если нет - напишите "Существенных противоречий не обнаружено"]

## Лучший ответ: [НАЗВАНИЕ АГЕНТА]
Обоснование: [почему этот ответ лучший]

## Рекомендации для пользователя
[что делать дальше с этой информацией]

Ответь ТОЛЬКО анализом, без предисловий.`;
}
```

### HTML Integration
```html
<div class="ai-analysis">
  <h2>🤖 AI Анализ</h2>

  <div class="analysis-section">
    <h3>📋 Краткое резюме</h3>
    <p>${analysis.summary}</p>
  </div>

  <div class="analysis-section">
    <h3>📌 Общие выводы</h3>
    <ul>
      ${analysis.consensus.map(c => `<li>${c}</li>`).join('')}
    </ul>
  </div>

  <div class="analysis-section">
    <h3>💡 Уникальные особенности</h3>
    <ul>
      ${analysis.insights.map(i => `<li>${i}</li>`).join('')}
    </ul>
  </div>

  <div class="analysis-section">
    <h3>⚠️ Противоречия</h3>
    <p>${analysis.contradictions || 'Существенных противоречий не обнаружено'}</p>
  </div>

  <div class="recommendation">
    <h3>⭐ Лучший ответ: ${analysis.bestAgent}</h3>
    <p>${analysis.bestReason}</p>
  </div>

  <div class="recommendations">
    <h3>🎯 Рекомендации</h3>
    <p>${analysis.recommendations}</p>
  </div>
</div>
```

### Analysis Result Interface
```typescript
interface AIAnalysis {
  summary: string;
  consensus: string[];
  insights: string[];
  contradictions: string;
  bestAgent: string;
  bestReason: string;
  recommendations: string;
}

async function analyzeAgents(
  query: string,
  agents: AgentResult[]
): Promise<AIAnalysis> {
  const prompt = generateAnalysisPrompt(query, agents);
  const result = await execAsync(
    `/home/almaz/zoo_flow/clawdis/scripts/ai-wrappers/kimi_cli_web "${prompt}"`,
    { timeout: 90000 }
  );
  return parseAIResponse(result.stdout);
}
```

## Files to Modify
- `src/web-search/multi-agent.ts` (add analyzeResults function)
- `src/web-search/multi-agent.ts` (update HTML template with AI Analysis section)

## Testing
```bash
# Run web search
/web "git flow principles"

# Wait for all agents to complete
# Verify HTML report contains:
# - AI Analysis section with all subsections
# - Consensus points (3-5 bullets)
# - Best answer recommendation
# - Recommendations for user
```

## Acceptance Criteria
- [ ] AI analysis generated after all agents complete
- [ ] Analysis in Russian (fully)
- [ ] Includes summary (2-3 sentences)
- [ ] Includes consensus points (3-5 bullets)
- [ ] Includes best answer recommendation
- [ ] Includes user recommendations
- [ ] Rendered correctly in HTML report
- [ ] Graceful fallback if analysis fails

## Notes
- Use Kimi CLI (best quality) for analysis
- Timeout: 90 seconds for analysis
- **Fallback if analysis fails:** Skip AI Analysis section, show "Анализ недоступен"
- Keep analysis concise (not full report)
- Parse AI response carefully (may have markdown)
