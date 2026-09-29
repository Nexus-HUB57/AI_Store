'use client'

/**
 * Client-side polyfill for NEXT_PUBLIC_BASE_PATH deploys (e.g. /aistore).
 * Absolute /api/* and EventSource URLs must be prefixed or they 404 on domain root
 * and the error boundary shows "Erro Inesperado".
 */
import { useEffect } from 'react'

function resolveBase(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH : undefined
  if (fromEnv && fromEnv !== '/') {
    return fromEnv.endsWith('/') ? fromEnv.slice(0, -1) : fromEnv
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname || ''
    for (const root of ['/aistore', '/aistore-staging']) {
      if (path === root || path.startsWith(root + '/')) return root
    }
  }
  return '/aistore'
}

function withBase(input: string, base: string): string {
  if (!base) return input
  if (!input.startsWith('/')) return input
  if (input === base || input.startsWith(base + '/')) return input
  if (
    input.startsWith('/api/') ||
    input === '/api' ||
    input.startsWith('/_next/') ||
    input === '/manifest.webmanifest'
  ) {
    return base + input
  }
  return input
}

let patched = false

function patchGlobals() {
  if (patched || typeof window === 'undefined') return
  patched = true
  const base = resolveBase()

  const origFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return origFetch(withBase(input, base), init)
    }
    if (input instanceof URL) {
      if (input.origin === window.location.origin) {
        const path = input.pathname + input.search + input.hash
        return origFetch(withBase(path, base), init)
      }
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
      try {
        const u = new URL(input.url, window.location.origin)
        if (u.origin === window.location.origin) {
          const newUrl = withBase(u.pathname + u.search + u.hash, base)
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
    let s: string | URL = url
    if (typeof url === 'string') s = withBase(url, base)
    else if (url instanceof URL && url.origin === window.location.origin) {
      s = withBase(url.pathname + url.search + url.hash, base)
    }
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

if (typeof window !== 'undefined') {
  patchGlobals()
}
