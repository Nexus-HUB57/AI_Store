/**
 * Shared product query helpers — used by product/[slug] layout and generateStaticParams.
 * Centralizes DB access for product data.
 */
import { db } from '@/lib/db'

/** Get all product slugs for static generation */
export async function getAllProductSlugs(): Promise<string[]> {
  const products = await db.product.findMany({
    select: { slug: true },
    orderBy: { pulsarEnergy: 'desc' },
  })
  return products.map((p) => p.slug)
}

/** Get a single product by slug */
export async function getProductBySlug(slug: string) {
  return db.product.findUnique({ where: { slug } })
}

/** Get product with stats for the product detail page */
export async function getProductDetail(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      _count: { select: { reviews: true } },
    },
  })
}
