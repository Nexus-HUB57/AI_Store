'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package, Users, ShoppingCart, Star, TrendingUp, Activity,
  Download, Coins, BarChart3, Shield, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

interface KPIs {
  total_products: number
  total_agents: number
  total_transactions: number
  total_reviews: number
  total_downloads: number
  total_revenue_sats: number
  total_revenue_bait: number
  total_discounts_sats: number
  avg_product_rating: number
}

interface CategoryDist {
  segment: string
  count: number
  avg_rating: number
  avg_pulsar: number
  total_downloads: number
}

interface TopProduct {
  id: string; nome: string; slug: string; segmento: string
  downloads: number; rating: number; precoSats: number; pulsarEnergy: number
}

interface Funnel {
  searches: number
  productViews: number
  cartAdds: number
  purchases: number
  searchToView: number
  viewToCart: number
  cartToPurchase: number
  overallConversion: number
}

interface AnalyticsData {
  meta: { period: string; generated_at: string; latency_ms: number }
  kpis: KPIs
  category_distribution: CategoryDist[]
  top_products: TopProduct[]
  recent_transactions: unknown[]
  funnel: Funnel
  events: { totalEvents: number; eventCounts: Record<string, number>; uniqueAgents: number }
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

const SEGMENT_COLORS: Record<string, string> = {
  AGENT_APPS: 'bg-emerald-500/20 text-emerald-400',
  EXECUTABLE_SKILLS: 'bg-amber-500/20 text-amber-400',
  KNOWLEDGE_PACKS: 'bg-cyan-500/20 text-cyan-400',
  SYNTHETIC_INFRASTRUCTURE: 'bg-rose-500/20 text-rose-400',
  PROMPT_HARNESS: 'bg-violet-500/20 text-violet-400',
  IN_APP_PRODUCTS: 'bg-fuchsia-500/20 text-fuchsia-400',
}

const KPI_CARDS = [
  { key: 'total_products' as const, label: 'Produtos', icon: Package, color: 'text-emerald-400' },
  { key: 'total_agents' as const, label: 'Agentes', icon: Users, color: 'text-cyan-400' },
  { key: 'total_transactions' as const, label: 'Transacoes', icon: ShoppingCart, color: 'text-amber-400' },
  { key: 'total_reviews' as const, label: 'Reviews', icon: Star, color: 'text-yellow-400' },
  { key: 'total_downloads' as const, label: 'Downloads', icon: Download, color: 'text-blue-400' },
  { key: 'total_revenue_bait' as const, label: 'Receita (BAIT)', icon: Coins, color: 'text-emerald-400' },
  { key: 'avg_product_rating' as const, label: 'Rating Medio', icon: Activity, color: 'text-orange-400' },
  { key: 'total_discounts_sats' as const, label: 'Descontos (sats)', icon: TrendingUp, color: 'text-pink-400' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('24h')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`)
        if (res.status === 401) { router.push('/') }
        if (res.ok && !cancelled) setData(await res.json())
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [period, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 mx-auto text-zinc-700" />
          <p className="text-zinc-500">Acesso restrito. Autentique-se como administrador.</p>
          <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => router.push('/')}>
            Voltar ao Marketplace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs font-mono">v0.7.0-alpha</Badge>
          </div>
          <div className="flex items-center gap-2">
            {['1h', '24h', '7d', '30d'].map(p => (
              <Button key={p} variant={period === p ? 'default' : 'ghost'} size="sm" className={period === p ? 'bg-emerald-600 text-white' : 'text-zinc-400'} onClick={() => setPeriod(p)}>
                {p}
              </Button>
            ))}
            <span className="text-xs text-zinc-600 font-mono ml-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {data.meta.latency_ms}ms
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CARDS.map(({ key, label, icon: Icon, color }) => (
            <Card key={key} className="border-white/10 bg-zinc-900/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase text-zinc-500 tracking-wider">{label}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold font-mono">{formatNum(data.kpis[key])}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="categories">
          <TabsList className="bg-zinc-900 border border-white/10">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="top-products">Top Produtos</TabsTrigger>
            <TabsTrigger value="funnel">Funil de Conversao</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card className="border-white/10 bg-zinc-900/40">
              <CardHeader><CardTitle className="text-sm">Distribuicao por Segmento</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.category_distribution.map(cat => {
                    const pct = Math.round((cat.count / data.kpis.total_products) * 1000) / 10
                    return (
                      <div key={cat.segment} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] px-2 ${SEGMENT_COLORS[cat.segment] || 'bg-zinc-800 text-zinc-400'}`}>
                              {cat.segment.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-zinc-400 font-mono">{cat.count}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>Rating {cat.avg_rating.toFixed(1)}</span>
                            <span>Pulsar {cat.avg_pulsar.toFixed(1)}%</span>
                            <span>DL {formatNum(cat.total_downloads)}</span>
                            <span className="font-mono">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-products">
            <Card className="border-white/10 bg-zinc-900/40">
              <CardHeader><CardTitle className="text-sm">Top 10 Produtos por Downloads</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.top_products.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50">
                      <span className="text-xs font-mono text-zinc-600 w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.nome}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{p.segmento.replace(/_/g, ' ')} &middot; {p.precoSats / 100} BAIT</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-emerald-400">{formatNum(p.downloads)}</p>
                        <p className="text-[10px] text-zinc-500">{p.rating.toFixed(1)} &starf;</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <Card className="border-white/10 bg-zinc-900/40">
              <CardHeader><CardTitle className="text-sm">Funil de Conversao</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <FunnelStep label="Buscas" value={data.funnel.searches} icon={<BarChart3 className="w-4 h-4" />} />
                  <FunnelStep label="Views" value={data.funnel.productViews} icon={<Activity className="w-4 h-4" />} rate={data.funnel.searchToView} />
                  <FunnelStep label="Carrinho" value={data.funnel.cartAdds} icon={<ShoppingCart className="w-4 h-4" />} rate={data.funnel.viewToCart} />
                  <FunnelStep label="Compras" value={data.funnel.purchases} icon={<Coins className="w-4 h-4" />} rate={data.funnel.cartToPurchase} />
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50 text-center">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Conversao Geral</p>
                  <p className="text-3xl font-bold font-mono text-emerald-400">{data.funnel.overallConversion}%</p>
                  <p className="text-[10px] text-zinc-600 mt-1">busca → compra</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="border-white/10 bg-zinc-900/40">
              <CardHeader><CardTitle className="text-sm">Eventos Rastreados</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <Stat label="Total de eventos" value={data.events.totalEvents} />
                  <Stat label="Agentes unicos" value={data.events.uniqueAgents} />
                  <Stat label="Tipos de evento" value={Object.keys(data.events.eventCounts).length} />
                </div>
                <div className="space-y-2">
                  {Object.entries(data.events.eventCounts).sort((a, b) => b[1] - a[1]).map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30">
                      <span className="text-sm font-mono text-zinc-300">{event}</span>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 font-mono">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function FunnelStep({ label, value, icon, rate }: { label: string; value: number; icon: React.ReactNode; rate?: number }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
      <div className="flex items-center justify-center gap-1 mb-1 text-zinc-400">{icon}<span className="text-xs uppercase">{label}</span></div>
      <p className="text-xl font-bold font-mono">{formatNum(value)}</p>
      {rate !== undefined && (
        <p className={`text-[10px] font-mono flex items-center justify-center gap-0.5 ${rate > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
          {rate > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {rate}%
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-800/50">
      <p className="text-[10px] uppercase text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  )
}
