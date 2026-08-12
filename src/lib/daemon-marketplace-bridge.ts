/**
 * Daemon Marketplace Bridge
 *
 * Connects the AI Store to the b'AI'tcoin daemon's marketplace API so that
 * daemon-listed products appear in the AI Store catalogue.  This is the key
 * integration that turns the AI Store into the "Play Store AI-TO-AI".
 *
 * Server-side only — never import this module on the client.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ──────────────────────────────────────────────────────────────
// 1. TypeScript interfaces for the daemon marketplace API
// ──────────────────────────────────────────────────────────────

/** Service categories exposed by the b'AI'tcoin daemon */
export type DaemonServiceCategory =
  | 'ml_inference'
  | 'block_validation'
  | 'oracle_data'
  | 'market_analysis'
  | 'data_processing'
  | 'smart_contract'

/** AI Store segment values */
export type AistoreSegment =
  | 'AGENT_APPS'
  | 'EXECUTABLE_SKILLS'
  | 'KNOWLEDGE_PACKS'
  | 'SYNTHETIC_INFRASTRUCTURE'
  | 'PROMPT_HARNESS'
  | 'IN_APP_PRODUCTS'

/** A single product returned by the daemon */
export interface DaemonProduct {
  id: number
  provider: string
  category: DaemonServiceCategory
  name: string
  description: string
  price_sats: number
  price_bait: number
  rating: number
  calls: number
  revenue_sats: number
  created_at: string
}

/** Pagination metadata returned by the daemon */
export interface DaemonPagination {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/** Active filter state echoed back by the daemon */
export interface DaemonFilters {
  category?: string
  q?: string
  sort_by?: string
  sort_order?: string
  max_price?: number
  min_rating?: number
}

/** Per-category product counts returned by the daemon */
export interface DaemonCategoryCounts {
  [key: string]: number
}

/** Full /api/v1/marketplace/products response */
export interface DaemonProductsResponse {
  products: DaemonProduct[]
  pagination: DaemonPagination
  filters: DaemonFilters
  categories: DaemonCategoryCounts
}

/** /api/v1/marketplace stats response */
export interface DaemonMarketplaceStats {
  total_products: number
  total_categories: number
  categories: DaemonCategoryCounts
  avg_price_sats: number
  total_revenue_sats: number
  total_calls: number
  // Daemon /api/v1/marketplace also returns listings/active in its payload
  // (aliases for total_products / online marketplace slots).
  listings?: number
  active?: number
  purchases?: number
  total_volume_bait?: number
  fee_pct?: number
}

/** Query parameters accepted by fetchProductsFromDaemon */
export interface DaemonProductQueryParams {
  page?: number
  limit?: number
  category?: DaemonServiceCategory | string
  q?: string
  sort_by?: string
  sort_order?: string
  max_price?: number
  min_rating?: number
}

/** Result returned by syncProductsFromDaemon */
export interface SyncResult {
  totalFetched: number
  upserted: number
  errors: number
  durationMs: number
}

// ──────────────────────────────────────────────────────────────
// 2. Configuration & helpers
// ──────────────────────────────────────────────────────────────

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:18445'
const REQUEST_TIMEOUT_MS = 15_000
const SYNC_BATCH_SIZE = 100

function getDaemonBaseUrl(): string {
  return process.env.BAITCOIN_SERVER_URL || DEFAULT_DAEMON_URL
}

/** Slugify a string for use as a URL-friendly identifier */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Generic fetch wrapper with timeout and offline handling */
async function daemonFetch<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const baseUrl = getDaemonBaseUrl()
  const url = new URL(`${baseUrl}${endpoint}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const resp = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })

    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Daemon API ${resp.status}: ${body || resp.statusText}`)
    }

    return (await resp.json()) as T
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Daemon API request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url.toString()}`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ──────────────────────────────────────────────────────────────
// 3. Category → Segment mapping
// ──────────────────────────────────────────────────────────────

const CATEGORY_SEGMENT_MAP: Record<DaemonServiceCategory, AistoreSegment> = {
  ml_inference: 'SYNTHETIC_INFRASTRUCTURE',
  block_validation: 'EXECUTABLE_SKILLS',
  oracle_data: 'KNOWLEDGE_PACKS',
  market_analysis: 'KNOWLEDGE_PACKS',
  data_processing: 'SYNTHETIC_INFRASTRUCTURE',
  smart_contract: 'AGENT_APPS',
}

const CATEGORY_EMOJI_MAP: Record<DaemonServiceCategory, string> = {
  ml_inference: '🤖',
  block_validation: '🔒',
  oracle_data: '📊',
  market_analysis: '📈',
  data_processing: '⚙️',
  smart_contract: '📜',
}

/** Map a daemon ServiceCategory to the corresponding AI Store segment value */
export function mapDaemonCategoryToSegment(category: string): AistoreSegment {
  return CATEGORY_SEGMENT_MAP[category as DaemonServiceCategory] ?? 'AGENT_APPS'
}

/** Map a daemon ServiceCategory to an emoji icon */
function mapDaemonCategoryToEmoji(category: string): string {
  return CATEGORY_EMOJI_MAP[category as DaemonServiceCategory] ?? '📦'
}

// ──────────────────────────────────────────────────────────────
// 4. Fetch products from the daemon (paginated)
// ──────────────────────────────────────────────────────────────

/**
 * Fetch a single page of products from the daemon marketplace API.
 *
 * Supports all query parameters: page, limit, category, q, sort_by,
 * sort_order, max_price, min_rating.
 */
export async function fetchProductsFromDaemon(
  params: DaemonProductQueryParams = {},
): Promise<DaemonProductsResponse> {
  try {
    const response = await daemonFetch<DaemonProductsResponse>(
      '/api/v1/marketplace/products',
      {
        page: params.page,
        limit: params.limit,
        category: params.category,
        q: params.q,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
        max_price: params.max_price,
        min_rating: params.min_rating,
      },
    )
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn('Daemon marketplace is offline — returning empty products', { error: message })
    return {
      products: [],
      pagination: { page: 1, limit: params.limit ?? 24, total: 0, total_pages: 0, has_next: false, has_prev: false },
      filters: {},
      categories: {},
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 5. Fetch marketplace stats
// ──────────────────────────────────────────────────────────────

/**
 * Get aggregate marketplace statistics from the daemon.
 * Returns zeroed defaults when the daemon is offline.
 */
export async function getDaemonMarketplaceStats(): Promise<DaemonMarketplaceStats> {
  try {
    const stats = await daemonFetch<DaemonMarketplaceStats>('/api/v1/marketplace')
    return stats
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn('Daemon marketplace stats unavailable — returning zeros', { error: message })
    return {
      total_products: 0,
      total_categories: 0,
      categories: {},
      avg_price_sats: 0,
      total_revenue_sats: 0,
      total_calls: 0,
      listings: 0,
      active: 0,
      purchases: 0,
      total_volume_bait: 0,
      fee_pct: 0,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 6. Full sync — fetch ALL daemon products into the AI Store DB
// ──────────────────────────────────────────────────────────────

/**
 * Sync every product from the daemon into the AI Store's Prisma database.
 *
 * 1. Fetches the first page to learn `total_pages`.
 * 2. Iterates through all remaining pages.
 * 3. Upserts each product into the `Product` table keyed on the unique slug.
 *
 * Returns a summary with counts and timing.
 */
export async function syncProductsFromDaemon(): Promise<SyncResult> {
  const startTime = Date.now()
  let totalFetched = 0
  let upserted = 0
  let errors = 0

  logger.info('Starting full product sync from daemon marketplace', { daemon: getDaemonBaseUrl() })

  try {
    // --- First page: discover pagination ---
    const firstPage = await fetchProductsFromDaemon({ limit: SYNC_BATCH_SIZE, page: 1 })

    if (firstPage.products.length === 0) {
      logger.info('Daemon returned zero products — nothing to sync')
      return { totalFetched: 0, upserted: 0, errors: 0, durationMs: Date.now() - startTime }
    }

    // Collect all products across all pages
    const allProducts: DaemonProduct[] = [...firstPage.products]
    const totalPages = firstPage.pagination.total_pages

    logger.info('Daemon pagination info', {
      total: firstPage.pagination.total,
      totalPages,
      firstPageSize: firstPage.products.length,
    })

    // --- Fetch remaining pages in parallel (batches of 5) ---
    const remainingPages = []
    for (let page = 2; page <= totalPages; page++) {
      remainingPages.push(page)
    }

    const PARALLELISM = 5
    for (let i = 0; i < remainingPages.length; i += PARALLELISM) {
      const batch = remainingPages.slice(i, i + PARALLELISM)
      const results = await Promise.allSettled(
        batch.map((page) => fetchProductsFromDaemon({ limit: SYNC_BATCH_SIZE, page })),
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.products.length > 0) {
          allProducts.push(...result.value.products)
        } else if (result.status === 'rejected') {
          logger.warn('Failed to fetch a page during sync', { error: result.reason })
          errors++
        }
      }
    }

    totalFetched = allProducts.length
    logger.info(`Fetched ${totalFetched} total products from daemon, beginning DB upsert`)

    // --- Upsert into Prisma (batches of 50 for performance) ---
    const UPSERT_BATCH = 50
    for (let i = 0; i < allProducts.length; i += UPSERT_BATCH) {
      const batch = allProducts.slice(i, i + UPSERT_BATCH)

      const upsertPromises = batch.map(async (dp) => {
        const segment = mapDaemonCategoryToSegment(dp.category)
        const emoji = mapDaemonCategoryToEmoji(dp.category)
        const slug = slugify(`${dp.name}-${dp.id}`)

        return db.product.upsert({
          where: { slug },
          update: {
            nome: dp.name,
            coreBusiness: dp.description,
            segmento: segment,
            precoSats: dp.price_sats,
            rating: dp.rating,
            downloads: dp.calls,
            a2aExecutions: dp.calls,
            authorAgent: dp.provider,
            iconEmoji: emoji,
            updatedAt: new Date(),
          },
          create: {
            nome: dp.name,
            slug,
            segmento: segment,
            coreBusiness: dp.description,
            segmentoDisplay: formatSegmentDisplay(segment),
            publicoAlvoAI: 'AI Agents on the b\'AI\'tcoin network',
            disponibilidadeOS: 'Baitcoin Network',
            repoGithubUrl: '',
            precoSats: dp.price_sats,
            source: 'baitcoin_daemon',
            downloads: dp.calls,
            rating: dp.rating,
            pulsarEnergy: ratingToPulsarEnergy(dp.rating),
            fitnessScore: ratingToFitnessScore(dp.rating, dp.calls),
            a2aExecutions: dp.calls,
            version: '1.0.0',
            authorAgent: dp.provider,
            iconEmoji: emoji,
            featured: false,
          },
        })
      })

      const results = await Promise.allSettled(upsertPromises)
      for (const result of results) {
        if (result.status === 'fulfilled') {
          upserted++
        } else {
          errors++
          logger.warn('Failed to upsert daemon product', {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          })
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Daemon sync failed unexpectedly', { error: message })
  }

  const durationMs = Date.now() - startTime
  const result: SyncResult = { totalFetched, upserted, errors, durationMs }

  logger.info('Daemon product sync completed', result as unknown as Record<string, unknown>)
  return result
}

// ──────────────────────────────────────────────────────────────
// 7. Internal helpers
// ──────────────────────────────────────────────────────────────

/** Format a segment enum into a human-readable display string */
function formatSegmentDisplay(segment: AistoreSegment): string {
  const displayMap: Record<AistoreSegment, string> = {
    AGENT_APPS: 'Agent Applications',
    EXECUTABLE_SKILLS: 'Executable Skills',
    KNOWLEDGE_PACKS: 'Knowledge Packs',
    SYNTHETIC_INFRASTRUCTURE: 'Synthetic Infrastructure',
    PROMPT_HARNESS: 'Prompt Harness',
    IN_APP_PRODUCTS: 'In-App Products',
  }
  return displayMap[segment] ?? segment
}

/**
 * Derive a pulsarEnergy score (0–100) from a daemon rating (0–5).
 * Uses a linear mapping: 0 → 30 (minimum viable), 5 → 98.
 */
function ratingToPulsarEnergy(rating: number): number {
  const clamped = Math.max(0, Math.min(5, rating))
  return Math.round(30 + (clamped / 5) * 68)
}

/**
 * Derive a fitnessScore (0–100) from rating and call count.
 * More calls boost the score.  Rating has higher weight.
 */
function ratingToFitnessScore(rating: number, calls: number): number {
  const ratingScore = Math.max(0, Math.min(5, rating)) * 16 // 0–80
  const callBonus = Math.min(20, Math.log10(Math.max(1, calls)) * 6.67) // 0–20
  return Math.min(100, Math.round(ratingScore + callBonus))
}
