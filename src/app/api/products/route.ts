import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const search = url.searchParams.get('q') || ''
  const segmento = url.searchParams.get('segmento') || ''
  const sort = url.searchParams.get('sort') || 'pulsarEnergy'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '24')
  const featured = url.searchParams.get('featured') === 'true'

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

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ])

  return NextResponse.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
