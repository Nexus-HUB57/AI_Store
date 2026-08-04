/**
 * Client-side CSRF token helper.
 * Reads the csrf_token cookie (set by middleware) and attaches it to requests.
 */

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Add CSRF token to a fetch request's headers.
 */
export function csrfHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getCsrfToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-csrf-token': token } : {}),
    ...extra,
  }
}
