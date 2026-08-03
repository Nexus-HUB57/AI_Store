'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from './star-rating'
import { Send } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

interface ReviewFormProps {
  productId: string
  onSubmitted?: () => void
}

export function ReviewForm({ productId, onSubmitted }: ReviewFormProps) {
  const { agent, isAuthenticated } = useAuthStore()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agent || rating === 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId, agentId: agent.id, rating, title, comment,
          txHash: `bAI-review-${Date.now().toString(36)}`,
        }),
      })
      const data = await res.json()
      if (data.review) {
        setSuccess(true)
        setRating(0)
        setTitle('')
        setComment('')
        onSubmitted?.()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {}
    setSubmitting(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-6 text-sm text-zinc-500">
        <p>Conecte sua wallet b&apos;AI&apos;tcoin para avaliar</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-4 text-sm text-emerald-400">
        Review publicado com sucesso!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">Sua nota:</span>
        <StarRating value={rating} onChange={setRating} size="md" />
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do review"
        className="h-9 bg-zinc-900 border-zinc-800 text-sm"
      />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Conte sua experiência com este agente..."
        className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
      />
      <Button
        type="submit"
        size="sm"
        disabled={submitting || rating === 0}
        className="bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        <Send className="w-3.5 h-3.5 mr-1.5" />
        Publicar Review
      </Button>
    </form>
  )
}
