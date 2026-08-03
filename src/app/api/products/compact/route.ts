import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validate, productsQuerySchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const rawQuery = Object.fromEntries(url.searchParams.entries())

  const parsed = validate(productsQuerySchema, rawQuery)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message, details: parsed.error.details }, { status: 400 })
  }

  const { q: search = '', segmento = '', sort = 'pulsarEnergy', page = 1, limit = 24, featured } = parsed.data

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { coreBusiness: { contains: search } },
      { publicoAlvoAI: { contains: search } },
    ]
  }

  if (segmento) {
    where.segmento = segmento
  }

  if (featured) {
    where.featured = true
  }

  const orderBy: Record<string, string> = {}
  if (sort === 'pulsarEnergy') orderBy.pulsarEnergy = 'desc'
  else if (sort === 'downloads') orderBy.downloads = 'desc'
  else if (sort === 'rating') orderBy.rating = 'desc'
  else if (sort === 'price') orderBy.precoSats = 'asc'
  else if (sort === 'fitness') orderBy.fitnessScore = 'desc'
  else if (sort === 'executions') orderBy.a2aExecutions = 'desc'
  else if (sort === 'newest') orderBy.createdAt = 'desc'
  else orderBy.pulsarEnergy = 'desc'

  try {
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Compact tuple format: [id, nome, segmento, precoSats, rating, pulsarEnergy, featured]
    const p = products.map(
      (prod): [string, string, string, number, number, number, boolean] => [
        prod.id,
        prod.nome,
        prod.segmento,
        prod.precoSats,
        prod.rating,
        prod.pulsarEnergy,
        prod.featured,
      ]
    )

    return NextResponse.json({
      p,
      meta: {
        t: total,
        pg: page,
        tp: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[compact] DB error:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar produtos' }, { status: 500 })
  }
}
