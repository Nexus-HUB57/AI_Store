'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from '@/components/store/motion-wrapper'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Search, Zap, Download, Star, Activity, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Cpu, Shield,
  TrendingUp, Package, Sparkles, Layers, ShoppingCart,
  Plus, Wifi, WifiOff, Radio, Gift, X, Eye, Users,
  Coins, Clock, BarChart3, Copy, Check, ArrowRight, Keyboard,
  LayoutDashboard, LogOut, User, Loader2, Hash, ChevronDown,
} from 'lucide-react'
import dynamic from 'next/dynamic'
const CartPanel = dynamic(() => import('@/components/store/cart-panel').then(m => ({ default: m.CartPanel })), { ssr: false })
const UploadAipkgDialog = dynamic(() => import('@/components/store/upload-aipkg-dialog').then(m => ({ default: m.UploadAipkgDialog })), { ssr: false })
const LoginDialog = dynamic(() => import('@/components/auth/login-dialog').then(m => ({ default: m.LoginDialog })), { ssr: false })
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
const ScrollToTopButton = dynamic(() => import('@/components/store/scroll-to-top').then(m => ({ default: m.ScrollToTopButton })), { ssr: false })
const ProductCard = dynamic(() => import('@/components/store/product-card').then(m => ({ default: m.ProductCard })), { ssr: false, loading: () => <Card className="border-white/[0.05] bg-zinc-900/30 h-52"><CardContent className="p-0"/></Card> })
const StatCard = dynamic(() => import('@/components/store/stat-card').then(m => ({ default: m.StatCard })), { ssr: false, loading: () => <Card className="border-white/[0.05] bg-zinc-900/30"><CardContent className="p-4"/></Card> })
const MiniStat = dynamic(() => import('@/components/store/stat-card').then(m => ({ default: m.MiniStat })), { ssr: false, loading: () => <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05]"><div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse"/></div> })
const FeaturedProduct = dynamic(() => import('@/components/store/featured-product').then(m => ({ default: m.FeaturedProduct })), { ssr: false })
const ReviewList = dynamic(() => import('@/components/store/review-list').then(m => ({ default: m.ReviewList })), { ssr: false, loading: () => <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" /></div> })
const ProductDetailDialog = dynamic(() => import('@/components/store/product-detail-dialog').then(m => ({ default: m.ProductDetailDialog })), { ssr: false, loading: () => null })
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface Product {
  id: string; nome: string; slug: string; segmento: string
  coreBusiness: string; publicoAlvoAI: string; disponibilidadeOS: string
  repoGithubUrl: string; precoSats: number; downloads: number
  rating: number; pulsarEnergy: number; fitnessScore: number
  a2aExecutions: number; version: string; authorAgent: string
  iconEmoji: string; featured: boolean
}

interface Category { key: string; nome: string; icon: string; count: number }

interface Stats {
  total: number; categories: Category[]; avgPulsarEnergy: number
  totalDownloads: number; totalExecutions: number; featuredCount: number
}

/* ================================================================== */
/*  Constants & Helpers                                                */
/* ================================================================== */

const SEGMENT_COLORS: Record<string, string> = {
  AGENT_APPS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  EXECUTABLE_SKILLS: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  KNOWLEDGE_PACKS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  SYNTHETIC_INFRASTRUCTURE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  PROMPT_HARNESS: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  IN_APP_PRODUCTS: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
}

const BAIT_PER_SAT = 100
const toBait = (sats: number) => (sats / BAIT_PER_SAT).toFixed(0)

const CATEGORY_ICONS: Record<string, string> = {
  AGENT_APPS: '🤖',
  EXECUTABLE_SKILLS: '⚡',
  KNOWLEDGE_PACKS: '🧠',
  SYNTHETIC_INFRASTRUCTURE: '🏗️',
  PROMPT_HARNESS: '🎯',
  IN_APP_PRODUCTS: '🛍️',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return mins + 'min atrás'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + 'h atrás'
  return Math.floor(hours / 24) + 'd atrás'
}

function getDiscountBadge(purchaseCount: number, idx: number): { label: string; color: string } | null {
  const pos = purchaseCount + idx
  if (pos < 3) return { label: 'GRÁTIS', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
  if (pos < 50) return { label: '-50%', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
  return null
}

/* ================================================================== */
/*  Animation Variants                                                 */
/* ================================================================== */

const staggerContainer = {
  hidden: {}, visible: { transition: { staggerChildren: 0.04 } },
}

/* ================================================================== */
/*  DashboardData & DashboardSheet                                     */
/* ================================================================== */

interface DashboardData {
  agent: {
    id: string; address: string; displayName: string; role: string
    reputation: number; balanceSats: number; purchaseCount: number; referralCode: string
  }
  metrics: {
    totalRevenue: number; totalSpent: number; totalSales: number
    totalPurchases: number; productsListed: number
  }
  recentSales: Array<{ id: string; productName: string; buyerAgent: string; priceSats: number; createdAt: string }>
  recentPurchases: Array<{ id: string; productName: string; sellerAgent: string; priceSats: number; createdAt: string }>
  products: Array<{ id: string; nome: string; iconEmoji: string; segmento: string; precoSats: number; pulsarEnergy: number; downloads: number }>
}

interface ReferralStats {
  totalReferrals: number; totalEarned: number
  recentReferrals: Array<{ id: string; referredAgent: string; createdAt: string; bonusSats: number }>
}

function DashboardSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { agent, isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState<DashboardData | null>(null)
  const [refData, setRefData] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!open || !isAuthenticated || !agent) return
    Promise.all([
      fetch(`/api/agent/dashboard?agentId=${agent.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/referral/stats?agentId=${agent.id}`).then(r => r.json()).catch(() => null),
    ]).then(([dash, ref]) => {
      if (dash?.agent) setData(dash as DashboardData)
      if (ref) setRefData(ref as ReferralStats)
      setHasFetched(true)
    })
  }, [open, isAuthenticated, agent])

  const loading = open && isAuthenticated && !!agent && !hasFetched

  const handleCopyCode = () => {
    if (agent?.referralCode) {
      navigator.clipboard.writeText(agent.referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const pc = agent?.purchaseCount || 0
  const discountTier = pc < 3 ? 'GRÁTIS (primeiras 3)' : pc < 50 ? '-50% (até 50)' : 'Preço integral'
  const tierProgress = Math.min((pc % 50) / 50 * 100, 100)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl w-full bg-zinc-950 border-zinc-800 text-zinc-100 overflow-y-auto">
        <SheetHeader className="pr-6">
          <SheetTitle className="text-zinc-100 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />Dashboard
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20">
            <BarChart3 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Dados não disponíveis</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <TabsList className="bg-zinc-900/50 border border-zinc-800">
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-zinc-800">Visão Geral</TabsTrigger>
              <TabsTrigger value="products" className="text-xs data-[state=active]:bg-zinc-800">Produtos</TabsTrigger>
              <TabsTrigger value="referrals" className="text-xs data-[state=active]:bg-zinc-800">Indicações</TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="overview" className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={<Coins className="w-4 h-4 text-emerald-400" />} label="Receita Total" value={toBait(data.metrics.totalRevenue) + ' BAIT'} />
                <StatCard icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} label="Total Gasto" value={toBait(data.metrics.totalSpent) + ' BAIT'} />
                <StatCard icon={<Package className="w-4 h-4 text-amber-400" />} label="Vendas" value={String(data.metrics.totalSales)} />
                <StatCard icon={<ShoppingCart className="w-4 h-4 text-violet-400" />} label="Compras" value={String(data.metrics.totalPurchases)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tier de Desconto</h4>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{discountTier}</Badge>
                </div>
                <Progress value={tierProgress} className="h-2 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                <p className="text-[10px] text-zinc-600 mt-1">{pc}/50 compras para próximo tier</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Vendas Recentes</h4>
                {data.recentSales.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-4 text-center">Nenhuma venda ainda</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.recentSales.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.04]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">{s.productName}</p>
                          <p className="text-[10px] text-zinc-600">{s.buyerAgent} • {timeAgo(s.createdAt)}</p>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 shrink-0 ml-2">+{toBait(s.priceSats)} BAIT</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Compras Recentes</h4>
                {data.recentPurchases.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-4 text-center">Nenhuma compra ainda</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.recentPurchases.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.04]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">{p.productName}</p>
                          <p className="text-[10px] text-zinc-600">{p.sellerAgent} • {timeAgo(p.createdAt)}</p>
                        </div>
                        <span className="text-xs font-mono text-amber-400 shrink-0 ml-2">-{toBait(p.priceSats)} BAIT</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Produtos */}
            <TabsContent value="products" className="mt-4">
              {data.products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Nenhum produto listado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {data.products.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="text-xl w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.05] shrink-0">
                        {p.iconEmoji || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{p.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-[8px] border ${SEGMENT_COLORS[p.segmento] || ''}`}>{p.segmento.replace(/_/g, ' ')}</Badge>
                          <span className="text-[10px] text-zinc-500">{formatNumber(p.downloads)} downloads</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-emerald-400">{toBait(p.precoSats)} BAIT</p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-zinc-500 font-mono">{p.pulsarEnergy.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Indicações */}
            <TabsContent value="referrals" className="mt-4 space-y-5">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.05]">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Seu Código de Indicação</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 font-mono text-sm text-zinc-200">
                    <Hash className="w-4 h-4 text-zinc-500 shrink-0" />
                    {agent?.referralCode || '—'}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 border-zinc-700 hover:bg-zinc-800" onClick={handleCopyCode}>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={<Users className="w-4 h-4 text-cyan-400" />} label="Total Indicações" value={String(refData?.totalReferrals || 0)} />
                <StatCard icon={<Gift className="w-4 h-4 text-amber-400" />} label="Total Ganho" value={toBait(refData?.totalEarned || 0) + ' BAIT'} />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Indicações Recentes</h4>
                {(!refData?.recentReferrals || refData.recentReferrals.length === 0) ? (
                  <p className="text-xs text-zinc-600 py-4 text-center">Nenhuma indicação ainda</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {refData.recentReferrals.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.04]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">{r.referredAgent}</p>
                          <p className="text-[10px] text-zinc-600">{timeAgo(r.createdAt)}</p>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 shrink-0 ml-2">+{toBait(r.bonusSats)} BAIT</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ================================================================== */
/*  Home (Main Page)                                                   */
/* ================================================================== */

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [segmento, setSegmento] = useState('all')
  const [sort, setSort] = useState('pulsar')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showFeatured, setShowFeatured] = useState(true)
  const [liveUpdates, setLiveUpdates] = useState<Record<string, number>>({})
  const [showBonusBanner, setShowBonusBanner] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const { connected, updates } = usePulsarSSE()
  const cartCount = useCartStore((s) => s.items.length)
  const { agent, isAuthenticated, isNewUser } = useAuthStore()

  const PER_PAGE = 12

  useEffect(() => {
    const handler = () => setDashboardOpen(true)
    window.addEventListener('open-dashboard', handler)
    return () => window.removeEventListener('open-dashboard', handler)
  }, [])

  useEffect(() => {
    if (isNewUser) {
      const showTimer = setTimeout(() => setShowBonusBanner(true), 0)
      const hideTimer = setTimeout(() => setShowBonusBanner(false), 8000)
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
    }
  }, [isNewUser])

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/stats')
      const d = await r.json()
      if (d) setStats(d)
    } catch {}
  }, [])

  const fetchProducts = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PER_PAGE),
        sort,
        ...(search ? { q: search } : {}),
        ...(segmento !== 'all' ? { segmento } : {}),
      })
      const r = await fetch(`/api/products?${params}`)
      const d = await r.json()
      setProducts(d.products || [])
      setTotal(d.pagination?.total || 0)
      setTotalPages(Math.max(1, Math.ceil((d.pagination?.total || 0) / PER_PAGE)))
    } catch {}
    setLoading(false)
  }, [page, sort, search, segmento])

  useEffect(() => {
    const load = () => { fetchStats(); fetchProducts(true) }
    load()
  }, [fetchStats, fetchProducts])

  /* ⌘K keyboard shortcut */
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (updates.length === 0) return
    const timer = setTimeout(() => {
      setLiveUpdates(prev => {
        const next = { ...prev }
        const recent = updates.slice(0, 20)
        for (const u of recent) { next[u.productId] = u.pulsarEnergy }
        return next
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [updates])

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }
  const handleCategory = (key: string) => { setSegmento(key === segmento ? 'all' : key); setPage(1) }

  const freeRemaining = isAuthenticated ? Math.max(0, 3 - (agent?.purchaseCount || 0)) : 3
  const halfRemaining = isAuthenticated ? Math.max(0, 50 - (agent?.purchaseCount || 0)) : 50
  const showPromoBanner = isAuthenticated && (freeRemaining > 0 || halfRemaining > 0)

  const featuredProducts = useMemo(() => {
    if (!showFeatured || search || segmento !== 'all') return []
    return products.filter(p => p.featured)
  }, [products, showFeatured, search, segmento])

  const displayProducts = useMemo(() => {
    if (showFeatured && !search && segmento === 'all' && featuredProducts.length > 0) {
      return products.filter(p => !p.featured)
    }
    return products
  }, [products, showFeatured, search, segmento, featuredProducts])

  const skeletonCount = Array.from({ length: PER_PAGE }, (_, i) => i)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col bg-dot-grid">
      {/* ============ Header ============ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-zinc-950/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <motion.div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ backgroundSize: '200% 200%' }}
              >
                <Layers className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent bg-[length:200%] animate-gradient">AI Store</h1>
                <p className="text-[10px] text-zinc-500 font-mono hidden sm:block">NEXUS AI-OS • b&apos;AI&apos;tcoin Mainnet • A2A-RPC/v1</p>
              </div>
            </div>

            {/* Search - Desktop */}
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar agentes, skills, pacotes..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-16 h-9 bg-zinc-900/80 border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] text-zinc-500">
                <Keyboard className="w-3 h-3" />⌘K
              </kbd>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Mobile search toggle */}
              <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9 text-zinc-400 hover:text-zinc-200" onClick={() => setMobileSearchOpen(v => !v)}>
                {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </Button>

              {/* Pulsar Live indicator */}
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.05]"
                whileHover={{ scale: 1.03 }}
              >
                {connected ? (
                  <>
                    <motion.span className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline">LIVE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">OFF</span>
                  </>
                )}
              </motion.div>

              {/* Go Live */}
              <Button variant="ghost" size="sm" className="h-9 text-xs text-zinc-400 hover:text-emerald-400 gap-1.5 hidden sm:flex">
                <Radio className="w-3.5 h-3.5" />Go Live
              </Button>

              {/* Upload */}
              <UploadAipkgDialog />

              {/* Publish Portal — Desktop */}
              <Button variant="ghost" size="sm" className="h-9 text-xs text-zinc-400 hover:text-amber-400 gap-1.5 hidden sm:flex" onClick={() => window.location.href = '/publish'}>
                <Sparkles className="w-3.5 h-3.5" />Publicar
              </Button>

              {/* Publish Portal — Mobile */}
              <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9 text-zinc-400 hover:text-amber-400" onClick={() => window.location.href = '/publish'}>
                <Sparkles className="w-4 h-4" />
              </Button>

              {/* Auth / Dashboard */}
              {isAuthenticated && agent ? (
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-zinc-400 hover:text-cyan-400 gap-1.5" onClick={() => setDashboardOpen(true)}>
                    <LayoutDashboard className="w-3.5 h-3.5" />Dashboard
                  </Button>
                  <LoginDialog />
                </div>
              ) : (
                <LoginDialog />
              )}
            </div>
          </div>

          {/* Mobile Search Expandable */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden sm:hidden"
              >
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                    className="pl-9 h-9 bg-zinc-900/80 border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ============ Main ============ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Hero Stats */}
        {stats && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-6"
          >
            <MiniStat icon={<Package className="w-5 h-5 text-emerald-400" />} label="Produtos" value={String(stats.total)} animatedValue={stats.total} />
            <MiniStat icon={<Zap className="w-5 h-5 text-amber-400" />} label="Pulsar Médio" value={stats.avgPulsarEnergy.toFixed(0) + '%'} pulse={connected} />
            <MiniStat icon={<Download className="w-5 h-5 text-cyan-400" />} label="Downloads" value={formatNumber(stats.totalDownloads)} animatedValue={stats.totalDownloads} />
            <MiniStat icon={<Activity className="w-5 h-5 text-violet-400" />} label="Execuções" value={formatNumber(stats.totalExecutions)} animatedValue={stats.totalExecutions} />
            <MiniStat icon={<Sparkles className="w-5 h-5 text-amber-400" />} label="Destaque" value={String(stats.featuredCount)} animatedValue={stats.featuredCount} />
          </motion.div>
        )}

        {/* Category Chips */}
        {stats && stats.categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => handleCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${segmento === 'all' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
            >
              🌐 Todos ({stats.total})
            </motion.button>
            {stats.categories.map(cat => (
              <motion.button
                key={cat.key}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleCategory(cat.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${segmento === cat.key ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
              >
                {CATEGORY_ICONS[cat.key] || '📦'} {cat.nome} ({cat.count})
              </motion.button>
            ))}
          </div>
        )}

        {/* Sort & Controls */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300">
                <ArrowUpDown className="w-3 h-3 mr-1.5 text-zinc-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="pulsarEnergy" className="text-xs text-zinc-300">Pulsar Energy</SelectItem>
                <SelectItem value="downloads" className="text-xs text-zinc-300">Downloads</SelectItem>
                <SelectItem value="rating" className="text-xs text-zinc-300">Avaliação</SelectItem>
                <SelectItem value="executions" className="text-xs text-zinc-300">Execuções</SelectItem>
                <SelectItem value="price" className="text-xs text-zinc-300">Menor Preço</SelectItem>
                <SelectItem value="fitness" className="text-xs text-zinc-300">Fitness Score</SelectItem>
                <SelectItem value="newest" className="text-xs text-zinc-300">Recentes</SelectItem>
              </SelectContent>
            </Select>
            {search && (
              <Badge variant="outline" className="text-[10px] bg-zinc-800/50 text-zinc-400 border-zinc-700 gap-1">
                &quot;{search}&quot;
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleSearch('')} />
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">
              {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} de {total}
            </span>
            {totalPages > 1 && (
              <span className="text-[11px] text-zinc-700 font-mono">
                Página {page}/{totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Banners - AnimatePresence */}
        <AnimatePresence>
          {showBonusBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-300">🎉 Bônus de Boas-Vindas!</p>
                  <p className="text-[11px] text-zinc-400">Você recebeu 5.000 BAIT grátis para começar.</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 shrink-0" onClick={() => setShowBonusBanner(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {showPromoBanner && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                <Coins className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-300">Seu Tier de Desconto</p>
                  <p className="text-[11px] text-zinc-400">
                    {freeRemaining > 0 ? `📦 ${freeRemaining} produto${freeRemaining > 1 ? 's' : ''} GRÁTIS restante${freeRemaining > 1 ? 's' : ''}` : `🏷️ -50% nos próximos ${halfRemaining} produtos`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured Banner */}
        <AnimatePresence>
          {featuredProducts.length > 0 && (
            <FeaturedProduct products={featuredProducts} onDismiss={() => setShowFeatured(false)} onSelectProduct={setSelectedProduct} />
          )}
        </AnimatePresence>

        {/* Product Grid */}
        {!loading && displayProducts.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {displayProducts.map((product, i) => {
              const pc = isAuthenticated ? (agent?.purchaseCount || 0) : 999
              const discountBadge = getDiscountBadge(pc, i)
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  discountBadge={discountBadge}
                  liveUpdates={liveUpdates}
                  onClick={() => setSelectedProduct(product)}
                />
              )
            })}
          </motion.div>
        )}

        {/* Empty state for search */}
        {!loading && search && displayProducts.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-sm text-zinc-500 mb-1">Nenhum produto corresponde a &quot;{search}&quot;</p>
            <p className="text-xs text-zinc-600 mb-4">Tente buscar por outro termo ou limpar os filtros</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" className="text-xs text-zinc-400 hover:text-emerald-400" onClick={() => handleSearch('')}>
                <X className="w-3.5 h-3.5 mr-1.5" />Limpar busca
              </Button>
              <Button variant="ghost" className="text-xs text-zinc-400 hover:text-emerald-400" onClick={() => handleCategory('all')}>
                <Layers className="w-3.5 h-3.5 mr-1.5" />Ver todos
              </Button>
            </div>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skeletonCount.map(i => (
              <Card key={i} className="border-white/[0.05] bg-zinc-900/40 animate-shimmer">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-xl bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
                      <Skeleton className="h-2.5 w-1/2 bg-zinc-800" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full bg-zinc-800 rounded-lg" />
                  <Skeleton className="h-3 w-20 bg-zinc-800" />
                  <Skeleton className="h-1.5 w-full bg-zinc-800 rounded-full" />
                  <div className="pt-2.5 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16 bg-zinc-800" />
                      <Skeleton className="h-7 w-20 bg-zinc-800 rounded-lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon"
                  className={`h-8 w-8 text-xs ${pageNum === page ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>

      {/* ============ Footer ============ */}
      <footer className="border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">AI Store — Nexus AI-OS</p>
                <p className="text-[10px] text-zinc-500 font-mono">v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} • 1504 produtos • b'AI'tcoin Mainnet</p>
              </div>
            </div>

            {/* Protocol badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">A2A-RPC/v1</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">PULSAR/NET</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">BAIT-100</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">.aipkg</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">WASM32-WASI</Badge>
            </div>

            {/* Go Live status */}
            <div className="flex items-center gap-2 md:justify-end">
              {connected ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <motion.span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-ring" />
                      <span className="text-[10px] font-mono text-emerald-400">Pulsar SSE • Go Live</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] bg-zinc-900 border-zinc-800">Pulsar Energy streaming at 3s cadence</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[10px] font-mono text-zinc-600">Pulsar Reconnecting...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-zinc-600 font-mono">Nexus AI-OS © {new Date().getFullYear()} • b'AI'tcoin Protocol</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Voltar ao topo
            </button>
          </div>
        </div>
      </footer>

      {/* ============ Overlays ============ */}
      <CartPanel />
      <ProductDetailDialog product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
      <DashboardSheet open={dashboardOpen} onOpenChange={setDashboardOpen} />
      <ScrollToTopButton />
    </div>
  )
}
