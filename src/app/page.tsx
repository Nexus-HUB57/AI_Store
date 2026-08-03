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
} from 'lucide-react'
import { CartPanel } from '@/components/store/cart-panel'
import { UploadAipkgDialog } from '@/components/store/upload-aipkg-dialog'
import { LoginDialog } from '@/components/auth/login-dialog'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { useCartStore } from '@/lib/cart-store'
import { useRouter } from 'next/navigation'

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

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
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
            <span className="text-xs font-mono text-emerald-400">
              {product.precoSats.toLocaleString()} sats
            </span>
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

function ProductDetail({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const inCart = product ? items.some((i) => i.id === product.id) : false

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5">
              {product.iconEmoji}
            </div>
            <div>
              <DialogTitle className="text-lg">{product.nome}</DialogTitle>
              <p className="text-sm text-zinc-400 font-mono">v{product.version} • {product.authorAgent}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-zinc-300 leading-relaxed">{product.coreBusiness}</p>

          <Badge variant="outline" className={`border ${SEGMENT_COLORS[product.segmento] || ''}`}>
            {product.segmento.replace(/_/g, ' ')}
          </Badge>

          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Zap className="w-4 h-4 text-amber-400" />} label="Pulsar Energy" value={`${product.pulsarEnergy.toFixed(1)}%`} />
            <StatCard icon={<Activity className="w-4 h-4 text-emerald-400" />} label="Fitness Score" value={`${product.fitnessScore.toFixed(1)}%`} />
            <StatCard icon={<Download className="w-4 h-4 text-cyan-400" />} label="Downloads" value={formatNumber(product.downloads)} />
            <StatCard icon={<Star className="w-4 h-4 text-amber-300" />} label="Rating" value={`${product.rating}/5.0`} />
            <StatCard icon={<Cpu className="w-4 h-4 text-violet-400" />} label="Execuções A2A" value={formatNumber(product.a2aExecutions)} />
            <StatCard icon={<Shield className="w-4 h-4 text-rose-400" />} label="Preço" value={`${product.precoSats.toLocaleString()} sats`} />
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
                addItem({
                  id: product.id,
                  nome: product.nome,
                  precoSats: product.precoSats,
                  iconEmoji: product.iconEmoji,
                  segmento: product.segmento,
                  version: product.version,
                  authorAgent: product.authorAgent,
                })
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {inCart ? 'Já no Carrinho' : 'Adicionar ao Carrinho'}
            </Button>
            <Button variant="outline" className="border-zinc-700" asChild>
              <a href={product.repoGithubUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
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
  const router = useRouter()

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
                <p className="text-[10px] text-zinc-500 font-mono">NEXUS AI-OS • A2A-RPC</p>
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
          <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
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
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => router.push(`/product/${product.slug}`)}
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
