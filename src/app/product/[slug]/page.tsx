'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Zap, Download, Star, Activity, ExternalLink, Cpu, Shield,
  Package, ShoppingCart, ArrowLeft, ThumbsUp, Clock,
  Layers, TrendingUp,
} from 'lucide-react'
import { StarRating } from '@/components/product/star-rating'
import { ReviewForm } from '@/components/product/review-form'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'

const SEGMENT_COLORS: Record<string, string> = {
  AGENT_APPS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EXECUTABLE_SKILLS: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  KNOWLEDGE_PACKS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  SYNTHETIC_INFRASTRUCTURE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  PROMPT_HARNESS: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  IN_APP_PRODUCTS: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

interface Product {
  id: string; nome: string; slug: string; segmento: string
  coreBusiness: string; publicoAlvoAI: string; disponibilidadeOS: string
  repoGithubUrl: string; precoSats: number; downloads: number; rating: number
  pulsarEnergy: number; fitnessScore: number; a2aExecutions: number
  version: string; authorAgent: string; iconEmoji: string; featured: boolean
}

interface Review {
  id: string; rating: number; title: string; comment: string
  txHash: string; helpful: number; createdAt: string
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const { connected } = usePulsarSSE()

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(slug)}&limit=1`)
      const data = await res.json()
      if (data.products?.length > 0) {
        setProduct(data.products[0])
      }
    } catch {}
  }, [slug])

  const fetchReviews = useCallback(async () => {
    if (!product) return
    try {
      const res = await fetch(`/api/reviews?productId=${product.id}`)
      const data = await res.json()
      setReviews(data.reviews || [])
      setTotalReviews(data.total || 0)
    } catch {}
  }, [product])

  useEffect(() => { fetchProduct() }, [fetchProduct])
  useEffect(() => { if (product) { setLoading(false); fetchReviews() } }, [product, fetchReviews])

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const inCart = items.some((i) => i.id === product.id)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <span className="text-sm text-zinc-500 font-mono">/product/{product.slug}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Product Hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Left: Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5">
                {product.iconEmoji || '📦'}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight">{product.nome}</h1>
                <p className="text-sm text-zinc-400 font-mono mt-1">
                  v{product.version} • {product.authorAgent}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`border ${SEGMENT_COLORS[product.segmento] || ''}`}>
                    {product.segmento.replace(/_/g, ' ')}
                  </Badge>
                  {connected && (
                    <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      Pulsar Live
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">{product.coreBusiness}</p>

            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Público-Alvo AI</h3>
              <p className="text-sm text-zinc-300">{product.publicoAlvoAI}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Plataformas</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.disponibilidadeOS.split(', ').map((os) => (
                  <Badge key={os} variant="secondary" className="text-xs bg-zinc-800 text-zinc-300">{os}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Purchase Card */}
          <div className="space-y-4">
            <Card className="border-white/10 bg-zinc-900/60">
              <CardContent className="p-6 space-y-5">
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-emerald-400">{product.precoSats.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">sats • b&apos;AI&apos;tcoin</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatBox icon={<Zap className="w-4 h-4 text-amber-400" />} label="Pulsar" value={`${product.pulsarEnergy.toFixed(1)}%`} />
                  <StatBox icon={<Activity className="w-4 h-4 text-emerald-400" />} label="Fitness" value={`${product.fitnessScore.toFixed(1)}%`} />
                  <StatBox icon={<Download className="w-4 h-4 text-cyan-400" />} label="Downloads" value={formatNumber(product.downloads)} />
                  <StatBox icon={<Cpu className="w-4 h-4 text-violet-400" />} label="A2A Exec" value={formatNumber(product.a2aExecutions)} />
                </div>

                <Button
                  className={`w-full ${inCart ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500'} text-white`}
                  onClick={() => {
                    addItem({
                      id: product.id, nome: product.nome, precoSats: product.precoSats,
                      iconEmoji: product.iconEmoji, segmento: product.segmento,
                      version: product.version, authorAgent: product.authorAgent,
                    })
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {inCart ? 'Já no Carrinho' : 'Adicionar ao Carrinho'}
                </Button>

                <Button variant="outline" className="w-full border-zinc-700" asChild>
                  <a href={product.repoGithubUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Repositório
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="bg-white/5" />

        {/* Reviews Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Avaliações</h2>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-mono font-bold">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-zinc-500">({totalReviews})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Review Form */}
            <div className="lg:col-span-1">
              <Card className="border-white/10 bg-zinc-900/40">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-4">Escrever Review</h3>
                  <ReviewForm productId={product.id} onSubmitted={fetchReviews} />
                </CardContent>
              </Card>
            </div>

            {/* Review List */}
            <div className="lg:col-span-2 space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Star className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm">Nenhuma avaliação ainda</p>
                  <p className="text-xs text-zinc-600 mt-1">Seja o primeiro a avaliar</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="border-white/10 bg-zinc-900/40">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {review.txHash.slice(-2).toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-400 font-mono">
                            Agente {review.txHash.slice(7, 13)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating value={review.rating} readonly />
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      {review.title && <h4 className="text-sm font-medium mb-1">{review.title}</h4>}
                      {review.comment && <p className="text-xs text-zinc-400 leading-relaxed">{review.comment}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/80">
      {icon}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
        <p className="text-sm font-semibold font-mono text-zinc-200">{value}</p>
      </div>
    </div>
  )
}