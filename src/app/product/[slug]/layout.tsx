import { db } from '@/lib/db'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllProductSlugs, getProductBySlug } from '@/lib/product-queries'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ai-store.nexus-os.io'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

/** Generate static paths for all products (ISR: revalidate every 3600s) */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

/** ISR: revalidate product pages every hour */
export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) return {}

  const baitPrice = (product.precoSats / 100).toFixed(0)
  const segmentLabel = product.segmento.replace(/_/g, ' ')

  return {
    title: `${product.nome} — ${baitPrice} BAIT | AI Store`,
    description: `${product.coreBusiness} · ${segmentLabel} · ${product.downloads} downloads · Rating ${product.rating.toFixed(1)} · Pulsar Energy ${product.pulsarEnergy.toFixed(1)}%`,
    openGraph: {
      title: `${product.nome} — ${baitPrice} BAIT`,
      description: product.coreBusiness,
      url: `${BASE_URL}/product/${slug}`,
      type: 'article',
      images: [{ url: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg', width: 512, height: 512, alt: product.nome }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.nome} — ${baitPrice} BAIT`,
      description: `${product.coreBusiness} · ${segmentLabel}`,
    },
    alternates: { canonical: `/product/${slug}` },
  }
}

export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params
  const exists = await getProductBySlug(slug)
  if (!exists) notFound()

  return <>{children}</>
}
