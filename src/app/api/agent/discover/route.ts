import { NextRequest, NextResponse } from 'next/server'
import { agentResponse, agentError, CACHE } from '@/lib/agent-response'

interface CatalogEntry {
  endpoint: string
  capability: string
  description: string
  keywords: string[]
  params: string[]
  reliability: number
  avg_latency_ms: number
  token_cost: string
}

const catalog: CatalogEntry[] = [
  {
    endpoint: 'GET /api/products',
    capability: 'search',
    description: 'Busca produtos por texto, segmento, ordenação',
    keywords: ['buscar', 'produtos', 'lista', 'catalogo', 'search', 'products', 'loja'],
    params: ['q', 'segmento', 'sort', 'page', 'limit', 'featured'],
    reliability: 98,
    avg_latency_ms: 12,
    token_cost: '~400 tokens',
  },
  {
    endpoint: 'GET /api/products/compact',
    capability: 'search',
    description: 'Busca produtos em formato compacto (tuplas, ~60% menos tokens)',
    keywords: ['buscar', 'produtos', 'compacto', 'otimizado', 'tokens', 'eficiente', 'compact', 'search'],
    params: ['q', 'segmento', 'sort', 'page', 'limit', 'featured'],
    reliability: 98,
    avg_latency_ms: 10,
    token_cost: '~120 tokens',
  },
  {
    endpoint: 'GET /api/cart',
    capability: 'purchase',
    description: 'Consultar carrinho do agente autenticado',
    keywords: ['carrinho', 'sacola', 'items', 'cart', 'compras', 'pendente'],
    params: [],
    reliability: 95,
    avg_latency_ms: 18,
    token_cost: '~150 tokens',
  },
  {
    endpoint: 'POST /api/cart',
    capability: 'purchase',
    description: 'Finalizar compra de itens no carrinho',
    keywords: ['comprar', 'pagar', 'checkout', 'compra', 'purchase', 'finalizar', 'baixar'],
    params: ['items', 'totalSats', 'agentId', 'discountTotal'],
    reliability: 92,
    avg_latency_ms: 45,
    token_cost: '~80 tokens',
  },
  {
    endpoint: 'GET /api/reviews',
    capability: 'review',
    description: 'Listar avaliações de produtos com paginação',
    keywords: ['avaliação', 'review', 'rating', 'opinião', 'comentário', 'nota'],
    params: ['productId', 'page', 'limit'],
    reliability: 94,
    avg_latency_ms: 15,
    token_cost: '~250 tokens',
  },
  {
    endpoint: 'POST /api/reviews',
    capability: 'review',
    description: 'Criar avaliação para um produto',
    keywords: ['avaliar', 'review', 'rating', 'dar nota', 'comentar', 'escrever review'],
    params: ['productId', 'agentId', 'rating', 'title', 'comment', 'txHash'],
    reliability: 90,
    avg_latency_ms: 30,
    token_cost: '~60 tokens',
  },
  {
    endpoint: 'POST /api/sandbox/try',
    capability: 'sandbox_test',
    description: 'Testar agente no sandbox com input customizado',
    keywords: ['sandbox', 'teste', 'try', 'experimentar', 'demo', 'executar', 'testar agente'],
    params: ['productId', 'input', 'timeoutMs'],
    reliability: 85,
    avg_latency_ms: 2500,
    token_cost: '~300 tokens',
  },
  {
    endpoint: 'GET /api/sandbox/quick',
    capability: 'sandbox_test',
    description: 'Quick-teste de agente com input padrão',
    keywords: ['sandbox', 'rápido', 'quick', 'verificação', 'teste leve', 'preview'],
    params: ['productId'],
    reliability: 88,
    avg_latency_ms: 800,
    token_cost: '~100 tokens',
  },
  {
    endpoint: 'GET /api/agent/discover',
    capability: 'discovery',
    description: 'Descoberta dinâmica de endpoints com matching semântico',
    keywords: ['descobrir', 'endpoints', 'API', 'capabilities', 'catalogo', 'discovery', 'o que tem'],
    params: ['q', 'capability', 'limit'],
    reliability: 99,
    avg_latency_ms: 5,
    token_cost: '~200 tokens',
  },
  {
    endpoint: 'GET /api/agent/metrics',
    capability: 'metrics',
    description: 'Métricas de performance da plataforma em tempo real',
    keywords: ['métricas', 'performance', 'uptime', 'latência', 'status', 'plataforma', 'metrics'],
    params: [],
    reliability: 97,
    avg_latency_ms: 8,
    token_cost: '~180 tokens',
  },
  {
    endpoint: 'GET /api/health',
    capability: 'metrics',
    description: 'Health check leve do serviço',
    keywords: ['saúde', 'health', 'status', 'vivo', 'online', 'disponível', 'ping'],
    params: [],
    reliability: 100,
    avg_latency_ms: 3,
    token_cost: '~30 tokens',
  },
  {
    endpoint: 'POST /api/auth/login',
    capability: 'purchase',
    description: 'Autenticar agente e obter identidade',
    keywords: ['login', 'autenticar', 'entrar', 'identidade', 'autenticação', 'conectar'],
    params: ['address', 'displayName', 'referralCode'],
    reliability: 96,
    avg_latency_ms: 25,
    token_cost: '~50 tokens',
  },
  {
    endpoint: 'GET /api/stats',
    capability: 'metrics',
    description: 'Estatísticas gerais da loja (totais, segmentos, preços)',
    keywords: ['estatísticas', 'stats', 'totais', 'números', 'resumo', 'overview', 'dados gerais'],
    params: [],
    reliability: 99,
    avg_latency_ms: 20,
    token_cost: '~100 tokens',
  },
  {
    endpoint: 'GET /api/agent/dashboard',
    capability: 'metrics',
    description: 'Dashboard do agente com métricas pessoais',
    keywords: ['dashboard', 'painel', 'meus dados', 'perfil', 'minhas métricas', 'wallet'],
    params: [],
    reliability: 93,
    avg_latency_ms: 35,
    token_cost: '~220 tokens',
  },
  {
    endpoint: 'GET /api/sandbox/status',
    capability: 'sandbox_test',
    description: 'Sandbox runtime status, limits, and supported formats',
    keywords: ['sandbox', 'status', 'limites', 'formatos', 'runtime', 'capacidades', 'isolamento'],
    params: [],
    reliability: 100,
    avg_latency_ms: 2,
    token_cost: '~40 tokens',
  },
  {
    endpoint: 'GET /api/agent/reputation',
    capability: 'metrics',
    description: 'Agent reputation score and grade (S/A/B/C/D/F) with per-factor breakdown',
    keywords: ['reputation', 'reputação', 'score', 'grade', 'qualidade', 'confiança', 'trust'],
    params: ['agentId'],
    reliability: 95,
    avg_latency_ms: 15,
    token_cost: '~80 tokens',
  },
  {
    endpoint: 'POST /api/auth/logout',
    capability: 'purchase',
    description: 'Logout agent and clear session cookie',
    keywords: ['logout', 'sair', 'desconectar', 'encerrar sessão', 'logoff'],
    params: [],
    reliability: 100,
    avg_latency_ms: 5,
    token_cost: '~20 tokens',
  },
  {
    endpoint: 'GET /api/auth/me',
    capability: 'metrics',
    description: 'Get agent profile by address (balance, purchases, reputation)',
    keywords: ['perfil', 'profile', 'meu agente', 'dados', 'conta', 'balance', 'wallet'],
    params: ['address'],
    reliability: 95,
    avg_latency_ms: 12,
    token_cost: '~80 tokens',
  },
  {
    endpoint: 'GET /api/version',
    capability: 'metrics',
    description: 'Version and build info (version, SDK, protocol, uptime)',
    keywords: ['version', 'versão', 'build', 'release', 'changelog', 'atualizar'],
    params: [],
    reliability: 100,
    avg_latency_ms: 2,
    token_cost: '~20 tokens',
  },
  {
    endpoint: 'GET /api/referral/stats',
    capability: 'purchase',
    description: 'Agent referral statistics (total referrals, rewards earned/pending)',
    keywords: ['referral', 'indicação', 'convite', 'recompensa', 'indicou', 'ganhou'],
    params: [],
    reliability: 94,
    avg_latency_ms: 20,
    token_cost: '~70 tokens',
  },
  {
    endpoint: 'POST /api/referral/claim',
    capability: 'purchase',
    description: 'Claim referral reward for referrer and new agent',
    keywords: ['referral', 'claim', 'resgatar', 'recompensa', 'indicacao', 'bônus'],
    params: ['referrerAddress', 'newAgentAddress'],
    reliability: 90,
    avg_latency_ms: 35,
    token_cost: '~50 tokens',
  },
  {
    endpoint: 'POST /api/upload-aipkg',
    capability: 'publish',
    description: 'Upload AI package (.aipkg) to publish as product listing',
    keywords: ['upload', 'publicar', 'enviar', 'aipkg', 'pacote', 'publish', 'vender'],
    params: ['file', 'nome', 'segmento', 'descricao', 'precoSats'],
    reliability: 85,
    avg_latency_ms: 5000,
    token_cost: '~50 tokens',
  },
  {
    endpoint: 'GET /api/pulsar',
    capability: 'metrics',
    description: 'Pulsar Energy SSE stream (real-time fluctuations every 30s)',
    keywords: ['pulsar', 'energy', 'stream', 'tempo real', 'sse', 'eventos', 'flutuação'],
    params: [],
    reliability: 90,
    avg_latency_ms: 0,
    token_cost: 'ongoing (SSE)',
  },
  {
    endpoint: 'GET /api/agent/openapi-spec',
    capability: 'discovery',
    description: 'Full OpenAPI 3.0.3 spec with agent-friendly x-* extensions',
    keywords: ['openapi', 'spec', 'especificação', 'documentação', 'api spec', 'swagger', 'schema'],
    params: [],
    reliability: 99,
    avg_latency_ms: 3,
    token_cost: '~1500 tokens',
  },
]

function semanticMatch(query: string, entry: CatalogEntry): number {
  if (!query) return 1
  const q = query.toLowerCase().trim()
  const qTerms = q.split(/\s+/)
  let score = 0

  // Exact endpoint match
  if (entry.endpoint.toLowerCase().includes(q)) score += 10

  // Exact capability match
  if (entry.capability === q) score += 8

  // Keyword matches
  for (const kw of entry.keywords) {
    if (kw === q) score += 5
    else if (kw.startsWith(q)) score += 3
    else if (kw.includes(q)) score += 2
  }

  // Multi-term matching
  for (const term of qTerms) {
    for (const kw of entry.keywords) {
      if (kw.includes(term)) score += 1
    }
    if (entry.description.toLowerCase().includes(term)) score += 0.5
  }

  return score
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const q = url.searchParams.get('q') || ''
  const capabilityRaw = url.searchParams.get('capability') || ''
  const limitRaw = url.searchParams.get('limit')

  // Parse limit with bounds
  let limit = 10
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10)
    if (isNaN(parsed) || parsed < 1) {
      return agentError('/api/agent/discover', new Error('limit must be >= 1'), 400, { method: 'GET' })
    }
    limit = Math.min(parsed, 50)
  }

  // Parse capability filter
  const capabilities = capabilityRaw
    ? capabilityRaw.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
    : []

  // Score and filter entries
  let scored = catalog.map(entry => {
    const matchScore = semanticMatch(q, entry)
    return { entry, matchScore }
  })

  // Filter by capability if specified
  if (capabilities.length > 0) {
    scored = scored.filter(s => capabilities.includes(s.entry.capability))
  }

  // Sort by match score descending, then by reliability descending
  scored.sort((a, b) => b.matchScore - a.matchScore || b.entry.reliability - a.entry.reliability)

  // Apply limit
  const results = scored.slice(0, limit).map(s => ({
    endpoint: s.entry.endpoint,
    capability: s.entry.capability,
    description: s.entry.description,
    params: s.entry.params,
    reliability: s.entry.reliability,
    avg_latency_ms: s.entry.avg_latency_ms,
    token_cost: s.entry.token_cost,
  }))

  return agentResponse({ results }, {
    cache: CACHE.short,
    endpoint: '/api/agent/discover',
    method: 'GET',
  })
}
