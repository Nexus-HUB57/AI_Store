// ─── Reputation Engine ───
// Computes reputation scores (0-100) for agents based on weighted factors.
// Used to UPDATE the Agent.reputation field in the database.

export interface ReputationFactors {
  purchase_reliability: number
  review_quality: number
  activity_score: number
  tenure: number
  referral_contribution: number
  sandbox_utilization: number
  overall: number
  grade: string // S, A, B, C, D, F
}

// Weights for each factor (must sum to 1.0)
const WEIGHTS = {
  purchase_reliability: 0.25,
  review_quality: 0.20,
  activity_score: 0.15,
  tenure: 0.10,
  referral_contribution: 0.15,
  sandbox_utilization: 0.15,
} as const

/**
 * Logarithmic scaling: maps a value in [0, cap] to [0, 1].
 * Uses log(1 + x) / log(1 + cap) for smooth early-growth curve.
 */
function logScale(value: number, cap: number): number {
  if (value <= 0) return 0
  const clamped = Math.min(value, cap)
  return Math.log(1 + clamped) / Math.log(1 + cap)
}

/**
 * Compute reputation factors and overall score for an agent.
 *
 * @param agent - Agent data (fields are optional with sensible defaults)
 * @returns ReputationFactors with all sub-scores, overall score, and grade
 */
export function computeReputation(agent: {
  purchaseCount: number
  reputation: number
  balanceSats: number
  createdAt: Date
  referrals?: number
  reviewAvgRating?: number
  successfulTxs?: number
  totalTxs?: number
  sandboxTrials?: number
}): ReputationFactors {
  // ── purchase_reliability (25%): ratio of successful to total transactions ──
  const totalTxs = agent.totalTxs ?? 0
  const successfulTxs = agent.successfulTxs ?? 0
  let purchase_reliability: number
  if (totalTxs === 0) {
    // No transactions yet — neutral score (0.5) since we can't penalize
    purchase_reliability = 0.5
  } else {
    purchase_reliability = successfulTxs / totalTxs
  }

  // ── review_quality (20%): average of review ratings, normalized to 0-1 ──
  const reviewAvgRating = agent.reviewAvgRating ?? 0
  const review_quality = reviewAvgRating > 0
    ? reviewAvgRating / 5 // ratings are 1-5, normalize to 0-1
    : 0.5 // no reviews = neutral

  // ── activity_score (15%): logarithmic based on purchaseCount, cap at 100 ──
  const activity_score = logScale(agent.purchaseCount, 100)

  // ── tenure (10%): days since account creation, logarithmic, cap at 365 days ──
  const now = Date.now()
  const createdMs = new Date(agent.createdAt).getTime()
  const daysSinceCreation = Math.max(0, (now - createdMs) / (1000 * 60 * 60 * 24))
  const tenure = logScale(daysSinceCreation, 365)

  // ── referral_contribution (15%): based on successful referrals, cap at 10 ──
  const referrals = agent.referrals ?? 0
  const referral_contribution = logScale(referrals, 10)

  // ── sandbox_utilization (15%): based on sandbox trials, cap at 20 ──
  const sandboxTrials = agent.sandboxTrials ?? 0
  const sandbox_utilization = logScale(sandboxTrials, 20)

  // ── Compute weighted overall score ──
  const overall =
    purchase_reliability * WEIGHTS.purchase_reliability +
    review_quality * WEIGHTS.review_quality +
    activity_score * WEIGHTS.activity_score +
    tenure * WEIGHTS.tenure +
    referral_contribution * WEIGHTS.referral_contribution +
    sandbox_utilization * WEIGHTS.sandbox_utilization

  // Scale to 0-100 and clamp
  const scaledOverall = Math.round(Math.max(0, Math.min(100, overall * 100)) * 10) / 10

  // ── Determine grade ──
  const grade = getGrade(scaledOverall)

  return {
    purchase_reliability: Math.round(purchase_reliability * 1000) / 10,
    review_quality: Math.round(review_quality * 1000) / 10,
    activity_score: Math.round(activity_score * 1000) / 10,
    tenure: Math.round(tenure * 1000) / 10,
    referral_contribution: Math.round(referral_contribution * 1000) / 10,
    sandbox_utilization: Math.round(sandbox_utilization * 1000) / 10,
    overall: scaledOverall,
    grade,
  }
}

function getGrade(score: number): string {
  if (score >= 95) return 'S'
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

/**
 * Get visual badge styling for a reputation grade.
 * Returns color, label, and CSS glow for UI rendering.
 */
export function getReputationBadge(grade: string): { color: string; label: string; glow: string } {
  const badges: Record<string, { color: string; label: string; glow: string }> = {
    S: {
      color: '#10b981',
      label: 'S — Legendary',
      glow: '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.2)',
    },
    A: {
      color: '#06b6d4',
      label: 'A — Excellent',
      glow: '0 0 16px rgba(6, 182, 212, 0.4), 0 0 32px rgba(6, 182, 212, 0.15)',
    },
    B: {
      color: '#3b82f6',
      label: 'B — Good',
      glow: '0 0 12px rgba(59, 130, 246, 0.3), 0 0 24px rgba(59, 130, 246, 0.1)',
    },
    C: {
      color: '#f59e0b',
      label: 'C — Average',
      glow: '0 0 10px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.1)',
    },
    D: {
      color: '#f97316',
      label: 'D — Below Average',
      glow: '0 0 8px rgba(249, 115, 22, 0.3), 0 0 16px rgba(249, 115, 22, 0.1)',
    },
    F: {
      color: '#ef4444',
      label: 'F — Poor',
      glow: '0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.15)',
    },
  }
  return badges[grade] ?? badges['C']
}

// ── In-memory sandbox trial tracker ──
// In production, this should be replaced with Redis or DB persistence.
const sandboxTrialCounts = new Map<string, number>()

/**
 * Increment sandbox trial count for an agent (in-memory tracking).
 */
export function trackSandboxTrial(agentId: string): void {
  const current = sandboxTrialCounts.get(agentId) ?? 0
  sandboxTrialCounts.set(agentId, current + 1)
}

/**
 * Get current sandbox trial count for an agent.
 */
export function getSandboxTrialCount(agentId: string): number {
  return sandboxTrialCounts.get(agentId) ?? 0
}

/**
 * Reset sandbox trial count (useful for testing).
 */
export function resetSandboxTrials(agentId?: string): void {
  if (agentId) {
    sandboxTrialCounts.delete(agentId)
  } else {
    sandboxTrialCounts.clear()
  }
}
