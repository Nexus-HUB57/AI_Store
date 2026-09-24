'use client'

/**
 * Client-side polyfill: when the app is deployed under NEXT_PUBLIC_BASE_PATH
 * (e.g. /aistore), absolute /api/* fetches and EventSource connections would
 * otherwise hit the domain root and 404. This patch prefixes them once on load.
 *
 * Safe to keep even after individual call sites use apiUrl() — double-prefix
 * is avoided by checking the path.
 */
import { useEffect } from 'react'

const BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH) ||
  '/aistore'

function normalizeBase(b: string): string {
  if (!b || b === '/') return ''
  return b.endsWith('/') ? b.slice(0, -1) : b
}

function withBase(input: string): string {
  const base = normalizeBase(BASE)
  if (!base) return input
  if (!input.startsWith('/')) return input
  if (input === base || input.startsWith(base + '/')) return input
  // Only rewrite app API + known internal absolute paths
  if (
    input.startsWith('/api/') ||
    input === '/api' ||
    input.startsWith('/_next/')
  ) {
    return base + input
  }
  return input
}

let patched = false

function patchGlobals() {
  if (patched || typeof window === 'undefined') return
  patched = true

  const origFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return origFetch(withBase(input), init)
    }
    if (input instanceof URL) {
      const path = input.pathname + input.search + input.hash
      if (input.origin === window.location.origin) {
        return origFetch(withBase(path), init)
      }
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
      try {
        const u = new URL(input.url, window.location.origin)
        if (u.origin === window.location.origin) {
          const newUrl = withBase(u.pathname + u.search + u.hash)
          return origFetch(new Request(newUrl, input), init)
        }
      } catch {
        /* fall through */
      }
    }
    return origFetch(input as RequestInfo, init)
  }

  const OrigES = window.EventSource
  // @ts-expect-error subclassing EventSource for URL rewrite
  window.EventSource = function PatchedEventSource(
    url: string | URL,
    eventSourceInitDict?: EventSourceInit,
  ) {
    const s = typeof url === 'string' ? withBase(url) : url
    return new OrigES(s as string, eventSourceInitDict)
  }
  window.EventSource.prototype = OrigES.prototype
  Object.defineProperty(window.EventSource, 'CONNECTING', { value: OrigES.CONNECTING })
  Object.defineProperty(window.EventSource, 'OPEN', { value: OrigES.OPEN })
  Object.defineProperty(window.EventSource, 'CLOSED', { value: OrigES.CLOSED })
}

export function BasePathPatch() {
  useEffect(() => {
    patchGlobals()
  }, [])
  return null
}

// Run as early as possible if this module is evaluated on the client
if (typeof window !== 'undefined') {
  patchGlobals()
}
