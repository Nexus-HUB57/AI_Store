import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { productsQuerySchema } from '@/lib/schemas'
import { trackSearch } from '@/lib/event-tracker'
import {
  fetchProductsFromDaemon,
  mapDaemonCategoryToSegment,
  type DaemonProduct,
} from '@/lib/daemon-marketplace-bridge'

// ─── Category mapping: AI Store segmento → daemon category ───
const SEGMENT_TO_DAEMON_CATEGORY: Record<string, string> = {
  SYNTHETIC_INFRASTRUCTURE: 'ml_inference',
  AGENT_APPS: 'smart_contract',
  IN_APP_PRODUCTS: 'data_processing',
  EXECUTABLE_SKILLS: 'block_validation',
  PROMPT_HARNESS: 'market_analysis',
  KNOWLEDGE_PACKS: 'oracle_data',
}

// ─── Sort mapping: AI Store sort → daemon sort_by ───
const SORT_TO_DAEMON: Record<string, { sort_by: string; sort_order: string }> = {
  pulsarEnergy: { sort_by: 'rating', sort_order: 'desc' },
  pulsar: { sort_by: 'rating', sort_order: 'desc' },
  downloads: { sort_by: 'calls', sort_order: 'desc' },
  rating: { sort_by: 'rating', sort_order: 'desc' },
  price: { sort_by: 'price', sort_order: 'asc' },
  fitness: { sort_by: 'calls', sort_order: 'desc' },
  executions: { sort_by: 'calls', sort_order: 'desc' },
  newest: { sort_by: 'created_at', sort_order: 'desc' },
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const rawQuery = Object.fromEntries(url.searchParams.entries())
    const { q: search = '', segmento = '', sort = 'pulsarEnergy', page = 1, limit = 24, featured, source } = productsQuerySchema.parse(rawQuery)

    // Track search analytics
    if (search) {
      trackSearch(search, 0)
    }

    // ─── Source routing: 'daemon' forces daemon, 'local' forces local DB ───
    // Default: try daemon first, fall back to local DB
    const useDaemon = source === 'daemon' || (!source && !featured)

    if (useDaemon) {
      try {
        const daemonSort = SORT_TO_DAEMON[sort] || SORT_TO_DAEMON.pulsarEnergy
        const daemonCategory = segmento ? SEGMENT_TO_DAEMON_CATEGORY[segmento] : undefined

        const result = await fetchProductsFromDaemon({
          page: Number(page),
          limit: Number(limit),
          category: daemonCategory,
          q: search || undefined,
          sort_by: daemonSort.sort_by,
          sort_order: daemonSort.sort_order,
        })

        // Map daemon products to AI Store product format
        const products = result.products.map(mapDaemonProductToStore)

        if (search) trackSearch(search, result.pagination.total)

        return NextResponse.json({
          products,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.total_pages,
          },
          source: 'daemon',
          daemonCategories: result.categories,
          totalDaemonProducts: result.pagination.total,
        })
      } catch (daemonError) {
        console.warn('[products] Daemon unavailable, falling back to local DB:', daemonError)
        // Fall through to local DB
      }
    }

    // ─── Local DB fallback ───
    const where: Record<string, unknown> = {}

    if (search) {
      const searchLower = search.toLowerCase()
      where.OR = [
        { nome: { contains: searchLower } },
        { coreBusiness: { contains: searchLower } },
        { publicoAlvoAI: { contains: searchLower } },
      ]
    }

    if (segmento) {
      where.segmento = segmento
    }

    if (featured) {
      where.featured = true
    }

    if (source) {
      where.source = source
    }

    const orderBy: Record<string, string> = {}
    if (sort === 'pulsarEnergy' || sort === 'pulsar') orderBy.pulsarEnergy = 'desc'
    else if (sort === 'downloads') orderBy.downloads = 'desc'
    else if (sort === 'rating') orderBy.rating = 'desc'
    else if (sort === 'price') orderBy.precoSats = 'asc'
    else if (sort === 'fitness') orderBy.fitnessScore = 'desc'
    else if (sort === 'executions') orderBy.a2aExecutions = 'desc'
    else if (sort === 'newest') orderBy.createdAt = 'desc'
    else orderBy.pulsarEnergy = 'desc'

    const [products, total] = await Promise.all([
      db.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      db.product.count({ where }),
    ])

    if (search) trackSearch(search, total)

    return NextResponse.json({
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      source: 'local',
    })
  } catch (error) {
    console.error('products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Map daemon product to AI Store product format ───
const CATEGORY_EMOJI: Record<string, string> = {
  ml_inference: '🤖',
  block_validation: '🔒',
  oracle_data: '📊',
  market_analysis: '📈',
  data_processing: '⚙️',
  smart_contract: '📜',
}

function mapDaemonProductToStore(p: DaemonProduct): Record<string, unknown> {
  const segmento = mapDaemonCategoryToSegment(p.category)
  return {
    id: p.id,
    nome: p.name,
    slug: p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + String(p.id).slice(-6),
    segmento,
    coreBusiness: p.description,
    precoSats: p.price_sats,
    rating: p.rating,
    downloads: p.calls,
    authorAgent: p.provider,
    iconEmoji: CATEGORY_EMOJI[p.category] || '📦',
    source: 'baitcoin_daemon',
    repoGithubUrl: '',
    // Extra daemon-specific fields
    priceBait: p.price_bait,
    revenueSats: p.revenue_sats,
    daemonCategory: p.category,
    pulsarEnergy: Math.min(100, 50 + p.rating * 10 + (p.calls > 100 ? 20 : 0)),
  }
}
