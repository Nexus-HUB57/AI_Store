'use client'

import { motion } from './motion-wrapper'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Star, Activity, ShoppingCart, Plus, Sparkles, Eye } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

interface Product {
  id: string; nome: string; slug: string; segmento: string
  coreBusiness: string; publicoAlvoAI: string; disponibilidadeOS: string
  repoGithubUrl: string; precoSats: number; downloads: number
  rating: number; pulsarEnergy: number; fitnessScore: number
  a2aExecutions: number; version: string; authorAgent: string
  iconEmoji: string; featured: boolean
}

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

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.025, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

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

export function ProductCard({ product, onClick, discountBadge, index, liveUpdates = {} }: {
  product: Product; onClick: () => void; discountBadge?: { label: string; color: string } | null; index: number; liveUpdates?: Record<string, number>
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
      <Card className="group card-glow-hover border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-emerald-500/20 hover:from-white/[0.06] transition-all duration-300 overflow-hidden h-full relative">
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
            <PulsarBar value={product.pulsarEnergy} productId={product.id} liveUpdates={liveUpdates} />
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
          {/* Hover overlay - Ver detalhes */}
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">Ver detalhes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
