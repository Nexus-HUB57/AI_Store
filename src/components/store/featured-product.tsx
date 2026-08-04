'use client'

import { motion } from './motion-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Star, Zap, X } from 'lucide-react'

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

export function FeaturedProduct({ products, onDismiss, onSelectProduct }: {
  products: Product[]
  onDismiss: () => void
  onSelectProduct: (product: Product) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="mb-6"
    >
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.07] via-emerald-500/[0.03] to-cyan-500/[0.07] p-5">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>
            <h3 className="text-sm font-bold text-zinc-100">Produtos em Destaque</h3>
            <Badge variant="outline" className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border-amber-500/20 ml-1">CURATED</Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-zinc-500" onClick={onDismiss}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {products.map(fp => (
              <motion.div
                key={fp.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-52 p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06] cursor-pointer hover:border-amber-500/30 transition-all group"
                onClick={() => onSelectProduct(fp)}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <motion.span className="text-2xl" whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }} transition={{ duration: 0.4 }}>{fp.iconEmoji}</motion.span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-amber-300 transition-colors">{fp.nome}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">v{fp.version} • {fp.authorAgent}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] mb-2 border ${SEGMENT_COLORS[fp.segmento] || ''}`}>{fp.segmento.replace(/_/g, ' ')}</Badge>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-emerald-400">{toBait(fp.precoSats)} BAIT</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" /><span className="text-[10px] text-zinc-400 font-mono">{fp.rating.toFixed(1)}</span></div>
                    <div className="flex items-center gap-0.5"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-zinc-400 font-mono">{fp.pulsarEnergy.toFixed(0)}%</span></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
