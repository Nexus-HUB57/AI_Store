// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Search, Download, Star, Activity, Package, Zap, Shield,
  Terminal, ChevronLeft, ChevronRight, RefreshCw, LayoutGrid,
  List, Filter, Server, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const MCPCard = dynamic(() => import('@/components/store/mcp-card').then(m => ({ default: m.MCPCard })), {
  ssr: false,
  loading: () => <Card className="border-white/[0.05] bg-zinc-900/30 h-64"><CardContent className="p-0"/></Card>,
})

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface MCPTool {
  id: string
  name: string
  description: string
  callCount: number
  avgLatencyMs: number
  errorRate: number
}

interface MCPackage {
  id: string
  name: string
  slug: string
  version: string
  description: string
  authorAgent: string
  category: string
  tags: string
  priceSats: number
  downloads: number
  rating: number
  pulsarEnergy: number
  fitnessScore: number
  a2aExecutions: number
  verified: boolean
  featured: boolean
  deprecated: boolean
  iconEmoji: string
  source: string
  runtime: string
  transport: string
  tools: MCPTool[]
}

interface MCPCatalogResponse {
  packages: MCPackage[]
  total: number
  limit: number
  offset: number
}

interface MCPStats {
  total: number
  tools: number
  featured: number
  verified: number
  pythonMCPs: number
  categories: Array<{ name: string; count: number }>
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const CATEGORIES = [
  'all', 'oracle', 'defi', 'bridge', 'faucet', 'agent-registry',
  'marketplace', 'catalog', 'publisher', 'pulsar', 'reviews',
  'referral', 'agent-auth', 'telemetry', 'rag-upgrader',
  'skill-evolver', 'self-heal', 'agentic-awareness',
]

const CATEGORY_ICONS: Record<string, string> = {
  all: '🏪', oracle: '🔮', defi: '🏦', bridge: '🌉', faucet: '🚰',
  'agent-registry': '🤖', marketplace: '🛒', catalog: '📚', publisher: '📦',
  pulsar: '⚡', reviews: '⭐', referral: '🔗', 'agent-auth': '🔐',
  telemetry: '📊', 'rag-upgrader': '🧠', 'skill-evolver': '🧬',
  'self-heal': '🩺', 'agentic-awareness': '👁️',
}

const PER_PAGE = 48

/* ================================================================== */
/*  Animation Variants                                                 */
/* ================================================================== */

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

/* ================================================================== */
/*  MCP Detail Dialog                                                  */
/* ================================================================== */

function MCPDetailDialog({ pkg, open, onClose }: { pkg: MCPackage | null; open: boolean; onClose: () => void }) {
  if (!pkg || !open) return null

  const tags = (() => { try { return JSON.parse(pkg.tags) } catch { return [] } })()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-zinc-900 border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.05]">
                {pkg.iconEmoji || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{pkg.name}</h2>
                <p className="text-sm text-zinc-400 mt-1">{pkg.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{pkg.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{pkg.runtime}</Badge>
                  <Badge variant="outline" className="text-[10px]">{pkg.transport}</Badge>
                  {pkg.verified && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Verified</Badge>}
                  {pkg.featured && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30">⚡ Featured</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500">✕</Button>
            </div>

            {/* Tools */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Tools ({pkg.tools.length})
              </h3>
              <div className="space-y-2">
                {pkg.tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50 border border-white/[0.04]">
                    <div>
                      <code className="text-xs font-mono text-purple-300">{tool.name}</code>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{tool.description}</p>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono text-right shrink-0 ml-3">
                      <div>{tool.callCount.toLocaleString()} calls</div>
                      <div>{tool.avgLatencyMs}ms avg</div>
                      <div className={tool.errorRate > 0.05 ? 'text-rose-400' : tool.errorRate > 0.01 ? 'text-amber-400' : 'text-emerald-400'}>
                        {(tool.errorRate * 100).toFixed(1)}% err
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Downloads', value: pkg.downloads.toLocaleString(), icon: <Download className="w-4 h-4" /> },
                { label: 'Rating', value: pkg.rating.toFixed(1), icon: <Star className="w-4 h-4" /> },
                { label: 'Pulsar', value: pkg.pulsarEnergy.toFixed(0) + '%', icon: <Zap className="w-4 h-4" /> },
                { label: 'Fitness', value: pkg.fitnessScore.toFixed(0), icon: <Activity className="w-4 h-4" /> },
              ].map((m) => (
                <div key={m.label} className="text-center p-2.5 rounded-lg bg-zinc-800/50 border border-white/[0.04]">
                  <div className="text-zinc-500 mb-1 flex justify-center">{m.icon}</div>
                  <div className="text-xs font-mono font-bold text-zinc-200">{m.value}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Acquire button */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-lg font-bold font-mono">
                {pkg.priceSats === 0 ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GRÁTIS</Badge>
                ) : (
                  <span className="text-emerald-400">{Math.floor(pkg.priceSats / 100)} <span className="text-sm text-zinc-500">BAIT</span></span>
                )}
              </div>
              <Button className="bg-purple-600 hover:bg-purple-500 text-white">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adquirir Pacote
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function MCPCatalogPage() {
  const [packages, setPackages] = useState<MCPackage[]>([])
  const [stats, setStats] = useState<MCPStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('downloads')
  const [selectedPkg, setSelectedPkg] = useState<MCPackage | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState<{ healthy: number; degraded: number; failed: number } | null>(null)

  // Fetch MCP packages
  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PER_PAGE.toString(),
        offset: (page * PER_PAGE).toString(),
        ...(category !== 'all' && { category }),
        ...(search && { search }),
      })
      const res = await fetch(`/api/mcp?${params}`)
      const data: MCPCatalogResponse = await res.json()
      setPackages(data.packages)
      setTotal(data.total)
    } catch (err) {
      toast.error('Erro ao carregar catálogo MCP')
    } finally {
      setLoading(false)
    }
  }, [page, category, search])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      })
      const data: MCPStats = await res.json()
      setStats(data)
    } catch {}
  }, [])

  // Fetch health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health' }),
      })
      const data = await res.json()
      setHealthStatus({ healthy: data.healthy, degraded: data.degraded, failed: data.failed })
    } catch {}
  }, [])

  useEffect(() => { fetchPackages() }, [fetchPackages])
  useEffect(() => { fetchStats(); fetchHealth() }, [fetchStats, fetchHealth])

  const totalPages = Math.ceil(total / PER_PAGE)

  // Sort packages client-side
  const sortedPackages = useMemo(() => {
    const sorted = [...packages]
    switch (sortBy) {
      case 'downloads': return sorted.sort((a, b) => b.downloads - a.downloads)
      case 'rating': return sorted.sort((a, b) => b.rating - a.rating)
      case 'pulsar': return sorted.sort((a, b) => b.pulsarEnergy - a.pulsarEnergy)
      case 'price_asc': return sorted.sort((a, b) => a.priceSats - b.priceSats)
      case 'price_desc': return sorted.sort((a, b) => b.priceSats - a.priceSats)
      case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name))
      default: return sorted
    }
  }, [packages, sortBy])

  const handleCardClick = (pkg: MCPackage) => {
    setSelectedPkg(pkg)
    setDetailOpen(true)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-emerald-500/5" />
        <div className="relative max-w-7xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🔌</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
                MCP Catalog
              </h1>
              <p className="text-sm text-zinc-500">Model Context Protocol packages for AI-to-AI commerce</p>
            </div>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
                <Package className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-mono font-bold text-zinc-200">{stats.total.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-500 uppercase">packages</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-mono font-bold text-zinc-200">{stats.tools.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-500 uppercase">tools</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-mono font-bold text-zinc-200">{stats.verified.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-500 uppercase">verified</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-mono font-bold text-zinc-200">{stats.pythonMCPs}</span>
                <span className="text-[10px] text-zinc-500 uppercase">Python live</span>
              </div>
              {healthStatus && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400">{healthStatus.healthy}</span>
                  {healthStatus.degraded > 0 && <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-400">{healthStatus.degraded}</span>
                  </>}
                  {healthStatus.failed > 0 && <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] font-mono text-rose-400">{healthStatus.failed}</span>
                  </>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar MCPs..."
              className="pl-9 bg-zinc-900/60 border-white/[0.06] text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                className={`h-7 text-[11px] px-2.5 rounded-lg shrink-0 ${
                  category === cat
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => { setCategory(cat); setPage(0) }}
              >
                {CATEGORY_ICONS[cat]} {cat === 'all' ? 'Todos' : cat}
              </Button>
            ))}
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0) }}>
              <SelectTrigger className="h-7 text-[11px] w-auto min-w-[100px] bg-zinc-900/60 border-white/[0.06]">
                <SelectValue placeholder="Mais..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat === 'all' ? 'Todos' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 text-[11px] w-auto min-w-[120px] bg-zinc-900/60 border-white/[0.06]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="downloads">Downloads</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="pulsar">Pulsar Energy</SelectItem>
              <SelectItem value="price_asc">Price ↑</SelectItem>
              <SelectItem value="price_desc">Price ↓</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="ghost" size="sm" className="h-7 text-zinc-500" onClick={() => { fetchPackages(); fetchStats(); fetchHealth() }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl bg-zinc-900/30" />
            ))}
          </div>
        ) : sortedPackages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-zinc-500">Nenhum MCP encontrado</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {sortedPackages.map((pkg, i) => (
              <MCPCard
                key={pkg.id}
                pkg={pkg}
                index={i}
                onClick={() => handleCardClick(pkg)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 pb-8 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="text-zinc-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-zinc-400 font-mono">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="text-zinc-500"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-zinc-600 ml-2">
            {total.toLocaleString()} packages total
          </span>
        </div>
      )}

      {/* Detail Dialog */}
      <MCPDetailDialog pkg={selectedPkg} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  )
}
