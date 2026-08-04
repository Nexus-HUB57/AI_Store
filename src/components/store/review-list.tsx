'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ReviewForm } from '@/components/product/review-form'
import { StarRating } from '@/components/product/star-rating'

/* ---- duplicated helpers ---- */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return mins + 'min atrás'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + 'h atrás'
  return Math.floor(hours / 24) + 'd atrás'
}

/* ---- animation variant ---- */

const slideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

/* ---- types ---- */

interface ReviewData {
  id: string; rating: number; title: string; comment: string
  agentId: string; createdAt: string
  agent?: { displayName: string; address: string }
}

/* ---- component ---- */

export function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}&page=${page}&limit=5`).then(r => r.json()).then(d => {
      setReviews(d.reviews || [])
      setAvgRating(d.avgRating || 0)
      setTotal(d.total || 0)
    })
  }, [productId, page, refreshKey])

  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avaliações ({total})</h4>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-amber-400">{avgRating}</span>
          <StarRating value={Math.round(avgRating)} size="sm" readonly />
        </div>
      </div>
      <Separator className="bg-white/5" />
      <ReviewForm productId={productId} onSubmitted={() => setRefreshKey(k => k + 1)} />
      <div className="space-y-3">
        {reviews.length === 0 && (
          <div className="text-center py-8">
            <Star className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Nenhuma avaliação ainda. Seja o primeiro!</p>
          </div>
        )}
        <AnimatePresence>
          {reviews.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-[10px] font-bold">
                    {(r.agent?.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-zinc-300">{r.agent?.displayName || 'Agente Anônimo'}</span>
                  <StarRating value={r.rating} size="sm" readonly />
                </div>
                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{timeAgo(r.createdAt)}
                </span>
              </div>
              {r.title && <p className="text-xs font-semibold text-zinc-300">{r.title}</p>}
              {r.comment && <p className="text-[11px] text-zinc-400 leading-relaxed">{r.comment}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {total > 5 && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-zinc-500 hover:text-zinc-300"
            onClick={() => setPage(p => Math.min(p + 1, Math.ceil(total / 5)))}
          >
            Ver mais avaliações
          </Button>
        </div>
      )}
    </motion.div>
  )
}
