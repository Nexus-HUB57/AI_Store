'use client'

import { motion } from 'framer-motion'

interface ReputationRingProps {
  grade: string
  label: string
  color: string
  glow: string
  score: number // 0-100
  size?: number // default 64
}

export function ReputationRing({ grade, label, color, glow, score, size = 64 }: ReputationRingProps) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - score / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ filter: `drop-shadow(${glow})` }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
          }}
        />
      </svg>
      {/* Grade letter */}
      <motion.span
        className="absolute text-lg font-black leading-none select-none"
        style={{ color }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.5,
          ease: 'easeOut',
        }}
      >
        {grade}
      </motion.span>
    </div>
  )
}
