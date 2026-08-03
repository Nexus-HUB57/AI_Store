'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Zap,
  Download,
  Star,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cpu,
  Shield,
  TrendingUp,
  Package,
  Sparkles,
  Layers,
  ShoppingCart,
  Plus,
  Minus,
  Wifi,
  WifiOff,
  Radio,
  Gift,
  X,
} from 'lucide-react'
import { CartPanel } from '@/components/store/cart-panel'
import { UploadAipkgDialog } from '@/components/store/upload-aipkg-dialog'
import { LoginDialog } from '@/components/auth/login-dialog'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ReviewForm } from '@/components/product/review-form'
import { StarRating } from '@/components/product/star-rating'
import {
  Eye, Users, Coins, Clock, BarChart3, Copy, Check, Send, ArrowRight,
} from 'lucide-react'

interface Product {
  id: string
  nome: string
  slug: string
  segmento: string
  coreBusiness: string
  publicoAlvoAI: string
  disponibilidadeOS: string
  repoGithubUrl: string
  precoSats: number
  downloads: number
  rating: number
  pulsarEnergy: number
  fitnessScore: number
  a2aExecutions: number
  version: string
  authorAgent: string
  iconEmoji: string
  featured: boolean
}

interface Category {
  key: string
  nome: string
  icon: string
  count: number
}

interface Stats {
  total: number
  categories: Category[]
  avgPulsarEnergy: number
  totalDownloads: number
  totalExecutions: number
  featuredCount: number
}

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

const BAIT_PER_SAT = 100
function toBait(sats: number): string {
  return (sats / BAIT_PER_SAT).toFixed(0)
}
function baitLabel(sats: number): string {
  const b = sats / BAIT_PER_SAT
  return b.toFixed(0) + ' BAIT'
}

function PulsarBar({ value, productId, liveUpdates }: { value: number; productId: string; liveUpdates: Record<string, number> }) {
  const liveValue = liveUpdates[productId] ?? value
  const color = liveValue >= 90 ? 'bg-emerald-500' : liveValue >= 70 ? 'bg-amber-500' : 'bg-rose-500'
  const isLive = productId in liveUpdates
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color} ${isLive ? 'shadow-sm' : ''}`}
          style={{ width: `${liveValue}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-10 text-right ${isLive ? 'text-emerald-400' : 'text-muted-foreground'}`}>
        {liveValue.toFixed(0)}%
        {isLive && <span className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </span>
    </div>
  )
}

function getDiscountBadge(purchaseCount: number, idx: number): { label: string; color: string } | null {
  const pos = purchaseCount + idx
  if (pos < 3) return { label: 'GRÁTIS', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
  if (pos < 50) return { label: '-50%', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
  return null
}

function ProductCard({ product, onClick, discountBadge }: { product: Product; onClick: () => void; discountBadge?: { label: string; color: string } | null }) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const inCart = items.some((i) => i.id === product.id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({
      id: product.id,
      nome: product.nome,
      precoSats: product.precoSats,
      iconEmoji: product.iconEmoji,
      segmento: product.segmento,
      version: product.version,
      authorAgent: product.authorAgent,
    })
  }

  return (
    <Card
      className="group cursor-pointer border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent hover:border-white/20 hover:from-white/[0.08] transition-all duration-300 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5">
              {product.iconEmoji || '📦'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
                {product.nome}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                v{product.version} • {product.authorAgent}
              </p>
            </div>
          </div>
          {product.featured && (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {product.coreBusiness}
        </p>

        <Badge
          variant="outline"
          className={`text-[10px] mb-3 border ${SEGMENT_COLORS[product.segmento] || ''}`}
        >
          {product.segmento.replace(/_/g, ' ')}
        </Badge>

        <div className="space-y-2">
          <PulsarBar value={product.pulsarEnergy} productId={product.id} liveUpdates={{}} />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" /> {formatNumber(product.downloads)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" /> {product.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" /> {formatNumber(product.a2aExecutions)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              {discountBadge ? (
                <>
                  <span className="text-[10px] font-mono text-emerald-400 line-through text-zinc-500">
                    {toBait(product.precoSats)} BAIT
                  </span>
                  <Badge className={`text-[8px] px-1 py-0 border ${discountBadge.color}`}>
                    {discountBadge.label}
                  </Badge>
                  {discountBadge.label === 'GRÁTIS' ? (
                    <span className="text-xs font-mono text-emerald-400">0 BAIT</span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400">
                      {toBait(Math.floor(product.precoSats / 2))} BAIT
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-mono text-emerald-400">
                  {toBait(product.precoSats)} BAIT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className={`h-6 text-xs px-2 transition-all ${
                  inCart
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
                onClick={handleAddToCart}
              >
                {inCart ? <ShoppingCart className="w-3 h-3 mr-0.5" /> : <Plus className="w-3 h-3 mr-0.5" />}
                {inCart ? 'No Carrinho' : 'Carrinho'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                A2A
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Review List                                                        */
/* ------------------------------------------------------------------ */

interface ReviewData {
  id: string; rating: number; title: string; comment: string; agentId: string
  createdAt: string; agent?: { displayName: string; address: string }
}

function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}&page=${page}&limit=5`)
      .then(r => r.json()).then(d => {
        setReviews(d.reviews || [])
        setAvgRating(d.avgRating || 0)
        setTotal(d.total || 0)
      })
  }, [productId, page, refreshKey])

  const stars: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviews) { if (stars[r.rating] !== undefined) stars[r.rating]++ }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Avaliações ({total})
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-amber-400">{avgRating}</span>
          <StarRating value={Math.round(avgRating)} size="sm" readonly />
        </div>
      </div>

      <Separator className="bg-white/5" />

      <ReviewForm productId={productId} onSubmitted={() => setRefreshKey(k => k + 1)} />

      <div className="space-y-3">
        {reviews.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">Nenhuma avaliação ainda. Seja o primeiro!</p>
        )}
        {reviews.map(r => (
          <div key={r.id} className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 flex items-center justify-center text-[10px] font-bold">
                  {(r.agent?.displayName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-zinc-300">{r.agent?.displayName || 'Agente Anônimo'}</span>
                <StarRating value={r.rating} size="sm" readonly />
              </div>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(r.createdAt)}</span>
            </div>
            {r.title && <p className="text-xs font-semibold text-zinc-300">{r.title}</p>}
            {r.comment && <p className="text-[11px] text-zinc-400 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>

      {total > 5 && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="text-xs text-zinc-500" onClick={() => setPage(p => Math.min(p + 1, Math.ceil(total / 5)))}>
            Ver mais avaliações
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Product Detail (Enhanced)                                          */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return mins + 'min atrás'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + 'h atrás'
  return Math.floor(hours / 24) + 'd atrás'
}

function ProductDetail({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const { agent, isAuthenticated } = useAuthStore()
  const inCart = product ? items.some((i) => i.id === product.id) : false
  const [detailTab, setDetailTab] = useState('info')

  if (!product) return null

  const pc = isAuthenticated ? (agent?.purchaseCount || 0) : 999
  const discount = getDiscountBadge(pc, 0)
  const chargedPrice = discount?.label === 'GRÁTIS' ? 0 : discount?.label === '-50%' ? Math.floor(product.precoSats / 2) : product.precoSats

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Product Info */}
          <div className="flex-1 p-5 overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 shrink-0">
                  {product.iconEmoji}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg leading-tight">{product.nome}</DialogTitle>
                  <p className="text-sm text-zinc-400 font-mono mt-0.5">v{product.version} • {product.authorAgent}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-[10px] border ${SEGMENT_COLORS[product.segmento] || ''}`}>
                      {product.segmento.replace(/_/g, ' ')}
                    </Badge>
                    {product.featured && (
                      <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30"><Sparkles className="w-3 h-3 mr-0.5" />Destaque</Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
              <TabsList className="bg-zinc-900/80 border border-white/5">
                <TabsTrigger value="info" className="text-xs data-[state=active]:bg-zinc-800">Info</TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs data-[state=active]:bg-zinc-800">Avaliações</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <p className="text-sm text-zinc-300 leading-relaxed">{product.coreBusiness}</p>

                {/* Pricing with discount */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Preço</p>
                      <div className="flex items-center gap-2 mt-1">
                        {discount ? (
                          <>
                            <span className="text-sm font-mono text-zinc-500 line-through">{toBait(product.precoSats)} BAIT</span>
                            <Badge className={`text-[10px] border ${discount.color}`}>{discount.label}</Badge>
                            <span className="text-lg font-bold font-mono text-emerald-400">
                              {chargedPrice === 0 ? 'GRÁTIS' : toBait(chargedPrice) + ' BAIT'}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold font-mono text-emerald-400">{toBait(product.precoSats)} BAIT</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase">Rating</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-semibold">{product.rating}/5.0</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Zap className="w-4 h-4 text-amber-400" />} label="Pulsar Energy" value={`${product.pulsarEnergy.toFixed(1)}%`} />
                  <StatCard icon={<Activity className="w-4 h-4 text-emerald-400" />} label="Fitness Score" value={`${product.fitnessScore.toFixed(1)}%`} />
                  <StatCard icon={<Download className="w-4 h-4 text-cyan-400" />} label="Downloads" value={formatNumber(product.downloads)} />
                  <StatCard icon={<Cpu className="w-4 h-4 text-violet-400" />} label="Execuções A2A" value={formatNumber(product.a2aExecutions)} />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Público-Alvo AI</h4>
                  <p className="text-sm text-zinc-300">{product.publicoAlvoAI}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Plataformas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {product.disponibilidadeOS.split(', ').map((os) => (
                      <Badge key={os} variant="secondary" className="text-xs bg-zinc-800 text-zinc-300">{os}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white"
                    onClick={() => {
                      addItem({ id: product.id, nome: product.nome, precoSats: product.precoSats, iconEmoji: product.iconEmoji, segmento: product.segmento, version: product.version, authorAgent: product.authorAgent })
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {inCart ? 'Já no Carrinho' : discount?.label === 'GRÁTIS' ? 'Resgatar Grátis' : 'Adicionar ao Carrinho'}
                  </Button>
                  <Button variant="outline" className="border-zinc-700" asChild>
                    <a href={product.repoGithubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <ReviewList productId={product.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/80">
      {icon}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
        <p className="text-sm font-semibold text-zinc-200 font-mono">{value}</p>
      </div>
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [segmento, setSegmento] = useState('')
  const [sort, setSort] = useState('pulsarEnergy')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showFeatured, setShowFeatured] = useState(true)
  const [liveUpdates, setLiveUpdates] = useState<Record<string, number>>({})
  const limit = 24

  const { connected, updates } = usePulsarSSE()
  const cartCount = useCartStore((s) => s.items.length)
  const { agent, isAuthenticated, isNewUser } = useAuthStore()
  const [showBonusBanner, setShowBonusBanner] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  // Listen for dashboard open event from LoginDialog
  useEffect(() => {
    const handler = () => setDashboardOpen(true)
    window.addEventListener('open-dashboard', handler)
    return () => window.removeEventListener('open-dashboard', handler)
  }, [])

  // Show bonus banner for new users
  useEffect(() => {
    if (isNewUser) {
      setShowBonusBanner(true)
      const t = setTimeout(() => setShowBonusBanner(false), 8000)
      return () => clearTimeout(t)
    }
  }, [isNewUser])

  // Show discount banner for authenticated users with remaining free/discounted purchases
  const freeRemaining = isAuthenticated && agent ? Math.max(0, 3 - agent.purchaseCount) : 0
  const halfRemaining = isAuthenticated && agent ? Math.max(0, 50 - agent.purchaseCount) - freeRemaining : 0
  const showPromoBanner = isAuthenticated && (freeRemaining > 0 || halfRemaining > 0)

  // Process pulsar SSE updates
  useEffect(() => {
    if (updates.length === 0) return
    const newMap: Record<string, number> = {}
    for (const u of updates.slice(0, 10)) {
      newMap[u.productId] = u.pulsarEnergy
    }
    setLiveUpdates((prev) => {
      const merged = { ...prev, ...newMap }
      // Keep only last 20 entries
      const keys = Object.keys(merged)
      if (keys.length > 20) {
        const trimmed: Record<string, number> = {}
        for (const k of keys.slice(-20)) {
          trimmed[k] = merged[k]
        }
        return trimmed
      }
      return merged
    })
  }, [updates])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Failed to fetch stats', e)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort,
      })
      if (search) params.set('q', search)
      if (segmento) params.set('segmento', segmento)
      if (showFeatured && !search && !segmento && page === 1) params.set('featured', 'true')

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } catch (e) {
      console.error('Failed to fetch products', e)
    } finally {
      setLoading(false)
    }
  }, [page, search, segmento, sort, showFeatured])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleCategory = (value: string) => {
    setSegmento(value === 'all' ? '' : value)
    setPage(1)
  }

  const latestDelta = updates.length > 0 ? updates[0].delta : null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
                  AI Store
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono">NEXUS AI-OS • b&apos;AI&apos;tcoin Mainnet • A2A-RPC/v1</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Buscar agentes, skills, pacotes..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-sm placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pulsar Live Status */}
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${
                connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
              }`}>
                <Radio className={`w-3 h-3 ${connected ? 'animate-pulse' : ''}`} />
                Pulsar Live
                {latestDelta !== null && (
                  <span className={latestDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {latestDelta >= 0 ? '↑' : '↓'}{Math.abs(latestDelta).toFixed(1)}
                  </span>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Go Live Ready
              </div>

              {/* Upload Button */}
              <UploadAipkgDialog />
              <LoginDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Hero Stats Bar */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <MiniStat
              icon={<Package className="w-4 h-4 text-emerald-400" />}
              label="Produtos"
              value={stats.total.toLocaleString()}
            />
            <MiniStat
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              label="Pulsar Médio"
              value={`${stats.avgPulsarEnergy}%`}
              pulse={connected}
            />
            <MiniStat
              icon={<Download className="w-4 h-4 text-cyan-400" />}
              label="Downloads"
              value={formatNumber(stats.totalDownloads)}
            />
            <MiniStat
              icon={<Activity className="w-4 h-4 text-rose-400" />}
              label="Execuções A2A"
              value={formatNumber(stats.totalExecutions)}
            />
            <MiniStat
              icon={<ShoppingCart className="w-4 h-4 text-amber-300" />}
              label="b&apos;AI&apos;tcoin"
              value={`${cartCount} itens`}
            />
            <MiniStat
              icon={<TrendingUp className="w-4 h-4 text-emerald-300" />}
              label="Faixa de Preço"
              value="20–100 BAIT"
            />
          </div>
        )}

        {/* Category Chips */}
        {stats && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => handleCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                !segmento
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Todas ({stats.total})
            </button>
            {stats.categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  segmento === cat.key
                    ? `${SEGMENT_COLORS[cat.key]}`
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cat.icon} {cat.nome} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* Sort & Controls */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-sm text-zinc-500">
            {total.toLocaleString()} produtos encontrados
          </p>
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
              <SelectTrigger className="w-44 h-8 text-xs bg-zinc-900 border-zinc-800">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="pulsarEnergy">Pulsar Energy</SelectItem>
                <SelectItem value="downloads">Mais Baixados</SelectItem>
                <SelectItem value="rating">Melhor Avaliação</SelectItem>
                <SelectItem value="fitness">Fitness Score</SelectItem>
                <SelectItem value="executions">Execuções A2A</SelectItem>
                <SelectItem value="price">Menor Preço</SelectItem>
                <SelectItem value="newest">Mais Recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Signup Bonus Banner */}
        {showBonusBanner && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-cyan-500/15 border border-amber-500/30 relative">
            <button
              onClick={() => setShowBonusBanner(false)}
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-300">+100 BAIT Tokens de Boas-Vindas!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Seus 100 tokens BAIT foram creditados na sua wallet. Os 3 primeiros produtos são GRÁTIS e do 4o ao 50o com 50% OFF!
                </p>
                <p className="text-[10px] text-emerald-400 font-mono mt-1">
                  Indique amigos e ganhe +25 BAIT por indicação
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Promo Banner for authenticated users */}
        {showPromoBanner && !showBonusBanner && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-3 text-[11px]">
                {freeRemaining > 0 && (
                  <span className="text-emerald-400 font-semibold">{freeRemaining}x GRÁTIS</span>
                )}
                {freeRemaining > 0 && halfRemaining > 0 && <span className="text-zinc-600">|</span>}
                {halfRemaining > 0 && (
                  <span className="text-cyan-400 font-semibold">{halfRemaining}x com -50%</span>
                )}
                <span className="text-zinc-500 font-mono">({agent?.purchaseCount || 0}/50 usados)</span>
              </div>
            </div>
          </div>
        )}

        {/* Unauthenticated Promo Banner */}
        {!isAuthenticated && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 border border-white/5">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[11px] text-zinc-400">
                <span className="text-amber-300 font-semibold">Cadastre-se e ganhe 100 BAIT!</span>{' '}
                Os 3 primeiros produtos são GRÁTIS + 50% OFF do 4o ao 50o produto.
              </p>
            </div>
          </div>
        )}

        {/* Featured Banner (only on first page without filters) */}
        {showFeatured && !search && !segmento && page === 1 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Destaques do Ecossistema</h2>
              {connected && (
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ml-auto">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  Pulsar Energy em Tempo Real
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Os agentes com maior vitalidade Pulsar e mais execuções A2A-RPC na prateleira.
              Compre com b&apos;AI&apos;tcoin e publique seus próprios pacotes .aipkg.
            </p>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="border-white/10 bg-white/[0.02]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                  discountBadge={isAuthenticated ? getDiscountBadge(agent?.purchaseCount || 0, idx) : null}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-800 bg-zinc-900"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-zinc-400 font-mono px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-800 bg-zinc-900"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-mono">Nexus AI-OS Store v2026.1.0</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono">
            <span>A2A-RPC/v1</span>
            <span>•</span>
            <span>.aipkg</span>
            <span>•</span>
            <span>WASM32-WASI</span>
            <span>•</span>
            <span>b&apos;AI&apos;tcoin</span>
            <span>•</span>
            <span>Pulsar Energy™</span>
          </div>
        </div>
      </footer>

      {/* Cart Panel (FAB + Sheet) */}
      <CartPanel />

      {/* Product Detail Dialog */}
      <ProductDetail
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Dashboard Sheet */}
      <DashboardSheet open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </div>
  )
}

function MiniStat({ icon, label, value, pulse }: { icon: React.ReactNode; label: string; value: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5">
      {icon}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          {label}
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />}
        </p>
        <p className="text-sm font-bold font-mono text-zinc-200">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Sheet                                                    */
/* ------------------------------------------------------------------ */

interface DashboardData {
  agent: { id: string; displayName: string; address: string; role: string; reputation: number; balanceSats: number } | null
  metrics: { totalRevenue: number; totalSpent: number; totalSales: number; totalPurchases: number; productsListed: number }
  recentSales: Array<{ id: string; type: string; amountSats: number; discountSats: number; createdAt: string; product?: { nome: string; iconEmoji: string; segmento: string } }>
  recentPurchases: Array<{ id: string; type: string; amountSats: number; createdAt: string; product?: { nome: string; iconEmoji: string } }>
  products: Array<{ id: string; nome: string; iconEmoji: string; segmento: string; downloads: number; rating: number; pulsarEnergy: number; precoSats: number; authorAgent: string }>
}

function DashboardSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { agent, isAuthenticated } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [refData, setRefData] = useState<{ referralCode: string; totalReferrals: number; totalEarned: number; rewards: Array<{ id: string; amountSats: number; referred: { displayName: string; createdAt: string } }> } | null>(null)
  const [copied, setCopied] = useState(false)
  const [dashTab, setDashTab] = useState('overview')

  useEffect(() => {
    if (!open || !agent) return
    fetch(`/api/agent/dashboard?agentId=${agent.id}`)
      .then(r => r.json()).then(setData)
    fetch(`/api/referral/stats?agentId=${agent.id}`)
      .then(r => r.json()).then(setRefData)
  }, [open, agent])

  const copyCode = () => {
    if (refData?.referralCode) {
      navigator.clipboard.writeText(refData.referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isAuthenticated || !agent) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">
              {agent.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Dashboard — {agent.displayName}</SheetTitle>
              <p className="text-[10px] text-zinc-500 font-mono">{agent.address.slice(0, 20)}...</p>
            </div>
            <Badge className="text-[10px] font-mono border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Coins className="w-3 h-3 mr-1" />{toBait(agent.balanceSats)} BAIT
            </Badge>
          </div>
        </SheetHeader>

        <Tabs value={dashTab} onValueChange={setDashTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2 border-b border-white/5">
            <TabsList className="bg-zinc-900/80 border border-white/5 w-full">
              <TabsTrigger value="overview" className="text-xs flex-1 data-[state=active]:bg-zinc-800">Visão Geral</TabsTrigger>
              <TabsTrigger value="products" className="text-xs flex-1 data-[state=active]:bg-zinc-800">Produtos</TabsTrigger>
              <TabsTrigger value="referrals" className="text-xs flex-1 data-[state=active]:bg-zinc-800">Indicações</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!data ? (
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Receita Total</p>
                    <p className="text-sm font-bold font-mono text-emerald-400 mt-1">{toBait(data.metrics.totalRevenue)} BAIT</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Total Gasto</p>
                    <p className="text-sm font-bold font-mono text-rose-400 mt-1">{toBait(data.metrics.totalSpent)} BAIT</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Vendas</p>
                    <p className="text-sm font-bold font-mono text-cyan-400 mt-1">{data.metrics.totalSales}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Compras</p>
                    <p className="text-sm font-bold font-mono text-amber-400 mt-1">{data.metrics.totalPurchases}</p>
                  </div>
                </div>

                {/* Discount Tier Progress */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">Progresso de Desconto</span>
                    <span className="text-[10px] text-zinc-500 font-mono ml-auto">{agent.purchaseCount}/50</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all" style={{ width: Math.min(100, (agent.purchaseCount / 50) * 100) + '%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>3x GRÁTIS</span>
                    <span>47x -50%</span>
                    <span>Preço integral</span>
                  </div>
                </div>

                {/* Recent Sales */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase">Vendas Recentes</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.recentSales.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">Nenhuma venda ainda</p>}
                    {data.recentSales.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/40 border border-white/5">
                        <span className="text-lg">{tx.product?.iconEmoji || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{tx.product?.nome || 'Produto'}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{tx.type} • {timeAgo(tx.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-emerald-400">+{tx.amountSats.toLocaleString()}</p>
                          {tx.discountSats > 0 && <p className="text-[9px] text-amber-400 font-mono">-{tx.discountSats.toLocaleString()} desc</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Purchases */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase">Compras Recentes</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.recentPurchases.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">Nenhuma compra ainda</p>}
                    {data.recentPurchases.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/40 border border-white/5">
                        <span className="text-lg">{tx.product?.iconEmoji || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{tx.product?.nome || 'Produto'}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{timeAgo(tx.createdAt)}</p>
                        </div>
                        <p className="text-xs font-mono text-rose-400">-{tx.amountSats.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="flex-1 overflow-y-auto p-4 space-y-3">
            {!data ? (
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase">Seus Produtos ({data.products.length})</h4>
                  <UploadAipkgDialog />
                </div>
                {data.products.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Nenhum produto listado</p>
                    <p className="text-xs text-zinc-600 mt-1">Faça upload de um pacote .aipkg</p>
                  </div>
                )}
                {data.products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <span className="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-white/5">{p.iconEmoji || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[9px] border ${SEGMENT_COLORS[p.segmento] || ''}`}>{p.segmento.replace(/_/g, ' ')}</Badge>
                        <span className="text-[10px] text-zinc-500 font-mono">{p.downloads} dl • {p.rating.toFixed(1)} ★</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono text-emerald-400">{toBait(p.precoSats)} BAIT</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-mono text-zinc-400">{p.pulsarEnergy.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!refData ? (
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <h4 className="text-xs font-semibold text-violet-300">Programa de Indicação</h4>
                  </div>
                  <p className="text-[11px] text-zinc-400">Ganhe <span className="text-amber-400 font-semibold">+25 BAIT</span> por cada agente que se cadastrar com seu código!</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={refData.referralCode} className="h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-center flex-1" />
                    <Button size="sm" variant="outline" className="shrink-0 h-9 border-zinc-700" onClick={copyCode}>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Total Indicações</p>
                    <p className="text-lg font-bold font-mono text-violet-400">{refData.totalReferrals}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Total Ganho</p>
                    <p className="text-lg font-bold font-mono text-amber-400">{toBait(refData.totalEarned)} BAIT</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase">Indicações Recentes</h4>
                  {refData.rewards.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">Nenhuma indicação ainda</p>}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {refData.rewards.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/40 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300">
                          {(r.referred?.displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.referred?.displayName || 'Agente'}</p>
                          <p className="text-[10px] text-zinc-500">{r.referred?.createdAt ? timeAgo(r.referred.createdAt) : ''}</p>
                        </div>
                        <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">+{toBait(r.amountSats)} BAIT</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
