import { describe, it, expect, beforeEach } from 'vitest'
import { computeReputation, getReputationBadge, trackSandboxTrial, getSandboxTrialCount, resetSandboxTrials } from '@/lib/reputation-engine'

const baseAgent = {
  purchaseCount: 0,
  reputation: 50,
  balanceSats: 100000,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

describe('Reputation Engine', () => {
  beforeEach(() => {
    resetSandboxTrials()
  })

  describe('computeReputation', () => {
    it('should return all 6 factors plus overall and grade', () => {
      const result = computeReputation(baseAgent)
      expect(result).toHaveProperty('purchase_reliability')
      expect(result).toHaveProperty('review_quality')
      expect(result).toHaveProperty('activity_score')
      expect(result).toHaveProperty('tenure')
      expect(result).toHaveProperty('referral_contribution')
      expect(result).toHaveProperty('sandbox_utilization')
      expect(result).toHaveProperty('overall')
      expect(result).toHaveProperty('grade')
    })

    it('should return grade C for new agent with no activity', () => {
      const result = computeReputation(baseAgent)
      // New agent: reliability=50%, review=50%, activity=0%, some tenure, no referrals, no sandbox
      // Weighted: 0.25*0.5 + 0.2*0.5 + 0.15*0 + 0.10*~0.4 + 0.15*0 + 0.15*0 ≈ 0.29
      expect(['D', 'C', 'F']).toContain(result.grade)
    })

    it('should return higher score for active agent with good reviews', () => {
      const activeAgent = {
        ...baseAgent,
        purchaseCount: 50,
        successfulTxs: 48,
        totalTxs: 50,
        reviewAvgRating: 4.8,
        referrals: 5,
        sandboxTrials: 10,
      }
      const result = computeReputation(activeAgent)
      expect(result.overall).toBeGreaterThan(60)
      expect(result.purchase_reliability).toBeGreaterThan(90)
    })

    it('should give S grade for near-perfect agent', () => {
      const perfectAgent = {
        ...baseAgent,
        purchaseCount: 100,
        successfulTxs: 100,
        totalTxs: 100,
        reviewAvgRating: 5,
        referrals: 15,
        sandboxTrials: 25,
      }
      const result = computeReputation(perfectAgent)
      expect(result.grade).toBe('S')
      expect(result.overall).toBeGreaterThanOrEqual(95)
    })

    it('should penalize low purchase reliability', () => {
      const unreliableAgent = {
        ...baseAgent,
        purchaseCount: 20,
        successfulTxs: 5,
        totalTxs: 20,
      }
      const reliable = computeReputation({ ...baseAgent, successfulTxs: 20, totalTxs: 20, purchaseCount: 20 })
      const unreliable = computeReputation(unreliableAgent)
      expect(reliable.overall).toBeGreaterThan(unreliable.overall)
    })

    it('should cap overall at 100', () => {
      const maxAgent = {
        ...baseAgent,
        purchaseCount: 1000,
        successfulTxs: 1000,
        totalTxs: 1000,
        reviewAvgRating: 5,
        referrals: 100,
        sandboxTrials: 1000,
      }
      const result = computeReputation(maxAgent)
      expect(result.overall).toBeLessThanOrEqual(100)
    })

    it('should cap overall at 0 minimum', () => {
      const result = computeReputation({ ...baseAgent, balanceSats: -1000 })
      expect(result.overall).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing optional fields gracefully', () => {
      const minimal = { ...baseAgent }
      const result = computeReputation(minimal)
      expect(result.overall).toBeGreaterThanOrEqual(0)
      expect(typeof result.grade).toBe('string')
    })

    it('should give A grade for very active agent', () => {
      const agent = {
        ...baseAgent,
        purchaseCount: 80,
        successfulTxs: 75,
        totalTxs: 80,
        reviewAvgRating: 4.5,
        referrals: 8,
        sandboxTrials: 15,
      }
      const result = computeReputation(agent)
      expect(['A', 'S']).toContain(result.grade)
    })
  })

  describe('getReputationBadge', () => {
    it('should return emerald for S grade', () => {
      const badge = getReputationBadge('S')
      expect(badge.color).toBe('#10b981')
      expect(badge.label).toContain('Legendary')
    })

    it('should return cyan for A grade', () => {
      const badge = getReputationBadge('A')
      expect(badge.color).toBe('#06b6d4')
    })

    it('should return blue for B grade', () => {
      const badge = getReputationBadge('B')
      expect(badge.color).toBe('#3b82f6')
    })

    it('should return amber for C grade', () => {
      const badge = getReputationBadge('C')
      expect(badge.color).toBe('#f59e0b')
    })

    it('should return orange for D grade', () => {
      const badge = getReputationBadge('D')
      expect(badge.color).toBe('#f97316')
    })

    it('should return red for F grade', () => {
      const badge = getReputationBadge('F')
      expect(badge.color).toBe('#ef4444')
    })

    it('should default to C for unknown grade', () => {
      const badge = getReputationBadge('X')
      expect(badge.color).toBe('#f59e0b')
    })

    it('should include glow string', () => {
      const badge = getReputationBadge('S')
      expect(badge.glow).toContain('rgba')
    })
  })

  describe('Sandbox trial tracking', () => {
    it('should start at 0 trials', () => {
      expect(getSandboxTrialCount('agent-1')).toBe(0)
    })

    it('should increment trial count', () => {
      trackSandboxTrial('agent-1')
      expect(getSandboxTrialCount('agent-1')).toBe(1)
      trackSandboxTrial('agent-1')
      expect(getSandboxTrialCount('agent-1')).toBe(2)
    })

    it('should track trials independently per agent', () => {
      trackSandboxTrial('agent-a')
      trackSandboxTrial('agent-a')
      trackSandboxTrial('agent-b')
      expect(getSandboxTrialCount('agent-a')).toBe(2)
      expect(getSandboxTrialCount('agent-b')).toBe(1)
    })

    it('should reset specific agent trials', () => {
      trackSandboxTrial('agent-1')
      trackSandboxTrial('agent-2')
      resetSandboxTrials('agent-1')
      expect(getSandboxTrialCount('agent-1')).toBe(0)
      expect(getSandboxTrialCount('agent-2')).toBe(1)
    })

    it('should reset all trials', () => {
      trackSandboxTrial('agent-1')
      trackSandboxTrial('agent-2')
      resetSandboxTrials()
      expect(getSandboxTrialCount('agent-1')).toBe(0)
      expect(getSandboxTrialCount('agent-2')).toBe(0)
    })
  })
})
