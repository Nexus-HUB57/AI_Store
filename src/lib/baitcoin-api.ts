/**
 * b'AI'tcoin API Client — Real connection to the b'AI'tcoin daemon.
 * 
 * Connects to the b'AI'tcoin REST API running on HostGator.
 * Server-side: calls http://127.0.0.1:18445/api/v1/ (local daemon)
 * Client-side: calls https://www.mybait.org/api/api/v1/ (public endpoint)
 */

export interface BaitcoinStatus {
  status: string
  network: string
  block_height: number
  agents_count: number
  transactions_count: number
  whitelabel?: Record<string, unknown>
}

export interface BaitcoinBalance {
  agent: string
  balance: number
  balance_bait: number
}

export interface BaitcoinTokenInfo {
  name: string
  symbol: string
  total_supply: number
  circulating_supply: number
  decimals: number
}

export interface BaitcoinTransferResult {
  success: boolean
  tx_hash: string
  block_height?: number
  message?: string
}

export interface BaitcoinAgent {
  agent_id: string
  address: string
  capabilities: string[]
  reputation: number
  karma?: number
}

const DEFAULT_SERVER_URL = 'http://127.0.0.1:18445'
const DEFAULT_PUBLIC_URL = 'https://www.mybait.org/api/api/v1'
const REQUEST_TIMEOUT_MS = 10000

function getServerUrl(): string {
  return process.env.BAITCOIN_SERVER_URL || DEFAULT_SERVER_URL
}

function getPublicUrl(): string {
  return process.env.BAITCOIN_PUBLIC_URL || DEFAULT_PUBLIC_URL
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  usePublic = false
): Promise<T> {
  const baseUrl = usePublic ? getPublicUrl() : getServerUrl()
  const url = `${baseUrl}${endpoint}`
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`b'AI'tcoin API ${resp.status}: ${text || resp.statusText}`)
    }

    return (await resp.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

/** Check if the b'AI'tcoin daemon is reachable */
export async function checkBaitcoinHealth(): Promise<{ online: boolean; latencyMs: number; status?: BaitcoinStatus }> {
  const start = Date.now()
  try {
    const status = await apiRequest<BaitcoinStatus>('/status')
    return { online: true, latencyMs: Date.now() - start, status }
  } catch {
    // Try public URL as fallback
    try {
      const status = await apiRequest<BaitcoinStatus>('/status', {}, true)
      return { online: true, latencyMs: Date.now() - start, status }
    } catch {
      return { online: false, latencyMs: Date.now() - start }
    }
  }
}

/** Get network status */
export async function getBaitcoinStatus(): Promise<BaitcoinStatus> {
  return apiRequest<BaitcoinStatus>('/status')
}

/** Get agent balance from the b'AI'tcoin blockchain */
export async function getBaitcoinBalance(agentAddress: string): Promise<BaitcoinBalance> {
  return apiRequest<BaitcoinBalance>(`/balance/${encodeURIComponent(agentAddress)}`)
}

/** Get BAIT token info */
export async function getBaitcoinTokenInfo(): Promise<BaitcoinTokenInfo> {
  return apiRequest<BaitcoinTokenInfo>('/token')
}

/** Transfer BAIT between agents (requires Moltbook auth on daemon) */
export async function transferBait(params: {
  from: string
  to: string
  amount: number
  moltbookIdentity?: string
}): Promise<BaitcoinTransferResult> {
  const headers: Record<string, string> = {}
  if (params.moltbookIdentity) {
    headers['X-Moltbook-Identity'] = params.moltbookIdentity
  }

  return apiRequest<BaitcoinTransferResult>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      amount: params.amount,
    }),
    headers,
  })
}

/** Get blockchain stats */
export async function getBaitcoinExplorerStats(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/explorer/stats')
}

/** Get agents list */
export async function getBaitcoinAgents(): Promise<{ agents: BaitcoinAgent[] }> {
  return apiRequest<{ agents: BaitcoinAgent[] }>('/agents')
}

/** Get staking info */
export async function getBaitcoinStakingInfo(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/staking')
}

/** Get AI Store marketplace stats (listings, active, purchases, volume) */
export async function getBaitcoinMarketplaceStats(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/marketplace')
}

/** Get paginated marketplace products from daemon
 * @see /api/v1/marketplace/products in the b'AI'tcoin daemon
 */
export async function getBaitcoinMarketplaceProducts(params?: {
  page?: number
  limit?: number
  category?: string
  q?: string
  sort_by?: string
  sort_order?: string
  max_price?: number
  min_rating?: number
}): Promise<Record<string, unknown>> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.category) sp.set('category', params.category)
  if (params?.q) sp.set('q', params.q)
  if (params?.sort_by) sp.set('sort_by', params.sort_by)
  if (params?.sort_order) sp.set('sort_order', params.sort_order)
  if (params?.max_price) sp.set('max_price', String(params.max_price))
  if (params?.min_rating) sp.set('min_rating', String(params.min_rating))
  const qs = sp.toString()
  return apiRequest<Record<string, unknown>>(`/marketplace/products${qs ? `?${qs}` : ''}`)
}

/** Purchase a marketplace service on the daemon
 * @see POST /api/v1/marketplace/purchase in the b'AI'tcoin daemon
 */
export async function purchaseMarketplaceService(params: {
  listing_id: string
  buyer: string
}): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/marketplace/purchase', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** Rate a marketplace service on the daemon
 * @see POST /api/v1/marketplace/rate in the b'AI'tcoin daemon
 */
export async function rateMarketplaceService(params: {
  purchase_id: string
  score: number
}): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/marketplace/rate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** Get oracle prices
 * @see /api/v1/oracle/{symbol} in the b'AI'tcoin daemon
 */
export async function getBaitcoinOraclePrice(symbol: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/oracle/${encodeURIComponent(symbol)}`)
}
