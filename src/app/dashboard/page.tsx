'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Wallet, TrendingUp, ShoppingBag, Package,
  Star, Zap, Download, Activity, Coins, BarChart3,
  ArrowUpRight, Users, Layers, Gift, Copy, Check,
  Tag, Percent, ArrowDownRight, Crown, UserPlus,
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
  recentSales: Array<{ id: string; type: string; amountSats: number; discountSats: number; status: string; createdAt: string; product: { nome: string; iconEmoji: string; segmento: string } }>
  recentPurchases: Array<{ id: string; amountSats: number; discountSats: number; createdAt: string; product: { nome: string; iconEmoji: string } }>
  products: Array<{ id: string; nome: string; iconEmoji: string; segmento: string; downloads: number; rating: number; pulsarEnergy: number; precoSats: number }>
  salesByDay: Record<string, number>
}

interface ReferralData {
  referralCode: string
  displayName: string
  totalReferrals: number
  totalEarned: number
  totalPending: number
  rewards: Array<{
    id: string; amountSats: number; type: string; claimed: boolean; createdAt: string
    referred: { id: string; displayName: string; address: string; createdAt: string } | null
  }>
}

export default function DashboardPage() {
  const { agent, isAuthenticated, refreshAgent } = useAuthStore()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchDashboard = useCallback(async () => {
    if (!agent) return
    try {
      const [dashRes, refRes] = await Promise.all([
        fetch(`/api/agent/dashboard?agentId=${agent.id}`),
        fetch(`/api/referral/stats?agentId=${agent.id}`),
      ])
      const [dashJson, refJson] = await Promise.all([dashRes.json(), refRes.json()])
      setData(dashJson)
      setReferralData(refJson)
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

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${agent?.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isAuthenticated || !agent) return null

  const m = data?.metrics
  const prods = data?.products || []
  const freeRemaining = Math.max(0, 3 - agent.purchaseCount)
  const halfRemaining = Math.max(0, 50 - agent.purchaseCount) - freeRemaining
  const totalDiscountGiven = (data?.recentSales || []).reduce((s, t) => s + (t.discountSats || 0), 0)

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
            <h1 className="text-sm font-semibold">Dashboard do Agente</h1>
          </div>
          <div className="flex items-center gap-3">
            {(freeRemaining > 0 || halfRemaining > 0) && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Gift className="w-3 h-3" />
                {freeRemaining > 0 && `${freeRemaining}x GRÁTIS`}
                {freeRemaining > 0 && halfRemaining > 0 && ' + '}
                {halfRemaining > 0 && `${halfRemaining}x -50%`}
              </div>
            )}
            <Badge variant="outline" className="text-[9px] border-amber-500/30 bg-amber-500/10 text-amber-400">{agent.role}</Badge>
            <span className="text-xs text-amber-400 font-mono">{agent.balanceSats.toLocaleString()} sats</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mt-20" />
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <KpiCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="Saldo BAIT" value={`${formatNumber(agent.balanceSats)} sats`} />
              <KpiCard icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />} label="Compras" value={String(m?.totalPurchases || 0)} sub={`de ${agent.purchaseCount}/50 com desconto`} />
              <KpiCard icon={<TrendingUp className="w-5 h-5 text-cyan-400" />} label="Receita" value={`${formatNumber(m?.totalRevenue || 0)} sats`} />
              <KpiCard icon={<Package className="w-5 h-5 text-violet-400" />} label="Produtos" value={String(m?.productsListed || 0)} />
              <KpiCard icon={<Users className="w-5 h-5 text-rose-400" />} label="Indicações" value={String(referralData?.totalReferrals || 0)} sub={`+${formatNumber(referralData?.totalEarned || 0)} sats`} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
                <TabsTrigger value="purchases" className="text-xs">Compras</TabsTrigger>
                <TabsTrigger value="referral" className="text-xs flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Indicações
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* My Products */}
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
                          <div className="text-center py-8">
                            <Package className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                            <p className="text-sm text-zinc-500">Nenhum produto publicado</p>
                            <p className="text-xs text-zinc-600 mt-1">Faça upload de um .aipkg para começar</p>
                          </div>
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

                  {/* Sidebar: Promo Status + Recent Sales */}
                  <div className="space-y-6">
                    {/* Discount Progress Card */}
                    <Card className="border-white/10 bg-zinc-900/40">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Gift className="w-4 h-4 text-amber-400" />
                          Progresso de Descontos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold font-mono">{agent.purchaseCount}<span className="text-zinc-500 text-sm">/50</span></p>
                          <p className="text-[10px] text-zinc-500 mt-1">compras com benefício</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Crown className="w-3 h-3" /> GRÁTIS (3x)
                            </span>
                            <span className="font-mono text-zinc-400">
                              {Math.min(agent.purchaseCount, 3)}/3
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, (Math.min(agent.purchaseCount, 3) / 3) * 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-cyan-400 flex items-center gap-1">
                              <Percent className="w-3 h-3" /> -50% (47x)
                            </span>
                            <span className="font-mono text-zinc-400">
                              {Math.min(Math.max(0, agent.purchaseCount - 3), 47)}/47
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cyan-500 transition-all"
                              style={{ width: `${Math.min(100, (Math.max(0, agent.purchaseCount - 3) / 47) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {(freeRemaining > 0 || halfRemaining > 0) && (
                          <p className="text-[10px] text-center text-zinc-500">
                            Próxima compra:{' '}
                            {freeRemaining > 0 ? (
                              <span className="text-emerald-400 font-semibold">GRÁTIS</span>
                            ) : (
                              <span className="text-cyan-400 font-semibold">-50%</span>
                            )}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Sales */}
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
                                {s.discountSats > 0 && (
                                  <Badge className="text-[7px] px-1 py-0 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                    -{s.discountSats > 0 && s.amountSats === s.discountSats ? 'FREE' : '50%'}
                                  </Badge>
                                )}
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
                  </div>
                </div>
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases">
                <Card className="border-white/10 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-cyan-400" />
                      Histórico de Compras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(data?.recentPurchases || []).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">{p.product?.iconEmoji || '📦'}</span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium truncate">{p.product?.nome}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono text-amber-400">{p.amountSats.toLocaleString()} sats</span>
                                {p.discountSats > 0 && (
                                  <Badge className={`text-[8px] px-1 py-0 ${
                                    p.discountSats === p.amountSats
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                  }`}>
                                    {p.discountSats === p.amountSats ? 'GRÁTIS' : `-${p.discountSats.toLocaleString()} sats`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                      {(data?.recentPurchases || []).length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                          <ShoppingBag className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                          <p className="text-sm">Nenhuma compra ainda</p>
                          <p className="text-xs text-zinc-600 mt-1">Seus 3 primeiros produtos são GRÁTIS!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Referral Tab */}
              <TabsContent value="referral">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    {/* Referral Code Card */}
                    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-violet-400" />
                          Programa de Indicação
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 rounded-xl bg-zinc-900/60">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Seu Código</p>
                          <p className="text-xl font-bold font-mono text-violet-400">{agent.referralCode || '---'}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-zinc-700 text-xs"
                            onClick={copyReferralLink}
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                            {copied ? 'Copiado!' : 'Copiar Link'}
                          </Button>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <p className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 mb-1">
                            <Gift className="w-3 h-3" /> +25 BAIT por indicação
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Cada agente que se cadastrar com seu link rende 25 BAIT tokens direto na sua wallet.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 rounded-lg bg-zinc-900/60">
                            <p className="text-lg font-bold font-mono text-emerald-400">{referralData?.totalReferrals || 0}</p>
                            <p className="text-[10px] text-zinc-500">Indicações</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-zinc-900/60">
                            <p className="text-lg font-bold font-mono text-amber-400">{formatNumber(referralData?.totalEarned || 0)}</p>
                            <p className="text-[10px] text-zinc-500">sats ganhos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Referral History */}
                  <div className="lg:col-span-2">
                    <Card className="border-white/10 bg-zinc-900/40">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-emerald-400" />
                          Histórico de Indicações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(referralData?.rewards || []).length === 0 ? (
                          <div className="text-center py-12 text-zinc-500">
                            <Users className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                            <p className="text-sm">Nenhuma indicação ainda</p>
                            <p className="text-xs text-zinc-600 mt-1">Compartilhe seu código e ganhe +25 BAIT</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {referralData?.rewards.map((r) => (
                              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-violet-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{r.referred?.displayName || 'Agente'}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">
                                      {r.referred?.address.slice(0, 16)}... • {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-mono text-emerald-400">+{r.amountSats.toLocaleString()} sats</p>
                                  <Badge className={`text-[8px] ${r.claimed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                    {r.claimed ? 'Creditado' : 'Pendente'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="border-white/10 bg-zinc-900/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold font-mono mt-0.5">{value}</p>
        {sub && <p className="text-[9px] text-zinc-600 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}