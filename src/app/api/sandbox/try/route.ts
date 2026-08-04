import { z } from 'zod'
import { db } from '@/lib/db'
import { validate } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { agentErrorResponse } from '@/lib/error-resolver'

// ── Inline Zod schema ──
const sandboxTrySchema = z.object({
  productId: z.string().min(1, 'productId obrigatório'),
  inputs: z
    .array(
      z.object({
        role: z.enum(['user', 'system']),
        content: z.string().min(1, 'Conteúdo da mensagem obrigatório'),
      }),
    )
    .min(1, 'Mínimo 1 mensagem de entrada')
    .max(10, 'Máximo 10 mensagens por execução sandbox'),
  config: z
    .object({
      maxTokens: z.number().int().min(1).max(2000).default(500),
      temperature: z.number().min(0).max(1).default(0.7),
      returnMetrics: z.boolean().default(true),
    })
    .optional(),
})

type SandboxTryInput = z.infer<typeof sandboxTrySchema>

// ── Deterministic hash ──
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}

// ── Simulated multi-turn execution ──
const SEGMENT_RESPONSES: Record<string, string[]> = {
  AGENT_APPS: [
    'Análise concluída. O agente processou a entrada e gerou uma resposta estruturada com alta confiança.',
    'Pipeline de raciocínio ativada. Multi-etapa de inferência executada sem falhas.',
    'Execução do agente finalizada. Saída gerada com base no contexto fornecido.',
  ],
  EXECUTABLE_SKILLS: [
    'Skill executada com sucesso em ambiente isolado. Dados de entrada processados e saída serializada.',
    'Rotina de processamento completada. 0 erros, resultado validado.',
    'Execução em sandbox finalizada. Arquivos temporários limpos.',
  ],
  KNOWLEDGE_PACKS: [
    'Fragmentos de conhecimento relevantes recuperados. Injeção de contexto aplicada com sucesso.',
    'Consulta ao índice de conhecimento completada. Resultados classificados por relevância.',
    'Pacote de conhecimento ativado. Fontes verificadas e resumo gerado.',
  ],
  SYNTHETIC_INFRASTRUCTURE: [
    'Infraestrutura simulada alocada e operacional. Métricas de saúde: nominal.',
    'Ambiente de execução provisionado. Isolamento de processo ativo.',
    'Recurso alocado com sucesso. Limites de CPU/memória aplicados.',
  ],
  PROMPT_HARNESS: [
    'Template de prompt aplicado. Variáveis preenchidas e saída formatada corretamente.',
    'Chain-of-thought estruturada. Prompt otimizado para o modelo-alvo.',
    'Harness de prompt executado. Output alinhado ao schema esperado.',
  ],
  IN_APP_PRODUCTS: [
    'Componente renderizado com sucesso. Estado inicializado e eventos registrados.',
    'Módulo montado. Ciclo de vida completo executado sem erros.',
    'Interface gerada. Responsividade validada. Props aplicadas corretamente.',
  ],
}

function simulateTurn(
  productId: string,
  productNome: string,
  segmento: string,
  turnIndex: number,
  inputContent: string,
  maxTokens: number,
  temperature: number,
) {
  const seed = djb2Hash(`${productId}:${turnIndex}:${inputContent}`)
  const responses = SEGMENT_RESPONSES[segmento] || SEGMENT_RESPONSES['AGENT_APPS']
  const baseResponse = responses[seed % responses.length]

  // Vary response based on temperature (higher temp = more varied/longer)
  const tempFactor = 0.5 + temperature * 0.5
  const variations = [
    ' Dados adicionais processados.',
    ' Contexto expandido com sucesso.',
    ' Validação cruzada aplicada.',
    '',
    ' Otimização automática ativada.',
  ]
  const variation = variations[seed % variations.length]

  let content = baseResponse
  if (variation) content += variation
  content += ` [turn=${turnIndex + 1}]`

  // Temperature affects length (simulate more verbose at higher temps)
  if (temperature > 0.7) {
    content += ` Parâmetros: temp=${temperature}, seed=${seed % 1000}.`
  }

  // Truncate to maxTokens (rough: 1 token ≈ 4 chars)
  const maxChars = maxTokens * 4
  if (content.length > maxChars) {
    content = content.slice(0, maxChars) + '...'
  }

  const outputTokens = Math.min(Math.ceil(content.length / 4), maxTokens)
  const latencyMs = Math.max(20, (outputTokens * 1.2 * tempFactor) | 0)

  return { content, tokens: outputTokens, latencyMs }
}

function computeMetrics(
  productId: string,
  results: { tokens: number; latency_ms: number }[],
  totalInputTokens: number,
): {
  accuracy_score: number
  relevance_score: number
  token_efficiency: number
  overall_score: number
} {
  const hash = djb2Hash(`metrics:${productId}:${totalInputTokens}`)

  // Deterministic but realistic-looking scores
  const accuracy = Math.round(((hash % 300 + 650) / 1000) * 100) / 100
  const relevance = Math.round(((((hash >> 4) % 300) + 650) / 1000) * 100) / 100

  const totalOutputTokens = results.reduce((s, r) => s + r.tokens, 0)
  const idealRatio = 0.4 // ideal: 40% of max used
  const actualRatio = totalOutputTokens > 0 ? Math.min(totalOutputTokens / (totalInputTokens * 3 + totalOutputTokens), 1) : 0
  const efficiency = Math.round((1 - Math.abs(actualRatio - idealRatio) / idealRatio) * 100) / 100

  const overall = Math.round((accuracy * 0.35 + relevance * 0.40 + efficiency * 0.25) * 100) / 100

  return { accuracy_score: accuracy, relevance_score: relevance, token_efficiency: efficiency, overall_score: overall }
}

// ── Route handler ──
export async function POST(req: NextRequest) {
  const startMs = Date.now()

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return agentErrorResponse('/api/sandbox/try', new Error('Corpo da requisição inválido (JSON esperado)'), 400)
  }

  const parsed = validate(sandboxTrySchema, raw)
  if (!parsed.success) {
    return agentErrorResponse('/api/sandbox/try', new Error(parsed.error.message), 400)
  }

  const { productId, inputs, config } = parsed.data as SandboxTryInput
  const { maxTokens = 500, temperature = 0.7, returnMetrics = true } = config || {}

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) {
    return agentErrorResponse('/api/sandbox/try', new Error('Produto não encontrado'), 404)
  }

  // Calculate input tokens (rough estimate)
  const totalInputTokens = inputs.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0)

  // Simulate each user input turn
  const userInputs = inputs.filter(m => m.role === 'user')
  const results: { turn: number; role: 'assistant'; content: string; tokens: number; latency_ms: number }[] = []

  let cumulativeLatency = 0
  for (let i = 0; i < userInputs.length; i++) {
    const sim = simulateTurn(productId, product.nome, product.segmento, i, userInputs[i].content, maxTokens, temperature)
    cumulativeLatency += sim.latencyMs
    results.push({
      turn: i + 1,
      role: 'assistant',
      content: sim.content,
      tokens: sim.tokens,
      latency_ms: sim.latencyMs,
    })
  }

  const totalOutputTokens = results.reduce((s, r) => s + r.tokens, 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const executionTimeMs = Date.now() - startMs

  // Compute metrics
  const metrics = returnMetrics
    ? computeMetrics(productId, results, totalInputTokens)
    : null

  // Recommendation
  const shouldBuy = metrics ? metrics.overall_score >= 0.6 : true
  const confidence = metrics ? metrics.overall_score : 0.5
  const reasons: Record<string, string> = {
    alta: 'Alta relevância e eficiência de tokens para seu caso de uso',
    media: 'Compatibilidade moderada — considere testar com mais inputs específicos',
    baixa: 'Baixa compatibilidade detectada — o produto pode não atender suas necessidades',
  }
  const reasonKey = confidence >= 0.75 ? 'alta' : confidence >= 0.5 ? 'media' : 'baixa'

  logger.info('sandbox:try completed', { productId, turns: results.length, totalTokens, overallScore: metrics?.overall_score })

  const sandboxData: Record<string, unknown> = {
    product_id: productId,
    product_name: product.nome,
    execution_time_ms: executionTimeMs,
    tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalTokens },
    results,
  }

  if (metrics) {
    sandboxData.metrics = metrics
  }

  sandboxData.recommendation = {
    should_buy: shouldBuy,
    confidence,
    reason: reasons[reasonKey],
  }

  return NextResponse.json({ ok: true, sandbox: sandboxData })
}
