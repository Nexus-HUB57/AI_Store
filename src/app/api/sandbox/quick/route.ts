import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ── Deterministic hash helper ──
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}

function pickFromSeed(seed: number, arr: string[]): string[] {
  const result: string[] = []
  const count = 1 + (seed % 3)
 const used = new Set<number>()
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    const idx = (seed + i * 7) % arr.length
    if (!used.has(idx)) {
      used.add(idx)
      result.push(arr[idx])
    }
  }
  return result
}

const SEGMENT_CAPABILITIES: Record<string, string[]> = {
  AGENT_APPS: ['NLP', 'code_generation', 'automation', 'reasoning', 'multi_modal'],
  EXECUTABLE_SKILLS: ['code_execution', 'data_processing', 'api_integration', 'file_handling', 'workflow'],
  KNOWLEDGE_PACKS: ['knowledge_retrieval', 'context_injection', 'fact_checking', 'summarization', 'classification'],
  SYNTHETIC_INFRASTRUCTURE: ['scalability', 'load_balancing', 'caching', 'orchestration', 'monitoring'],
  PROMPT_HARNESS: ['prompt_engineering', 'template_management', 'chain_of_thought', 'few_shot', 'output_formatting'],
  IN_APP_PRODUCTS: ['ui_generation', 'user_interaction', 'state_management', 'routing', 'data_binding'],
}

function generateSimulatedOutput(
  productNome: string,
  segmento: string,
  input: string | null,
  maxTokens: number,
): { output: string; tokensUsed: number; capabilitiesMatched: string[]; score: number } {
  const combined = `${productNome}:${segmento}:${input || ''}`
  const hash = djb2Hash(combined)

  const capabilities = SEGMENT_CAPABILITIES[segmento] || ['NLP', 'general_purpose']
  const matched = pickFromSeed(hash, capabilities)

  // Deterministic score 0.15 – 0.97
  const rawScore = (hash % 830 + 150) / 1000
  const score = Math.round(rawScore * 100) / 100

  // Build pseudo-intelligent output
  const phrases: Record<string, string[]> = {
    AGENT_APPS: [
      `Processando requisição via ${productNome}... Análise semântica concluída com sucesso.`,
      `Execução do agente ${productNome} iniciada. Pipeline de raciocínio ativado.`,
      `Resultado do ${productNome}: inferência multi-etapa processada. Confiança alta na saída gerada.`,
      `O módulo ${productNome} interpretou a entrada e gerou uma resposta estruturada.`,
    ],
    EXECUTABLE_SKILLS: [
      `Execução da skill ${productNome} finalizada. Dados processados corretamente.`,
      `${productNome}: rotina de processamento executada sem erros. Saída serializada.`,
      `Skill ${productNome} processou a entrada em ambiente isolado. Resultado disponível.`,
      `Pipeline de execução ${productNome} completada. 0 erros detectados.`,
    ],
    KNOWLEDGE_PACKS: [
      `Knowledge pack ${productNome}: 3 fragmentos relevantes recuperados do índice.`,
      `Injeção de contexto via ${productNome} aplicada. Cobertura semântica: alta.`,
      `${productNome} retornou conhecimento especializado. Resumo gerado com base em fontes verificadas.`,
      `Consulta ao pacote ${productNome} completada. Resultados classificados por relevância.`,
    ],
    SYNTHETIC_INFRASTRUCTURE: [
      `Infraestrutura ${productNome} alocada. Recursos simulados com sucesso.`,
      `${productNome}: ambiente de execução provisionado. Isolamento de processo ativo.`,
      `Componente ${productNome} inicializado. Métricas de saúde: nominal.`,
      `Sandbox ${productNome} operacional. Limites de recurso aplicados.`,
    ],
    PROMPT_HARNESS: [
      `Prompt template ${productNome} aplicado. Saída formatada conforme especificação.`,
      `${productNome}: chain-of-thought estruturada. Variáveis preenchidas corretamente.`,
      `Harness ${productNome} otimizou o prompt. Comprimento reduzido, fidelidade mantida.`,
      `Template ${productNome} renderizado. Output alinhado ao schema esperado.`,
    ],
    IN_APP_PRODUCTS: [
      `Interface ${productNome} renderizada. Componentes interativos ativos.`,
      `${productNome}: estado inicializado. Props validadas e aplicadas.`,
      `Produto ${productNome} executou o ciclo de vida completo. UI responsiva.`,
      `Módulo ${productNome} montado com sucesso. Eventos registrados.`,
    ],
  }

  const segmentPhrases = phrases[segmento] || phrases['AGENT_APPS']
  const basePhrase = segmentPhrases[hash % segmentPhrases.length]

  let output = basePhrase
  if (input) {
    output += ` Entrada recebida: "${input.slice(0, 80)}${input.length > 80 ? '...' : ''}"`
  }
  output += ` [Simulação sandbox — ${maxTokens} tokens máx.]`

  // Truncate to approximate token limit (rough: 1 token ≈ 4 chars)
  const maxChars = maxTokens * 4
  if (output.length > maxChars) {
    output = output.slice(0, maxChars) + '...'
  }

  // Estimate tokens used (~4 chars per token)
  const tokensUsed = Math.min(Math.ceil(output.length / 4), maxTokens)

  return { output, tokensUsed, capabilitiesMatched: matched, score }
}

function verdict(score: number): string {
  if (score >= 0.8) return 'ALTA_COMPATIBILIDADE'
  if (score >= 0.5) return 'COMPATIVEL'
  if (score >= 0.3) return 'PARCIAL'
  return 'INCOMPATIVEL'
}

// ── Route handler ──
export async function GET(req: NextRequest) {
  const startMs = Date.now()

  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) {
    return NextResponse.json(
      { error: 'productId obrigatório', hint: 'Use: GET /api/sandbox/quick?productId=clxxx&input=teste' },
      { status: 400 },
    )
  }

  const input = req.nextUrl.searchParams.get('input') || null
  const rawMaxTokens = req.nextUrl.searchParams.get('maxTokens')
  const maxTokens = rawMaxTokens ? Math.min(1000, Math.max(1, parseInt(rawMaxTokens, 10) || 100)) : 100

  try {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) {
    return NextResponse.json(
      { error: 'Produto não encontrado', hint: 'Busque produtos disponíveis em GET /api/products' },
      { status: 404 },
    )
  }

  const { output, tokensUsed, capabilitiesMatched, score } = generateSimulatedOutput(
    product.nome,
    product.segmento,
    input,
    maxTokens,
  )

  const latencyMs = Date.now() - startMs

  return NextResponse.json({
    ok: true,
    trial: {
      product: product.nome,
      segmento: product.segmento,
      input,
      output,
      tokens_used: tokensUsed,
      latency_ms: latencyMs,
      capabilities_matched: capabilitiesMatched,
      compatibility_score: score,
      verdict: verdict(score),
      rate_limit_note: 'Máximo de 10 quick trials por minuto por agente (controlado pelo middleware)',
    },
  })
  } catch (error) {
    console.error('sandbox/quick API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
