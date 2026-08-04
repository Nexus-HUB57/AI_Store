export interface AnalyticsEvent {
  event: string
  properties: Record<string, unknown>
  agentId?: string
  sessionId?: string
  timestamp: number
}

const MAX_EVENTS = 50000
const FLUSH_INTERVAL_MS = 30000

const eventBuffer: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

export function trackEvent(event: string, properties: Record<string, unknown> = {}, agentId?: string): void {
  eventBuffer.push({
    event,
    properties,
    agentId,
    timestamp: Date.now(),
  })

  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.splice(0, eventBuffer.length - MAX_EVENTS)
  }
}

export function trackPageView(slug: string, agentId?: string): void {
  trackEvent('page_view', { slug, referrer: '' }, agentId)
}

export function trackProductView(productId: string, slug: string, agentId?: string): void {
  trackEvent('product_view', { productId, slug }, agentId)
}

export function trackCartAdd(productId: string, precoSats: number, agentId?: string): void {
  trackEvent('cart_add', { productId, precoSats, bait: precoSats / 100 }, agentId)
}

export function trackPurchase(txId: string, items: number, totalSats: number, agentId?: string): void {
  trackEvent('purchase', { txId, itemCount: items, totalSats, totalBait: totalSats / 100 }, agentId)
}

export function trackSearch(query: string, resultCount: number, agentId?: string): void {
  trackEvent('search', { query, resultCount }, agentId)
}

export function trackReview(productId: string, rating: number, agentId?: string): void {
  trackEvent('review', { productId, rating }, agentId)
}

export function getEvents(filter?: { event?: string; agentId?: string; since?: number; until?: number }): AnalyticsEvent[] {
  let filtered = eventBuffer

  if (filter?.event) {
    filtered = filtered.filter(e => e.event === filter.event)
  }
  if (filter?.agentId) {
    filtered = filtered.filter(e => e.agentId === filter.agentId)
  }
  if (filter?.since) {
    filtered = filtered.filter(e => e.timestamp >= filter.since!)
  }
  if (filter?.until) {
    filtered = filtered.filter(e => e.timestamp <= filter.until!)
  }

  return filtered
}

export function getEventStats(): {
  totalEvents: number
  eventCounts: Record<string, number>
  uniqueAgents: number
  firstEventAt: number | null
  lastEventAt: number | null
} {
  const eventCounts: Record<string, number> = {}
  const agents = new Set<string>()

  for (const e of eventBuffer) {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1
    if (e.agentId) agents.add(e.agentId)
  }

  return {
    totalEvents: eventBuffer.length,
    eventCounts,
    uniqueAgents: agents.size,
    firstEventAt: eventBuffer.length > 0 ? eventBuffer[0].timestamp : null,
    lastEventAt: eventBuffer.length > 0 ? eventBuffer[eventBuffer.length - 1].timestamp : null,
  }
}

export function getConversionFunnel(): {
 searches: number
  productViews: number
  cartAdds: number
  purchases: number
  searchToView: number
  viewToCart: number
  cartToPurchase: number
  overallConversion: number
} {
  const searches = eventBuffer.filter(e => e.event === 'search').length
  const productViews = eventBuffer.filter(e => e.event === 'product_view').length
  const cartAdds = eventBuffer.filter(e => e.event === 'cart_add').length
  const purchases = eventBuffer.filter(e => e.event === 'purchase').length

  return {
    searches,
    productViews,
    cartAdds,
    purchases,
    searchToView: searches > 0 ? Math.round((productViews / searches) * 1000) / 10 : 0,
    viewToCart: productViews > 0 ? Math.round((cartAdds / productViews) * 1000) / 10 : 0,
    cartToPurchase: cartAdds > 0 ? Math.round((purchases / cartAdds) * 1000) / 10 : 0,
    overallConversion: searches > 0 ? Math.round((purchases / searches) * 1000) / 10 : 0,
  }
}

export function startFlushTimer(): void {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    // In production, flush to external analytics service
    // For now, just trim the buffer
    if (eventBuffer.length > MAX_EVENTS * 0.8) {
      eventBuffer.splice(0, eventBuffer.length - Math.floor(MAX_EVENTS * 0.5))
    }
  }, FLUSH_INTERVAL_MS)
}

export function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
