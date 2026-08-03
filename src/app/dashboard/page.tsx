'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Wallet, TrendingUp, ShoppingBag, Package,
  Star, Zap, Download, Activity, Coins, BarChart3,
  ArrowUpRight, ArrowDownRight, Users, Layers,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const SEGMENT_COLORS: Record<string, string> = {
  AGENT_APPS: 'text-emerald-400', EXECUTABLE_SKILLS: 'text-amber-400',
  KNOWLEDGE_PACKS: 'text-cyan-400', SYNTHETIC_INFRASTRUCTURE: 'text-rose-400',
  PROMPT_HARNESS: 'text-violet-400', IN_APP_PRODUCTS: 'text-fuchsia-400',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

interface DashboardData {
  agent: { id: string; displayName: string; address: string; role: string; reputation: number; balanceSats: number } | null
  metrics: { totalRevenue: number; totalSpent: number; totalSales: number; totalPurchases: number; productsListed: number }
  recentSales: Array<{ id: string; type: string; amountSats: number; status: string; createdAt: string; product: { nome: string; iconEmoji: string; segmento: string } }>
  recentPurchases: Array<{ id: string; amountSats: number; createdAt: string; product: { nome: string; iconEmoji: string } }>
  products: Array<{ id: string; nome: string; iconEmoji: string; segmento: string; downloads: number; rating: number; pulsarEnergy: number; precoSats: number }>
}

export default function DashboardPage() {
  const { agent, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    if (!agent) return
    try {
      const res = await fetch(`/api/agent/dashboard?agentId=${agent.id}`)
      const json = await res.json()
      setData(json)
    } catch {}
    setLoading(false)
  }, [agent])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchDashboard()
  }, [isAuthenticated, router, fetchDashboard])

  if (!isAuthenticated || !agent) return null

  const m = data?.metrics
  const prods = data?.products || []

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Store
            </Button>
            <Separator orientation="vertical" className="h-5 bg-zinc-800" />
            <h1 className="text-sm font-semibold">Dashboard do Vendedor</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-400">{agent.role}</Badge>
            <span className="font-mono text-amber-400">{agent.balanceSats.toLocaleString()} sats</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mt-20" />
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KpiCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="Receita Total" value={`${formatNumber(m?.totalRevenue || 0)} sats`} trend="up" />
              <KpiCard icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />} label="Vendas" value={String(m?.totalSales || 0)} trend="up" />
              <KpiCard icon={<Package className="w-5 h-5 text-cyan-400" />} label="Produtos" value={String(m?.productsListed || 0)} />
              <KpiCard icon={<Star className="w-5 h-5 text-violet-400" />} label="Reputação" value={`${data?.agent?.reputation || 0}/100`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Products Table */}
              <div className="lg:col-span-2">
                <Card className="border-white/10 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      Meus Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {prods.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-8">Nenhum produto publicado ainda</p>
                    ) : (
                      <div className="space-y-2">
                        {prods.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors">
                            <div className="text-xl w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 shrink-0">
                              {p.iconEmoji || '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{p.nome}</h4>
                              <span className={`text-[10px] font-mono ${SEGMENT_COLORS[p.segmento] || 'text-zinc-400'}`}>
                                {p.segmento.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <p className="text-xs font-mono text-emerald-400">{p.precoSats.toLocaleString()} sats</p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 justify-end">
                                <span><Download className="w-3 h-3 inline" /> {formatNumber(p.downloads)}</span>
                                <span><Star className="w-3 h-3 inline" /> {p.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: Recent Sales + Purchases */}
              <div className="space-y-6">
                <Card className="border-white/10 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Vendas Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(data?.recentSales || []).slice(0, 8).map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{s.product?.iconEmoji}</span>
                            <span className="text-xs truncate max-w-[120px]">{s.product?.nome}</span>
                          </div>
                          <span className="text-xs font-mono text-emerald-400">+{s.amountSats.toLocaleString()}</span>
                        </div>
                      ))}
                      {(data?.recentSales || []).length === 0 && (
                        <p className="text-xs text-zinc-500 text-center py-4">Nenhuma venda ainda</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-cyan-400" />
                      Compras Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(data?.recentPurchases || []).slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{p.product?.iconEmoji}</span>
                            <span className="text-xs truncate max-w-[120px]">{p.product?.nome}</span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">-{p.amountSats.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function KpiCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: 'up' | 'down' }) {
  return (
    <Card className="border-white/10 bg-zinc-900/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold font-mono mt-0.5">{value}</p>
      </CardContent>
    </Card>
  )
}