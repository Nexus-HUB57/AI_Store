import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the Next.js basePath (e.g. "/aistore") for client + server.
 * Order: env → (browser) path prefix under known deploy roots → default /aistore.
 */
export function getBasePath(): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BASE_PATH : undefined
  if (fromEnv && fromEnv !== "/") {
    return fromEnv.endsWith("/") ? fromEnv.slice(0, -1) : fromEnv
  }
  if (typeof window !== "undefined") {
    const path = window.location.pathname || ""
    for (const root of ["/aistore", "/aistore-staging"]) {
      if (path === root || path.startsWith(root + "/")) return root
    }
  }
  // Production HostGator deploy is always under /aistore
  return "/aistore"
}

/**
 * Prefix an API (or any app) path with basePath.
 * Usage: fetch(apiUrl("/api/stats")) → "/aistore/api/stats"
 */
export function apiUrl(path: string): string {
  const base = getBasePath()
  if (!path.startsWith("/")) path = `/${path}`
  if (!base) return path
  if (path === base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}
