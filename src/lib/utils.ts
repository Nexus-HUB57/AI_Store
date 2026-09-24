import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the Next.js basePath (e.g. "/aistore") for client + server.
 * Falls back to env default so absolute /api fetches work under subpath deploys.
 */
export function getBasePath(): string {
  const raw =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_PATH) ||
    "/aistore"
  if (!raw || raw === "/") return ""
  return raw.endsWith("/") ? raw.slice(0, -1) : raw
}

/**
 * Prefix an API (or any app) path with basePath.
 * Usage: fetch(apiUrl("/api/stats")) → "/aistore/api/stats"
 */
export function apiUrl(path: string): string {
  const base = getBasePath()
  if (!path.startsWith("/")) path = `/${path}`
  if (!base) return path
  // avoid double-prefix if caller already included basePath
  if (path === base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}
