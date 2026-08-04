'use client'

import { motion } from './motion-wrapper'
import dynamic from 'next/dynamic'
const AnimatedCounter = dynamic(() => import('@/components/store/animated-counter').then(m => ({ default: m.AnimatedCounter })), { ssr: false, loading: () => <span>...</span> })

const slideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/80 border border-white/[0.04]">
      {icon}<div><p className="text-[10px] text-zinc-500 uppercase">{label}</p><p className="text-sm font-semibold text-zinc-200 font-mono tabular-nums">{value}</p></div>
    </div>
  )
}

export function MiniStat({ icon, label, value, pulse, animatedValue }: { icon: React.ReactNode; label: string; value: string; pulse?: boolean; animatedValue?: number }) {
  const shouldAnimate = animatedValue !== undefined && animatedValue > 0 && typeof animatedValue === 'number' && !value.includes('%') && !value.includes('.')
  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" whileHover={{ scale: 1.02, transition: { duration: 0.2 } }} className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] hover:border-white/[0.1] transition-colors">
      <div className="shrink-0">{icon}</div><div><p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">{label}{pulse && <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />}</p><p className="text-sm font-bold font-mono text-zinc-200 tabular-nums">{shouldAnimate ? <AnimatedCounter target={animatedValue} /> : value}</p></div>
    </motion.div>
  )
}
