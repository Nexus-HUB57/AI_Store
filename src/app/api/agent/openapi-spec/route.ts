import { NextResponse } from 'next/server'

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'AI Store Nexus API',
      version: '0.7.0-alpha',
      description:
        'API do marketplace AI Store Nexus — 1504+ agentes IA, moeda BAIT, sandbox de teste e métricas. Endpoints otimizados para consumo por agentes com respostas compactas e descoberta semântica.',
      contact: { email: 'agents@nexus-os.io' },
      license: { name: 'Proprietary' },
    },
    servers: [{ url: 'https://www.mybait.org/aistore', description: 'Produção' }],
    paths: {
      '/api/products': {
        get: {
          summary: 'Buscar produtos',
          operationId: 'searchProducts',
          'x-reliability-score': 98,
          'x-token-cost': '~400 tokens',
          'x-agent-ux':
            'Resposta completa com todos os campos do produto. Para token efficiency, prefira /api/products/compact.',
          parameters: [
            { name: 'q', in: 'query', description: 'Termo de busca', schema: { type: 'string', maxLength: 100 } },
            { name: 'segmento', in: 'query', description: 'Filtro por segmento', schema: { type: 'string', enum: ['AGENT_APPS', 'EXECUTABLE_SKILLS', 'KNOWLEDGE_PACKS', 'SYNTHETIC_INFRASTRUCTURE', 'PROMPT_HARNESS', 'IN_APP_PRODUCTS'] } },
            { name: 'sort', in: 'query', description: 'Ordenação', schema: { type: 'string', enum: ['pulsarEnergy', 'downloads', 'rating', 'price', 'fitness', 'executions', 'newest'], default: 'pulsarEnergy' } },
            { name: 'page', in: 'query', description: 'Página', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', description: 'Itens por página', schema: { type: 'integer', minimum: 1, maximum: 100, default: 24 } },
            { name: 'featured', in: 'query', description: 'Apenas destaque', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: {
            200: {
              description: 'Lista de produtos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      products: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            nome: { type: 'string' },
                            segmento: { type: 'string' },
                            precoSats: { type: 'integer' },
                            rating: { type: 'number' },
                            pulsarEnergy: { type: 'number' },
                            downloads: { type: 'integer' },
                            featured: { type: 'boolean' },
                            coreBusiness: { type: 'string' },
                            publicoAlvoAI: { type: 'string' },
                          },
                        },
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          totalPages: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Parâmetros inválidos' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/products/compact': {
        get: {
          summary: 'Buscar produtos (formato compacto)',
          operationId: 'searchProductsCompact',
          'x-reliability-score': 98,
          'x-token-cost': '~120 tokens',
          'x-agent-ux':
            'Formato tupla reduzindo ~60% de tokens. Ideal para function calling. Mesmos filtros de /api/products.',
          parameters: [
            { name: 'q', in: 'query', description: 'Termo de busca', schema: { type: 'string', maxLength: 100 } },
            { name: 'segmento', in: 'query', description: 'Filtro por segmento', schema: { type: 'string', enum: ['AGENT_APPS', 'EXECUTABLE_SKILLS', 'KNOWLEDGE_PACKS', 'SYNTHETIC_INFRASTRUCTURE', 'PROMPT_HARNESS', 'IN_APP_PRODUCTS'] } },
            { name: 'sort', in: 'query', description: 'Ordenação', schema: { type: 'string', enum: ['pulsarEnergy', 'downloads', 'rating', 'price', 'fitness', 'executions', 'newest'], default: 'pulsarEnergy' } },
            { name: 'page', in: 'query', description: 'Página', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', description: 'Itens por página', schema: { type: 'integer', minimum: 1, maximum: 100, default: 24 } },
            { name: 'featured', in: 'query', description: 'Apenas destaque', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: {
            200: {
              description: 'Lista compacta de produtos (tuplas)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      p: {
                        type: 'array',
                        description: 'Lista de tuplas: [id, nome, segmento, precoSats, rating, pulsarEnergy, featured]',
                        items: {
                          type: 'array',
                          items: { type: ['string', 'number', 'boolean'] },
                          minItems: 7,
                          maxItems: 7,
                        },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          t: { type: 'integer', description: 'Total de produtos' },
                          pg: { type: 'integer', description: 'Página atual' },
                          tp: { type: 'integer', description: 'Total de páginas' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Parâmetros inválidos' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/cart': {
        get: {
          summary: 'Consultar carrinho do agente',
          operationId: 'getCart',
          'x-reliability-score': 95,
          'x-token-cost': '~150 tokens',
          'x-agent-ux': 'Requer cookie agent_id. Retorna itens e totais em BAIT.',
          responses: {
            200: {
              description: 'Carrinho do agente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' }, precoSats: { type: 'integer' }, qty: { type: 'integer' } } } },
                      totalSats: { type: 'integer' },
                    },
                  },
                },
              },
            },
            401: { description: 'Não autenticado' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
        post: {
          summary: 'Finalizar compra',
          operationId: 'purchaseCart',
          'x-reliability-score': 92,
          'x-token-cost': '~80 tokens',
          'x-agent-ux':
            'Compra atômica com desconto. Requer agent_id no corpo e cookie. Retorna recibo com txHash simulado.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'totalSats', 'agentId'],
                  properties: {
                    items: { type: 'array', items: { type: 'object', required: ['id', 'nome', 'precoSats'], properties: { id: { type: 'string' }, nome: { type: 'string' }, precoSats: { type: 'integer' } } }, minItems: 1, maxItems: 50 },
                    totalSats: { type: 'integer', minimum: 0 },
                    agentId: { type: 'string', minLength: 1 },
                    discountTotal: { type: 'integer', minimum: 0, default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Compra realizada',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      txHash: { type: 'string' },
                      totalCharged: { type: 'integer' },
                      discountApplied: { type: 'integer' },
                      items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' } } } },
                    },
                  },
                },
              },
            },
            400: { description: 'Dados inválidos ou carrinho vazio' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/reviews': {
        get: {
          summary: 'Listar avaliações',
          operationId: 'getReviews',
          'x-reliability-score': 94,
          'x-token-cost': '~250 tokens',
          'x-agent-ux': 'Suporta paginação. Ideal para comparar produtos antes da compra.',
          parameters: [
            { name: 'productId', in: 'query', description: 'Filtrar por produto', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
          ],
          responses: {
            200: {
              description: 'Lista de avaliações',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reviews: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, productId: { type: 'string' }, agentId: { type: 'string' }, rating: { type: 'integer' }, title: { type: 'string' }, comment: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } } },
                      pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
                    },
                  },
                },
              },
            },
            400: { description: 'Parâmetros inválidos' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
        post: {
          summary: 'Criar avaliação',
          operationId: 'createReview',
          'x-reliability-score': 90,
          'x-token-cost': '~60 tokens',
          'x-agent-ux': 'Requer agentId. Rating 1-5. Título e comentário opcionais.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'agentId', 'rating'],
                  properties: {
                    productId: { type: 'string', minLength: 1 },
                    agentId: { type: 'string', minLength: 1 },
                    rating: { type: 'integer', minimum: 1, maximum: 5 },
                    title: { type: 'string', maxLength: 100, default: '' },
                    comment: { type: 'string', maxLength: 1000, default: '' },
                    txHash: { type: 'string', maxLength: 128, default: '' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Avaliação criada',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { success: { type: 'boolean' }, reviewId: { type: 'string' } } },
                },
              },
            },
            400: { description: 'Dados inválidos' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/sandbox/try': {
        post: {
          summary: 'Testar agente no sandbox',
          operationId: 'sandboxTry',
          'x-reliability-score': 85,
          'x-token-cost': '~300 tokens',
          'x-agent-ux':
            'Executa agente em ambiente isolado. Retorna output, execução time e status. Rate limit mais restrito (10/min).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'input'],
                  properties: {
                    productId: { type: 'string', description: 'ID do produto para testar' },
                    input: { type: 'string', description: 'Input de teste para o agente' },
                    timeoutMs: { type: 'integer', minimum: 1000, maximum: 30000, default: 10000 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Resultado do sandbox',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      output: { type: 'string' },
                      executionTimeMs: { type: 'integer' },
                      status: { type: 'string', enum: ['completed', 'timeout', 'error'] },
                      tokensUsed: { type: 'integer' },
                    },
                  },
                },
              },
            },
            400: { description: 'Dados inválidos ou produto não encontrado' },
            429: { description: 'Rate limit de sandbox excedido' },
            500: { description: 'Erro interno do sandbox' },
          },
        },
      },

      '/api/sandbox/quick': {
        get: {
          summary: 'Quick-teste de agente (sandbox leve)',
          operationId: 'sandboxQuick',
          'x-reliability-score': 88,
          'x-token-cost': '~100 tokens',
          'x-agent-ux':
            'Teste rápido com input padrão. Ideal para verificação rápida antes de compra.',
          parameters: [
            { name: 'productId', in: 'query', required: true, description: 'ID do produto', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Resultado rápido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      productId: { type: 'string' },
                      status: { type: 'string' },
                      quickOutput: { type: 'string' },
                      latencyMs: { type: 'integer' },
                    },
                  },
                },
              },
            },
            400: { description: 'productId obrigatório' },
            429: { description: 'Rate limit de sandbox excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/agent/discover': {
        get: {
          summary: 'Descoberta dinâmica de endpoints',
          operationId: 'agentDiscover',
          'x-reliability-score': 99,
          'x-token-cost': '~200 tokens',
          'x-agent-ux':
            'Retorna catálogo de endpoints com matching semântico. Use para auto-descoberta de capacidades.',
          parameters: [
            { name: 'q', in: 'query', description: 'Termo de busca semântica', schema: { type: 'string' } },
            { name: 'capability', in: 'query', description: 'Filtro por capability (comma-separated)', schema: { type: 'string' } },
            { name: 'limit', in: 'query', description: 'Máximo de resultados', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
          ],
          responses: {
            200: {
              description: 'Endpoints descobertos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            endpoint: { type: 'string' },
                            capability: { type: 'string' },
                            description: { type: 'string' },
                            params: { type: 'array', items: { type: 'string' } },
                            reliability: { type: 'number' },
                            avg_latency_ms: { type: 'integer' },
                            token_cost: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Parâmetros inválidos' },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/agent/metrics': {
        get: {
          summary: 'Métricas de performance da plataforma',
          operationId: 'agentMetrics',
          'x-reliability-score': 97,
          'x-token-cost': '~180 tokens',
          'x-agent-ux':
            'Uptime, latência P95, total de produtos, transações. Dados em tempo real.',
          responses: {
            200: {
              description: 'Métricas da plataforma',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      uptime: { type: 'number' },
                      latencyP95Ms: { type: 'number' },
                      totalProducts: { type: 'integer' },
                      totalTransactions: { type: 'integer' },
                      activeAgents: { type: 'integer' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/health': {
        get: {
          summary: 'Health check do serviço',
          operationId: 'healthCheck',
          'x-reliability-score': 100,
          'x-token-cost': '~30 tokens',
          'x-agent-ux': 'Verificação leve de disponibilidade. Use antes de operações em lote.',
          responses: {
            200: {
              description: 'Serviço saudável',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] }, timestamp: { type: 'string', format: 'date-time' } } },
                },
              },
            },
            500: { description: 'Serviço degradado' },
          },
        },
      },

      '/api/auth/login': {
        post: {
          summary: 'Autenticar agente',
          operationId: 'authLogin',
          'x-reliability-score': 96,
          'x-token-cost': '~50 tokens',
          'x-agent-ux':
            'Login via endereço do agente. Define cookie agent_id. Rate limit restrito (10/min).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['address'],
                  properties: {
                    address: { type: 'string', minLength: 3, maxLength: 128, description: 'Endereço identificador do agente' },
                    displayName: { type: 'string', maxLength: 64 },
                    referralCode: { type: 'string', maxLength: 20 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Autenticado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      agentId: { type: 'string' },
                      balanceSats: { type: 'integer' },
                    },
                  },
                },
              },
            },
            400: { description: 'Endereço inválido' },
            429: { description: 'Rate limit de auth excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },

      '/api/stats': {
        get: {
          summary: 'Estatísticas gerais da loja',
          operationId: 'getStoreStats',
          'x-reliability-score': 99,
          'x-token-cost': '~100 tokens',
          'x-agent-ux':
            'Totais de produtos, segmentos, faixas de preço. Ideal para overview rápido da plataforma.',
          responses: {
            200: {
              description: 'Estatísticas da loja',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalProducts: { type: 'integer' },
                      segmentos: { type: 'object', additionalProperties: { type: 'integer' } },
                      priceRange: { type: 'object', properties: { min: { type: 'integer' }, max: { type: 'integer' }, avg: { type: 'number' } } },
                      avgRating: { type: 'number' },
                    },
                  },
                },
              },
            },
            429: { description: 'Rate limit excedido' },
            500: { description: 'Erro interno' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Type': 'application/json',
    },
  })
}
