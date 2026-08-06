import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { productsQuerySchema } from '@/lib/schemas'
import { trackSearch } from '@/lib/event-tracker'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const rawQuery = Object.fromEntries(url.searchParams.entries())
    const { q: search = '', segmento = '', sort = 'pulsarEnergy', page = 1, limit = 24, featured } = productsQuerySchema.parse(rawQuery)

    // Track search analytics
    if (search) {
      trackSearch(search, 0) // count updated after query
    }

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
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Update search tracking with actual result count
    if (search) {
      trackSearch(search, total)
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
