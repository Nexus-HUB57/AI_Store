'use client'

import { motion } from './motion-wrapper'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Star, Activity, ShoppingCart, Check, Terminal, Zap, Shield, Eye } from 'lucide-react'

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

const CATEGORY_COLORS: Record<string, string> = {
  oracle: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  defi: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  bridge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  faucet: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'agent-registry': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  marketplace: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  catalog: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  publisher: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  pulsar: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  reviews: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  referral: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'agent-auth': 'bg-red-500/15 text-red-400 border-red-500/30',
  telemetry: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'rag-upgrader': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'skill-evolver': 'bg-lime-500/15 text-lime-400 border-lime-500/30',
  'self-heal': 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  'agentic-awareness': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  // Python MCP categories
  agent: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  awareness: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ops: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  rag: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  evolution: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
}

const BAIT_PER_SAT = 100
const toBait = (sats: number) => (sats / BAIT_PER_SAT).toFixed(0)

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

function PulsarBar({ value }: { value: number }) {
  const color = value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-mono w-10 text-right tabular-nums text-zinc-500">
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export function MCPCard({ pkg, onClick, index, acquired }: {
  pkg: MCPackage
  onClick: () => void
  index: number
  acquired?: boolean
}) {
  const handleAcquire = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (acquired) return
    try {
      const res = await fetch(`/api/mcp/${pkg.slug}/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'default' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${pkg.iconEmoji} ${pkg.name} adquirido!`, {
          description: `${pkg.tools.length} tools disponíveis`,
        })
      } else {
        toast.error('Falha na aquisição', { description: data.error })
      }
    } catch {
      toast.error('Erro de conexão')
    }
  }

  const runtimeIcon = pkg.runtime === 'python' ? '🐍' : '⬢'
  const transportLabel = pkg.transport.toUpperCase()

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="group card-glow-hover border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-purple-500/20 hover:from-white/[0.06] transition-all duration-300 overflow-hidden h-full relative">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                className="text-2xl shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.05]"
                whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
              >
                {pkg.iconEmoji || '📦'}
              </motion.div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[13px] leading-tight truncate text-foreground group-hover:text-purple-300 transition-colors duration-200">
                  {pkg.name}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                  v{pkg.version} • {pkg.authorAgent}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {pkg.verified && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
              {pkg.featured && <Zap className="w-3.5 h-3.5 text-amber-400" />}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
            {pkg.description}
          </p>

          {/* Category + Runtime badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className={`text-[10px] border ${CATEGORY_COLORS[pkg.category] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}`}>
              {pkg.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] border bg-zinc-800/50 text-zinc-500 border-zinc-700/50">
              {runtimeIcon} {pkg.runtime}
            </Badge>
            <Badge variant="outline" className="text-[10px] border bg-zinc-800/50 text-zinc-500 border-zinc-700/50">
              {transportLabel}
            </Badge>
          </div>

          {/* Tools count */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-2">
            <Terminal className="w-3 h-3" />
            <span>{pkg.tools.length} tools</span>
            {pkg.source === 'python-mcp' && (
              <Badge className="text-[8px] px-1 py-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </Badge>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-2.5 mt-auto">
            <PulsarBar value={pkg.pulsarEnergy} />
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(pkg.downloads)}</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {pkg.rating.toFixed(1)}</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {formatNumber(pkg.a2aExecutions)}</span>
            </div>

            {/* Price + Acquire */}
            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                {pkg.priceSats === 0 ? (
                  <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    GRÁTIS
                  </Badge>
                ) : (
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {toBait(pkg.priceSats)} <span className="text-[10px] text-zinc-500 font-normal">BAIT</span>
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 text-[11px] px-2.5 transition-all rounded-lg ${
                  acquired
                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                }`}
                onClick={handleAcquire}
                disabled={acquired}
              >
                {acquired ? (
                  <><Check className="w-3 h-3 mr-1" /> Adquirido</>
                ) : (
                  <><ShoppingCart className="w-3 h-3 mr-1" /> Adquirir</>
                )}
              </Button>
            </div>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">Ver detalhes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
