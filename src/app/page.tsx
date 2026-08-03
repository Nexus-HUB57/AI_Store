'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Search, Zap, Download, Star, Activity, ArrowUpDown,
  ChevronLeft, ChevronRight, ExternalLink, Cpu, Shield,
  TrendingUp, Package, Sparkles, Layers, ShoppingCart,
  Plus, Wifi, WifiOff, Radio, Gift, X, Eye, Users,
  Coins, Clock, BarChart3, Copy, Check, ArrowRight, Keyboard,
  LayoutDashboard, LogOut, User, Loader2, Hash, ChevronDown,
} from 'lucide-react'
import { CartPanel } from '@/components/store/cart-panel'
import { UploadAipkgDialog } from '@/components/store/upload-aipkg-dialog'
import { LoginDialog } from '@/components/auth/login-dialog'
import { usePulsarSSE } from '@/hooks/use-pulsar-sse'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ReviewForm } from '@/components/product/review-form'
import { StarRating } from '@/components/product/star-rating'
import { Progress } from '@/components/ui/progress'

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
const baitLabel = (sats: number) => (sats / BAIT_PER_SAT).toFixed(0) + ' BAIT'

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

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.025, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const slideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const staggerContainer = {
  hidden: {}, visible: { transition: { staggerChildren: 0.04 } },
}

/* ================================================================== */
/*  PulsarBar                                                          */
/* ================================================================== */

function PulsarBar({ value, productId, liveUpdates }: { value: number; productId: string; liveUpdates: Record<string, number> }) {
  const liveValue = liveUpdates[productId] ?? value
  const color = liveValue >= 90 ? 'bg-emerald-500' : liveValue >= 70 ? 'bg-amber-500' : 'bg-rose-500'
  const isLive = productId in liveUpdates
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color} ${isLive ? 'shadow-sm shadow-emerald-500/30' : ''}`}
          initial={false}
          animate={{ width: `${liveValue}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-mono w-10 text-right tabular-nums ${isLive ? 'text-emerald-400' : 'text-zinc-500'}`}>
        {liveValue.toFixed(0)}%
        {isLive && (
          <motion.span
            className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </span>
    </div>
  )
}

/* ================================================================== */
/*  ProductCard                                                        */
/* ================================================================== */

function ProductCard({ product, onClick, discountBadge, index }: {
  product: Product; onClick: () => void; discountBadge?: { label: string; color: string } | null; index: number
}) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const inCart = items.some((i) => i.id === product.id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (inCart) { toast.info(`${product.iconEmoji} ${product.nome} já está no carrinho`); return }
    addItem({ id: product.id, nome: product.nome, precoSats: product.precoSats, iconEmoji: product.iconEmoji, segmento: product.segmento, version: product.version, authorAgent: product.authorAgent })
    toast.success(`${product.iconEmoji} Adicionado`, { description: `${product.nome} — ${baitLabel(product.precoSats)}` })
  }

  return (
    <motion.div variants={cardVariants} custom={index} initial="hidden" animate="visible" whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.985 }} className="cursor-pointer" onClick={onClick}>
      <Card className="group border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-white/[0.15] hover:from-white/[0.06] transition-all duration-300 overflow-hidden h-full">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <motion.div className="text-2xl shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.05]" whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}>
                {product.iconEmoji || '📦'}
              </motion.div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[13px] leading-tight truncate text-foreground group-hover:text-emerald-300 transition-colors duration-200">{product.nome}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">v{product.version} • {product.authorAgent}</p>
              </div>
            </div>
            {product.featured && (
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">{product.coreBusiness}</p>
          <Badge variant="outline" className={`text-[10px] mb-3 border self-start ${SEGMENT_COLORS[product.segmento] || ''}`}>{product.segmento.replace(/_/g, ' ')}</Badge>
          <div className="space-y-2.5 mt-auto">
            <PulsarBar value={product.pulsarEnergy} productId={product.id} liveUpdates={{}} />
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(product.downloads)}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {product.rating.toFixed(1)}</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {formatNumber(product.a2aExecutions)}</span>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                {discountBadge ? (
                  <>
                    <span className="text-[10px] font-mono text-zinc-600 line-through">{toBait(product.precoSats)} BAIT</span>
                    <Badge className={`text-[8px] px-1 py-0 border ${discountBadge.color}`}>{discountBadge.label}</Badge>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {discountBadge.label === 'GRÁTIS' ? '0 BAIT' : toBait(Math.floor(product.precoSats / 2)) + ' BAIT'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold font-mono text-emerald-400">{toBait(product.precoSats)} <span className="text-[10px] text-zinc-500 font-normal">BAIT</span></span>
                )}
              </div>
              <Button size="sm" variant="ghost" className={`h-7 text-[11px] px-2.5 transition-all rounded-lg ${inCart ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/15' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'}`} onClick={handleAddToCart}>
                <motion.span animate={inCart ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>{inCart ? <ShoppingCart className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}</motion.span>
                {inCart ? 'No Carrinho' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ================================================================== */
/*  ReviewList                                                         */
/* ================================================================== */

interface ReviewData { id: string; rating: number; title: string; comment: string; agentId: string; createdAt: string; agent?: { displayName: string; address: string } }

function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}&page=${page}&limit=5`).then(r => r.json()).then(d => { setReviews(d.reviews || []); setAvgRating(d.avgRating || 0); setTotal(d.total || 0) })
  }, [productId, page, refreshKey])
  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avaliações ({total})</h4>
        <div className="flex items-center gap-1.5"><span className="text-lg font-bold text-amber-400">{avgRating}</span><StarRating value={Math.round(avgRating)} size="sm" readonly /></div>
      </div>
      <Separator className="bg-white/5" />
      <ReviewForm productId={productId} onSubmitted={() => setRefreshKey(k => k + 1)} />
      <div className="space-y-3">
        {reviews.length === 0 && (<div className="text-center py-8"><Star className="w-8 h-8 text-zinc-700 mx-auto mb-2" /><p className="text-xs text-zinc-500">Nenhuma avaliação ainda. Seja o primeiro!</p></div>)}
        <AnimatePresence>{reviews.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-[10px] font-bold">{(r.agent?.displayName || '?').charAt(0).toUpperCase()}</div>
                <span className="text-xs font-medium text-zinc-300">{r.agent?.displayName || 'Agente Anônimo'}</span>
                <StarRating value={r.rating} size="sm" readonly />
              </div>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(r.createdAt)}</span>
            </div>
            {r.title && <p className="text-xs font-semibold text-zinc-300">{r.title}</p>}
            {r.comment && <p className="text-[11px] text-zinc-400 leading-relaxed">{r.comment}</p>}
          </motion.div>
        ))}</AnimatePresence>
      </div>
      {total > 5 && (<div className="flex justify-center"><Button variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setPage(p => Math.min(p + 1, Math.ceil(total / 5)))}>Ver mais avaliações</Button></div>)}
    </motion.div>
  )
}

/* ================================================================== */
/*  StatCard & MiniStat                                                */
/* ================================================================== */

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
      {icon}<div><p className="text-[10px] text-zinc-500 uppercase">{label}</p><p className="text-sm font-semibold text-zinc-200 font-mono tabular-nums">{value}</p></div>
    </div>
  )
}

function MiniStat({ icon, label, value, pulse }: { icon: React.ReactNode; label: string; value: string; pulse?: boolean }) {
  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] hover:border-white/[0.1] transition-colors">
      <div className="shrink-0">{icon}</div><div><p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">{label}{pulse && <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />}</p><p className="text-sm font-bold font-mono text-zinc-200 tabular-nums">{value}</p></div>
    </motion.div>
  )
}

/* ================================================================== */
/*  ProductDetail                                                      */
/* ================================================================== */

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

  const handleAddToCart = () => {
    if (inCart) { toast.info(`${product.iconEmoji} ${product.nome} já está no carrinho`); return }
    addItem({ id: product.id, nome: product.nome, precoSats: product.precoSats, iconEmoji: product.iconEmoji, segmento: product.segmento, version: product.version, authorAgent: product.authorAgent })
    toast.success(`${product.iconEmoji} Adicionado ao carrinho`, { description: `${product.nome} — ${baitLabel(chargedPrice)}` })
  }

  const platforms = product.disponibilidadeOS?.split(',').map(s => s.trim()).filter(Boolean) || []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <motion.div
                className="text-3xl w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.06] shrink-0"
                whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
              >
                {product.iconEmoji || '📦'}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold text-zinc-100">{product.nome}</DialogTitle>
                  <Badge variant="outline" className="text-[10px] font-mono bg-zinc-800/50 text-zinc-400 border-zinc-700">v{product.version}</Badge>
                  {product.featured && (
                    <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />Destaque
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">por {product.authorAgent}</p>
              </div>
            </div>
          </DialogHeader>

          <Badge variant="outline" className={`text-[10px] mb-4 border ${SEGMENT_COLORS[product.segmento] || ''}`}>
            {product.segmento.replace(/_/g, ' ')}
          </Badge>

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="bg-zinc-900/50 border border-zinc-800">
              <TabsTrigger value="info" className="text-xs data-[state=active]:bg-zinc-800">Info</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs data-[state=active]:bg-zinc-800">Avaliações</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-5">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Descrição</h4>
                <p className="text-sm text-zinc-300 leading-relaxed">{product.coreBusiness}</p>
              </motion.div>

              {product.publicoAlvoAI && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Público-Alvo IA</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{product.publicoAlvoAI}</p>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Preço</h4>
                <div className="flex items-center gap-3">
                  {discount ? (
                    <>
                      <span className="text-sm font-mono text-zinc-600 line-through">{toBait(product.precoSats)} BAIT</span>
                      <Badge className={`text-[10px] border ${discount.color}`}>{discount.label}</Badge>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {discount.label === 'GRÁTIS' ? '0 BAIT' : toBait(chargedPrice) + ' BAIT'}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold font-mono text-emerald-400">{toBait(product.precoSats)} <span className="text-xs text-zinc-500 font-normal">BAIT</span></span>
                  )}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex items-center gap-2">
                <StarRating value={Math.round(product.rating)} readonly />
                <span className="text-sm font-semibold text-zinc-200">{product.rating.toFixed(1)}</span>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-2">
                <StatCard icon={<Zap className="w-4 h-4 text-amber-400" />} label="Pulsar" value={product.pulsarEnergy.toFixed(0) + '%'} />
                <StatCard icon={<Activity className="w-4 h-4 text-emerald-400" />} label="Fitness" value={product.fitnessScore.toFixed(0) + '%'} />
                <StatCard icon={<Download className="w-4 h-4 text-cyan-400" />} label="Downloads" value={formatNumber(product.downloads)} />
                <StatCard icon={<Package className="w-4 h-4 text-violet-400" />} label="Execuções" value={formatNumber(product.a2aExecutions)} />
              </motion.div>

              {platforms.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Plataformas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {platforms.map(p => (
                      <Badge key={p} variant="outline" className="text-[10px] bg-zinc-800/50 text-zinc-400 border-zinc-700">{p}</Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  className={`flex-1 ${inCart ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {inCart ? <><ShoppingCart className="w-4 h-4 mr-2" />No Carrinho</> : <><Plus className="w-4 h-4 mr-2" />Adicionar ao Carrinho</>}
                </Button>
                {product.repoGithubUrl && (
                  <Button variant="outline" size="icon" asChild className="border-zinc-700 hover:bg-zinc-800">
                    <a href={product.repoGithubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <ReviewList productId={product.id} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
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
                placeholder="Buscar agentes, skills, pacotes..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-16 h-9 bg-zinc-900/80 border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50"
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
            <MiniStat icon={<Package className="w-5 h-5 text-emerald-400" />} label="Produtos" value={String(stats.total)} />
            <MiniStat icon={<Zap className="w-5 h-5 text-amber-400" />} label="Pulsar Médio" value={stats.avgPulsarEnergy.toFixed(0) + '%'} pulse={connected} />
            <MiniStat icon={<Download className="w-5 h-5 text-cyan-400" />} label="Downloads" value={formatNumber(stats.totalDownloads)} />
            <MiniStat icon={<Activity className="w-5 h-5 text-violet-400" />} label="Execuções" value={formatNumber(stats.totalExecutions)} />
            <MiniStat icon={<Sparkles className="w-5 h-5 text-amber-400" />} label="Destaque" value={String(stats.featuredCount)} />
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
              Todos ({stats.total})
            </motion.button>
            {stats.categories.map(cat => (
              <motion.button
                key={cat.key}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleCategory(cat.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${segmento === cat.key ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
              >
                {cat.nome} ({cat.count})
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
          <span className="text-[11px] text-zinc-600">{total} produto{total !== 1 ? 's' : ''}</span>
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
          {showFeatured && !search && segmento === 'all' && featuredProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mb-6"
            >
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10 p-5">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-emerald-500/5 animate-gradient" style={{ backgroundSize: '200% 200%' }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-zinc-100">Produtos em Destaque</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-zinc-500" onClick={() => setShowFeatured(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {featuredProducts.map(fp => (
                      <motion.div
                        key={fp.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="shrink-0 w-48 p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-colors"
                        onClick={() => setSelectedProduct(fp)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{fp.iconEmoji}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate">{fp.nome}</p>
                            <p className="text-[10px] text-zinc-600 font-mono">v{fp.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-emerald-400">{toBait(fp.precoSats)} BAIT</span>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] font-mono text-zinc-400">{fp.pulsarEnergy.toFixed(0)}%</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
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
                  onClick={() => setSelectedProduct(product)}
                />
              )
            })}
          </motion.div>
        )}

        {/* Empty state for search */}
        {!loading && search && displayProducts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-1">Nenhum resultado</h3>
            <p className="text-sm text-zinc-600">Tente buscar por outro termo</p>
            <Button variant="ghost" className="mt-4 text-xs text-zinc-500" onClick={() => handleSearch('')}>Limpar busca</Button>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skeletonCount.map(i => (
              <Card key={i} className="border-white/[0.05] bg-zinc-900/40">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-xl bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
                      <Skeleton className="h-2.5 w-1/2 bg-zinc-800" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full bg-zinc-800" />
                  <Skeleton className="h-3 w-20 bg-zinc-800" />
                  <div className="pt-2.5 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16 bg-zinc-800" />
                      <Skeleton className="h-7 w-20 bg-zinc-800" />
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
      <footer className="border-t border-white/[0.06] bg-zinc-950/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Branding */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-300">AI Store</p>
                <p className="text-[10px] text-zinc-600 font-mono">v1.0.0-beta</p>
              </div>
            </div>

            {/* Protocol badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">A2A-RPC/v1</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">PULSAR/NET</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">BAIT-100</Badge>
              <Badge variant="outline" className="text-[9px] font-mono bg-zinc-900/60 text-zinc-500 border-zinc-800">NEXUS-OS</Badge>
            </div>

            {/* Go Live status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <motion.span className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                  <span className="text-[10px] font-mono text-emerald-400">Pulsar SSE Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[10px] font-mono text-zinc-600">Pulsar Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ============ Overlays ============ */}
      <CartPanel />
      <ProductDetail product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
      <DashboardSheet open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </div>
  )
}
