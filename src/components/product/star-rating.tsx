'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export function StarRating({
  value,
  onChange,
  size = 'sm',
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-zinc-700 text-zinc-700'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
