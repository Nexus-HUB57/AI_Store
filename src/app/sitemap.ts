import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.mybait.org/aistore'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/publish`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...productUrls,
  ]
}