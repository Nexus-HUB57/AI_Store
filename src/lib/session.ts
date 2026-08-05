/**
 * Session verification utility.
 * Uses HMAC-SHA256 signed tokens that embed the agent ID.
 * Format: base64url(agentId).base64url(hmac)
 * Stateless — no DB lookup needed for format verification.
 */

import { createHmac } from 'crypto'

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET env var is required in production (min 16 chars)')
    }
    // Dev/build fallback — sessions will be invalid across restarts but build CI works
    return 'dev-only-insecure-session-secret-ok-for-builds'
  }
  return secret
}

function base64UrlEncode(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url')
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

/**
 * Create a signed session token from an agent ID.
 * Format: base64url(id).base64url(hmac-sha256(id, secret))
 */
export function signSession(agentId: string): string {
  const payload = base64UrlEncode(agentId)
  const signature = base64UrlEncode(
    createHmac('sha256', getSecret()).update(agentId).digest()
  )
  return `${payload}.${signature}`
}

/**
 * Verify and decode a session token.
 * Returns the agent ID if valid, null if invalid/tampered.
 */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, sigB64] = parts
  let agentId: string
  try {
    agentId = base64UrlDecode(payloadB64)
  } catch {
    return null
  }

  const expectedSig = base64UrlEncode(
    createHmac('sha256', getSecret()).update(agentId).digest()
  )

  // Constant-time comparison to prevent timing attacks
  if (sigB64.length !== expectedSig.length) return null
  let result = 0
  for (let i = 0; i < sigB64.length; i++) {
    result |= sigB64.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  return result === 0 ? agentId : null
}

/**
 * Quick format check for middleware (doesn't decode, just validates structure).
 * Returns true if the token looks like a valid signed session.
 */
export function verifySessionFormat(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 2 && parts[0].length > 0 && parts[1].length === 44
}
