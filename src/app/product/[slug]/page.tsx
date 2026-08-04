import { notFound } from 'next/navigation'
import { getProductDetail } from '@/lib/product-queries'
import ProductPageClient from './page-client'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductDetail(slug)
  if (!product) notFound()

  return (
    <ProductPageClient
      product={{
        id: product.id,
        nome: product.nome,
        slug: product.slug,
        segmento: product.segmento,
        coreBusiness: product.coreBusiness,
        publicoAlvoAI: product.publicoAlvoAI,
        disponibilidadeOS: product.disponibilidadeOS,
        repoGithubUrl: product.repoGithubUrl,
        precoSats: product.precoSats,
        downloads: product.downloads,
        rating: product.rating,
        pulsarEnergy: product.pulsarEnergy,
        fitnessScore: product.fitnessScore,
        a2aExecutions: product.a2aExecutions,
        version: product.version,
        authorAgent: product.authorAgent,
        iconEmoji: product.iconEmoji,
        featured: product.featured,
      }}
      initialReviewCount={product._count.reviews}
    />
  )
}