'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StarRating } from '@/components/product/star-rating'
import { ReviewList } from '@/components/store/review-list'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import {
  Zap, Activity, Download, Package, Star, Sparkles,
  ShoppingCart, Plus, ExternalLink,
} from 'lucide-react'

/* ---- types ---- */

interface Product {
  id: string; nome: string; slug: string; segmento: string
  coreBusiness: string; publicoAlvoAI: string; disponibilidadeOS: string
  repoGithubUrl: string; precoSats: number; downloads: number
  rating: number; pulsarEnergy: number; fitnessScore: number
  a2aExecutions: number; version: string; authorAgent: string
  iconEmoji: string; featured: boolean
}

/* ---- duplicated constants & helpers ---- */

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

function getDiscountBadge(purchaseCount: number, idx: number): { label: string; color: string } | null {
  const pos = purchaseCount + idx
  if (pos < 3) return { label: 'GRÁTIS', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
  if (pos < 50) return { label: '-50%', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
  return null
}

/* ---- local StatCard (duplicated from page.tsx) ---- */

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
      {icon}<div><p className="text-[10px] text-zinc-500 uppercase">{label}</p><p className="text-sm font-semibold text-zinc-200 font-mono tabular-nums">{value}</p></div>
    </div>
  )
}

/* ---- component ---- */

export function ProductDetailDialog({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
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
