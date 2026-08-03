import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { reviewSchema, validate } from '@/lib/schemas'
import { agentErrorResponse } from '@/lib/error-resolver'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

  if (!productId) {
    return agentErrorResponse('/api/reviews', new Error('productId obrigatório'), 400)
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
    const raw = await req.json()
    const parsed = validate(reviewSchema, raw)
    if (!parsed.success) {
      return agentErrorResponse('/api/reviews', new Error(parsed.error.message), 400)
    }
    const { productId, agentId, rating, title, comment, txHash } = parsed.data

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
  } catch (e) {
    return agentErrorResponse('/api/reviews', e, 500)
  }
}
