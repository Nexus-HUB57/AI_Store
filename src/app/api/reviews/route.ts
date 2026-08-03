import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

  if (!productId) {
    return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 })
  }

  const where = { productId }

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.review.count({ where }),
  ])

  const avgRating = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  return NextResponse.json({ reviews, total, avgRating, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  try {
    const { productId, agentId, rating, title, comment, txHash } = await req.json()

    if (!productId || !agentId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const review = await db.review.create({
      data: {
        rating,
        title: title || '',
        comment: comment || '',
        productId,
        agentId,
        txHash: txHash || '',
      },
    })

    const allReviews = await db.review.findMany({ where: { productId } })
    const avg = allReviews.length > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      : 0

    await db.product.update({
      where: { id: productId },
      data: { rating: Math.round(avg * 10) / 10 },
    })

    return NextResponse.json({ review, newAvgRating: Math.round(avg * 10) / 10 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar review' }, { status: 500 })
  }
}
