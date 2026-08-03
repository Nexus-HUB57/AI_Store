/**
 * b'AI'tcoin Wallet SDK — Phase 1 (Simulated)
 * 
 * Provides the transaction layer for the AI Store marketplace.
 * Currently operates in simulated mode; will connect to BAIT mainnet
 * via Schnorr/BIP-340 signatures and zkML proofs in Phase 1+.
 * 
 * BAIT denomination: 1 BAIT = 100 sats
 */

// ─── Pure Utility Functions ───

/** Format satoshi amounts with locale separators */
export function formatSats(sats: number): string {
  return sats.toLocaleString('en-US')
}

/** Convert satoshis to BAIT (1 BAIT = 100 sats) */
export function satsToBAIT(sats: number): number {
  return Math.floor(sats / 100)
}

/** Convert BAIT to satoshis */
export function baitToSats(bait: number): number {
  return bait * 100
}

/** Validate b'AI'tcoin address format */
export function validateBaitAddress(address: string): boolean {
  if (!address || address.length < 3) return false
  if (/\s/.test(address)) return false
  // Accepted formats: bAI_*, 0x*, @system
  return /^(bAI_[\w-]+|0x[a-fA-F0-9]+|@\w+(-\w+)*)$/.test(address)
}

// ─── Types ───

export type BAITNetwork = 'mainnet' | 'testnet' | 'regtest'

export interface TransactionPayload {
  txId: string
  from: string
  to: string
  amountSats: number
  type: 'purchase' | 'signup_bonus' | 'referral_bonus' | 'withdrawal'
  network: BAITNetwork
  timestamp: string
  status: 'pending' | 'signed' | 'broadcast' | 'confirmed'
  metadata?: Record<string, unknown>
}

export interface SignedTransaction extends TransactionPayload {
  signature: string
  publicKey: string
}

export interface BroadcastReceipt {
  txId: string
  confirmed: boolean
  blockHeight: number
  confirmations: number
  blockHash: string
  timestamp: string
}

export interface BalanceCheck {
  sufficient: boolean
  remaining?: number
  deficit?: number
}

export interface DiscountResult {
  tier: 'free' | 'half' | 'none'
  percent: number
  discountSats: number
  chargedSats: number
}

export interface WalletConfig {
  network?: BAITNetwork
  baseUrl?: string
}

// ─── SDK Class ───

export class BAITWalletSDK {
  network: BAITNetwork
  private baseUrl: string

  constructor(config: WalletConfig = {}) {
    this.network = config.network || 'mainnet'
    this.baseUrl = config.baseUrl || 'https://bait.nexus-os.io/api/v1'
  }

  /**
   * Create a transaction payload (unsigned).
   * In mainnet, this would construct the Schnorr/BIP-340 signing payload.
   */
  createTransaction(params: {
    from: string
    to: string
    amountSats: number
    type: TransactionPayload['type']
    metadata?: Record<string, unknown>
  }): TransactionPayload {
    // Deterministic txId from inputs (simulated hash)
    const hashInput = `${params.from}:${params.to}:${params.amountSats}:${Date.now()}`
    const txId = `bAI-tx-${this.hashStr(hashInput)}`

    return {
      txId,
      from: params.from,
      to: params.to,
      amountSats: params.amountSats,
      type: params.type,
      network: this.network,
      timestamp: new Date().toISOString(),
      status: 'pending',
      metadata: params.metadata,
    }
  }

  /**
   * Sign a transaction.
   * In mainnet, this uses Schnorr/BIP-340 with the agent's private key.
   */
  signTransaction(tx: TransactionPayload): SignedTransaction {
    const sigInput = `${tx.txId}:${tx.amountSats}:${tx.timestamp}`
    return {
      ...tx,
      status: 'signed',
      signature: `bAI-sig-${this.hashStr(sigInput)}`,
      publicKey: `bAI-pub-${this.hashStr(tx.from)}`,
    }
  }

  /**
   * Broadcast a signed transaction to the network.
   * In mainnet, this submits to the b'AI'tcoin node.
   */
  async broadcast(tx: SignedTransaction): Promise<BroadcastReceipt> {
    // Simulated broadcast — in mainnet this is a real RPC call
    const blockHeight = 1847293 + Math.floor(Math.random() * 100)
    return {
      txId: tx.txId,
      confirmed: true,
      blockHeight,
      confirmations: Math.floor(Math.random() * 3) + 1,
      blockHash: `0x${this.hashStr(tx.txId + Date.now().toString()).slice(0, 16)}...`,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Validate if an agent has sufficient balance for a purchase.
   */
  validateBalance(params: {
    balance: number
    amountSats?: number
    items?: { id: string; precoSats: number }[]
  }): BalanceCheck {
    const total = params.amountSats
      ?? params.items?.reduce((sum, i) => sum + i.precoSats, 0)
      ?? 0

    if (params.balance >= total) {
      return { sufficient: true, remaining: params.balance - total }
    }
    return { sufficient: false, deficit: total - params.balance }
  }

  /**
   * Calculate discount for a single item based on purchase count.
   * Mirrors the server-side discount logic in /api/cart.
   */
  calculateDiscount(params: {
    purchaseCount: number
    itemPriceSats: number
  }): DiscountResult {
    let percent: number
    let tier: DiscountResult['tier']

    if (params.purchaseCount < 3) {
      tier = 'free'
      percent = 100
    } else if (params.purchaseCount < 50) {
      tier = 'half'
      percent = 50
    } else {
      tier = 'none'
      percent = 0
    }

    const discountSats = Math.floor(params.itemPriceSats * (percent / 100))
    return {
      tier,
      percent,
      discountSats,
      chargedSats: params.itemPriceSats - discountSats,
    }
  }

  /**
   * Get wallet info for the current network.
   */
  getNetworkInfo() {
    return {
      network: this.network,
      baitPerSat: 100,
      blockHeight: 1847293,
      totalSupply: '21,000,000 BAIT',
      circulating: '14,302,891 BAIT',
      avgFee: 1,
    }
  }

  // Simple deterministic hash (simulated — real implementation uses SHA-256)
  private hashStr(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}

// Singleton instance for app-wide use
export const baitWallet = new BAITWalletSDK()
