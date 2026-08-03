// ─── Auto Error Resolution Engine ───
// Inspects errors (Zod, API, generic) and generates agent-friendly
// correction suggestions with context-aware hints per endpoint.

import { z } from 'zod'
import { NextResponse } from 'next/server'

export interface ErrorResolution {
  code: string
  message: string
  suggestion: string
  corrected_example: string
  severity: 'info' | 'warning' | 'error'
  auto_fixable: boolean
}

// ── Contextual hints per endpoint ──
const ENDPOINT_HINTS: Record<string, Record<string, string>> = {
  '/api/cart': {
    general: 'For purchases: include items[], totalSats, and agentId. Discount tiers apply: purchases 1-3 are FREE, 4-50 are 50% off. Check GET /api/cart?agentId=... for your discount tier and balance.',
    example: '{\n  "items": [{ "id": "<productId>", "nome": "Product Name", "precoSats": 5000 }],\n  "totalSats": 5000,\n  "agentId": "<yourAgentId>"\n}',
  balance: 'Check your balance with GET /api/cart?agentId=... before purchasing. New agents start with 100,000 bAI and first 3 purchases are free.',
  field_items: 'items must be an array with 1-50 objects, each with: id (string), nome (string), precoSats (int, 20-10000).',
  field_agentId: 'agentId is required — authenticate first via POST /api/auth/login.',
    field_totalSats: 'totalSats must be the sum of all item precoSats values.',
  field_discountTotal: 'discountTotal is optional — the server calculates discounts automatically based on your purchase history.',
  sort: 'Not applicable for this endpoint.',
    segmento: 'Not applicable for this endpoint.',
  rating: 'Not applicable for this endpoint.',
  input_format: 'Not applicable for this endpoint.',
  login: 'Call POST /api/auth/login with { "address": "<your-address>", "displayName": "<name>" } first.',
  affordable: 'Your balance may be insufficient. New agents get 100,000 bAI. First 3 purchases are free, next 47 are 50% off.',
    batch: 'For multiple purchases, include up to 50 items in a single items[] array instead of making separate requests.',
  retry: 'Rate limited on cart: 20 requests/min. Batch your purchases or wait ~3 seconds.',
  valid_values: 'Not applicable.',
  type_expected: 'Not applicable.',
  type_example: 'Not applicable.',
  enum_values: 'Not applicable.',
  valid_sort: 'Not applicable.',
    valid_segmento: 'Not applicable.',
  },
  '/api/products': {
    general: 'Query params: q (search), segmento (filter), sort (order), page, limit, featured. Use GET /api/products/compact for token-optimized results.',
    example: 'GET /api/products?sort=pulsarEnergy&segmento=AGENT_APPS&page=1&limit=24',
    balance: 'Not applicable — this is a read-only endpoint.',
    field_items: 'Not applicable — products are fetched, not sent.',
    field_agentId: 'agentId is not required for browsing products.',
    field_totalSats: 'Not applicable.',
    field_discountTotal: 'Not applicable.',
    sort: 'Valid sort values: pulsarEnergy, downloads, rating, price, fitness, executions, newest.',
    segmento: 'Valid segmento values: AGENT_APPS, EXECUTABLE_SKILLS, KNOWLEDGE_PACKS, SYNTHETIC_INFRASTRUCTURE, PROMPT_HARNESS, IN_APP_PRODUCTS.',
    rating: 'Products have ratings 1.0-5.0 — use sort=rating to order by highest rated.',
    input_format: 'Not applicable.',
    login: 'Not required for browsing. Only needed for purchases (POST /api/cart).',
    affordable: 'Not applicable — use GET /api/cart?agentId=... to check your balance.',
    batch: 'Use limit param (max 100) to fetch more products per request.',
    retry: 'Rate limited: 60 requests/min for search. Wait ~1 second and retry.',
    valid_values: 'Check the sort and segmento query parameters for valid enum values.',
    type_expected: 'Query parameters should be strings. Use page=1 (not page="one").',
    type_example: 'Example: /api/products?sort=price&page=2&limit=12',
    enum_values: 'Sort options: pulsarEnergy | downloads | rating | price | fitness | executions | newest.',
    valid_sort: 'Valid sort values: pulsarEnergy, downloads, rating, price, fitness, executions, newest.',
    valid_segmento: 'Valid segmento values: AGENT_APPS, EXECUTABLE_SKILLS, KNOWLEDGE_PACKS, SYNTHETIC_INFRASTRUCTURE, PROMPT_HARNESS, IN_APP_PRODUCTS.',
  },
  '/api/reviews': {
    general: 'GET: list reviews by productId. POST: create a review with rating (1-5), productId, agentId.',
    example: 'POST body:\n{\n  "productId": "<productId>",\n  "agentId": "<yourAgentId>",\n  "rating": 5,\n  "title": "Excellent!",\n  "comment": "Worked perfectly for my use case."\n}',
    balance: 'Not applicable.',
    field_items: 'Not applicable.',
    field_agentId: 'agentId is required to post a review.',
    field_totalSats: 'Not applicable.',
    field_discountTotal: 'Not applicable.',
    sort: 'Not applicable — reviews are ordered by newest first.',
    segmento: 'Not applicable.',
    rating: 'Rating must be an integer from 1 to 5.',
    input_format: 'POST body requires: productId (string), agentId (string), rating (int 1-5). Optional: title (string, max 100), comment (string, max 1000).',
    login: 'Authenticate via POST /api/auth/login to get an agentId for posting reviews.',
    affordable: 'Not applicable.',
    batch: 'Not applicable — post reviews one at a time (15/min limit).',
    retry: 'Rate limited: 15 requests/min for reviews. Wait ~4 seconds and retry.',
    valid_values: 'Rating must be 1, 2, 3, 4, or 5.',
    type_expected: 'rating must be an integer, not a string.',
    type_example: 'Use "rating": 5, not "rating": "5".',
    enum_values: 'rating: integer 1-5.',
    valid_sort: 'Not applicable.',
    valid_segmento: 'Not applicable.',
  },
  '/api/sandbox/try': {
    general: 'POST: test a product in the sandbox with custom inputs. Requires productId and inputs array.',
    example: '{\n  "productId": "<productId>",\n  "inputs": [\n    { "role": "user", "content": "Analyze this data" },\n    { "role": "system", "content": "You are a helpful assistant" }\n  ],\n  "config": { "maxTokens": 500, "temperature": 0.7, "returnMetrics": true }\n}',
    balance: 'Not applicable — sandbox trials are free.',
    field_items: 'Not applicable — use "inputs" not "items".',
    field_agentId: 'Not required for sandbox trials.',
    field_totalSats: 'Not applicable.',
    field_discountTotal: 'Not applicable.',
    sort: 'Not applicable.',
    segmento: 'Not applicable.',
    rating: 'Not applicable.',
    input_format: 'inputs must be an array of { role: "user"|"system", content: string } with 1-10 entries. Each content must be non-empty.',
    login: 'Not required — sandbox is open to all agents.',
    affordable: 'Not applicable — sandbox is free.',
    batch: 'Include up to 10 inputs in a single request for multi-turn testing.',
    retry: 'Sandbox may take 1-3 seconds. If rate limited, wait a few seconds.',
    valid_values: 'role must be "user" or "system".',
    type_expected: 'inputs must be an array of objects, not a string.',
    type_example: '{ "role": "user", "content": "Hello" }',
    enum_values: 'Valid roles: user, system.',
    valid_sort: 'Not applicable.',
    valid_segmento: 'Not applicable.',
  },
}

function getHint(endpoint: string, key: string): string {
  const hints = ENDPOINT_HINTS[endpoint]
  if (hints) return hints[key] ?? hints['general'] ?? ''
  return ''
}

// ── Error code classifiers ──
interface ZodIssue {
  code: string
  path: (string | number)[]
  message: string
  values?: unknown[]
  minimum?: number
  maximum?: number
  expected?: string
  received?: string
}

function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (e.status === 429 || e.statusCode === 429) return true
    if (typeof e.message === 'string' && e.message.toLowerCase().includes('rate limit')) return true
  }
  return false
}

function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (e.status === 401 || e.statusCode === 401 || e.status === 403 || e.statusCode === 403) return true
    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase()
      if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('agentid obrigatório') || msg.includes('não autenticado')) return true
    }
  }
  return false
}

function isBalanceError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase()
      if (msg.includes('saldo insuficiente') || msg.includes('insufficient balance') || msg.includes('balance')) return true
    }
    if (typeof e.error === 'string') {
      const msg = e.error.toLowerCase()
      if (msg.includes('saldo insuficiente') || msg.includes('insufficient')) return true
    }
  }
  return false
}

/**
 * Generate a contextual ErrorResolution from any error.
 */
export function resolveError(endpoint: string, error: unknown): ErrorResolution {
  // ── Zod Validation Error ──
  if (isZodError(error)) {
    const issue = error.issues[0] as ZodIssue | undefined
    if (!issue) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed with no details',
        suggestion: getHint(endpoint, 'general'),
        corrected_example: getHint(endpoint, 'example'),
        severity: 'error',
        auto_fixable: false,
      }
    }

    const fieldPath = issue.path.join('.')
    const fieldKey = `field_${fieldPath}`

    // Invalid enum value
    if (issue.code === 'invalid_value' && issue.values) {
      const validValues = issue.values as string[]
      const validList = validValues.map(v => `"${v}"`).join(' | ')
      return {
        code: 'INVALID_ENUM',
        message: `Invalid value for "${fieldPath}": ${issue.message}`,
        suggestion: `${getHint(endpoint, 'enum_values')} ${getHint(endpoint, 'general')}`,
        corrected_example: `// Valid values for "${fieldPath}": ${validList}\n${getHint(endpoint, 'example')}`,
        severity: 'error',
        auto_fixable: true,
      }
    }

    // Missing required field (too_small with min 1 for strings, or missing key)
    if (issue.code === 'too_small' || issue.code === 'missing_key') {
      const fieldHint = getHint(endpoint, fieldKey)
      const hintText = fieldHint && fieldHint !== 'Not applicable.' && !fieldHint.startsWith('Not applicable')
        ? fieldHint
        : `Ensure "${fieldPath}" is included with a valid value.`

      return {
        code: 'MISSING_FIELD',
        message: `Missing or too short: "${fieldPath}" — ${issue.message}`,
        suggestion: hintText,
        corrected_example: `// Add the missing "${fieldPath}" field:\n${getHint(endpoint, 'example')}`,
        severity: 'error',
        auto_fixable: true,
      }
    }

    // Type mismatch (but check for missing field first — Zod v4 uses invalid_type for both)
    if (issue.code === 'invalid_type' || issue.code === 'invalid_value') {
      // Zod v4: missing required field — message contains "received undefined"
      const isMissing = issue.message.includes('received undefined')
      if (isMissing) {
        const fieldHint = getHint(endpoint, fieldKey)
        const hintText = fieldHint && !fieldHint.startsWith('Not applicable')
          ? fieldHint
          : `Ensure "${fieldPath}" is included with a valid value.`

        return {
          code: 'MISSING_FIELD',
          message: `Missing required field: "${fieldPath}" — expected ${issue.expected || 'a value'}`,
          suggestion: hintText,
          corrected_example: `// Add the missing "${fieldPath}" field:
${getHint(endpoint, 'example')}`,
          severity: 'error',
          auto_fixable: true,
        }
      }

      const typeHint = getHint(endpoint, 'type_expected')
      const typeExample = getHint(endpoint, 'type_example')
      return {
        code: 'TYPE_MISMATCH',
        message: `Type error for "${fieldPath}": ${issue.message}`,
        suggestion: typeHint || `Expected a different type for "${fieldPath}". Check the API documentation.`,
        corrected_example: typeExample || getHint(endpoint, 'example'),
        severity: 'error',
        auto_fixable: true,
      }
    }

    // Generic Zod issue
    return {
      code: 'VALIDATION_ERROR',
      message: issue.message,
      suggestion: getHint(endpoint, fieldKey) || getHint(endpoint, 'general'),
      corrected_example: getHint(endpoint, 'example'),
      severity: 'error',
      auto_fixable: true,
    }
  }

  // ── Rate Limit (429) ──
  if (isRateLimitError(error)) {
    const retryAfter = Math.ceil(Math.random() * 5) + 3 // 3-8s
    return {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded. Too many requests.',
      suggestion: `${getHint(endpoint, 'retry')} Retry after ${retryAfter} seconds or use batching. ${getHint(endpoint, 'batch')}`,
      corrected_example: `// Wait ${retryAfter}s, then retry. Or batch requests:\n${getHint(endpoint, 'example')}`,
      severity: 'warning',
      auto_fixable: true,
    }
  }

  // ── Authentication Missing (401/403) ──
  if (isAuthError(error)) {
    return {
      code: 'AUTH_REQUIRED',
      message: 'Authentication required. Agent not authenticated.',
      suggestion: getHint(endpoint, 'login'),
      corrected_example: '// First authenticate:\nPOST /api/auth/login\n{\n  "address": "<your-agent-address>",\n  "displayName": "<your-name>",\n  "referralCode": "<optional-referral-code>"\n}\n// Then use the returned agentId in your request.',
      severity: 'warning',
      auto_fixable: true,
    }
  }

  // ── Insufficient Balance ──
  if (isBalanceError(error)) {
    const errObj = error as Record<string, unknown>
    const balance = errObj.balance ?? 'unknown'
    const required = errObj.required ?? 'unknown'
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: `Insufficient balance. Required: ${required} bAI, Available: ${balance} bAI.`,
      suggestion: `${getHint(endpoint, 'affordable')} Check GET /api/cart?agentId=... for your balance and discount tier. First 3 purchases are free.`,
      corrected_example: `// Check your balance first:\nGET /api/cart?agentId=<yourAgentId>\n// Then purchase within your means. Consider lower-priced products.`,
      severity: 'warning',
      auto_fixable: false,
    }
  }

  // ── Error object with status/message ──
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const msg = typeof e.message === 'string' ? e.message
      : typeof e.error === 'string' ? e.error
      : 'Unknown error occurred'

    const statusCode = typeof e.status === 'number' ? e.status
      : typeof e.statusCode === 'number' ? e.statusCode
      : 500

    if (statusCode === 404) {
      return {
        code: 'NOT_FOUND',
        message: String(msg),
        suggestion: `Check that the resource ID is correct. Use GET /api/products to browse available products.`,
        corrected_example: `// Verify the ID exists:\nGET /api/products?q=<product-name>\n// Use the correct "id" from the results.`,
        severity: 'error',
        auto_fixable: true,
      }
    }

    return {
      code: `API_ERROR_${statusCode}`,
      message: String(msg),
      suggestion: getHint(endpoint, 'general') || 'Check the request format and try again.',
      corrected_example: getHint(endpoint, 'example') || '',
      severity: statusCode >= 500 ? 'error' : 'warning',
      auto_fixable: false,
    }
  }

  // ── String error ──
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      suggestion: getHint(endpoint, 'general') || 'An unexpected error occurred. Check the request and try again.',
      corrected_example: getHint(endpoint, 'example') || '',
      severity: 'error',
      auto_fixable: false,
    }
  }

  // ── Generic fallback ──
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    suggestion: 'Verify your request format matches the API schema. Use GET /api/agent/discover to find valid endpoints and parameters.',
    corrected_example: getHint(endpoint, 'example') || '',
    severity: 'error',
    auto_fixable: false,
  }
}

/**
 * Generate a NextResponse with agent-friendly error resolution.
 * Designed to be used in API route catch blocks or validation failures.
 */
export function agentErrorResponse(endpoint: string, error: unknown, statusCode: number): NextResponse {
  const resolution = resolveError(endpoint, error)

  return NextResponse.json(
    {
      error: resolution.message,
      resolution: {
        code: resolution.code,
        suggestion: resolution.suggestion,
        corrected_example: resolution.corrected_example,
        severity: resolution.severity,
        auto_fixable: resolution.auto_fixable,
      },
    },
    { status: statusCode },
  )
}
