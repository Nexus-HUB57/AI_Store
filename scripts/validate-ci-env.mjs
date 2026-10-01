#!/usr/bin/env node
/**
 * Validate environment variables for CI/CD contexts.
 *
 * Usage:
 *   node scripts/validate-ci-env.mjs test
 *   node scripts/validate-ci-env.mjs build
 *   node scripts/validate-ci-env.mjs deploy
 *   node scripts/validate-ci-env.mjs e2e
 *   node scripts/validate-ci-env.mjs e2e-prod
 *
 * Exit 0 = ok, 1 = missing/invalid required vars.
 */

const context = process.argv[2] || 'build'

/** @type {Record<string, { required: string[], optional: string[], rules?: Record<string, (v: string) => string|null> }> } */
const CONTEXTS = {
  test: {
    required: ['DATABASE_URL'],
    optional: ['SESSION_SECRET', 'NODE_ENV', 'NEXT_PUBLIC_BASE_PATH'],
    rules: {
      SESSION_SECRET: (v) =>
        !v || v.length >= 16 ? null : 'SESSION_SECRET must be ≥16 chars when set',
    },
  },
  build: {
    required: ['DATABASE_URL', 'SESSION_SECRET'],
    optional: ['NEXT_PUBLIC_BASE_PATH', 'NEXT_PUBLIC_BASE_URL', 'NODE_ENV'],
    rules: {
      SESSION_SECRET: (v) =>
        v.length >= 16 ? null : 'SESSION_SECRET must be ≥16 chars',
      NEXT_PUBLIC_BASE_URL: (v) => {
        if (!v) return null
        try {
          new URL(v)
          return null
        } catch {
          return 'NEXT_PUBLIC_BASE_URL must be a valid URL'
        }
      },
    },
  },
  deploy: {
    // Runtime secrets that must exist in GitHub Secrets for a safe deploy
    required: [],
    optional: [
      'SESSION_SECRET',
      'SSH_HOST',
      'SSH_USER',
      'SSH_PRIVATE_KEY',
      'VPS_HOST',
      'VPS_USER',
      'VPS_SSH_KEY',
      'CREDENCIAIS_HOSTGATOR',
      'CREDENCIAIS_PLATAFORMA_BAIT',
    ],
    rules: {
      SESSION_SECRET: (v) => {
        if (!v) {
          return 'WARN: secrets.SESSION_SECRET empty — HostGator login will 500 until SetEnv is set on server'
        }
        if (v.length < 16) return 'SESSION_SECRET must be ≥16 chars'
        if (v.includes('ci-build-only') || v.includes('not-for-production')) {
          return 'WARN: SESSION_SECRET looks like CI placeholder — do not use on HostGator'
        }
        return null
      },
    },
  },
  e2e: {
    required: ['SESSION_SECRET'],
    optional: ['BASE_URL', 'DATABASE_URL', 'NEXT_PUBLIC_BASE_PATH'],
    rules: {
      SESSION_SECRET: (v) =>
        v.length >= 16 ? null : 'SESSION_SECRET must be ≥16 chars for local E2E',
    },
  },
  'e2e-prod': {
    required: [],
    optional: ['BASE_URL'],
    rules: {
      BASE_URL: (v) => {
        if (!v) return null
        if (!v.startsWith('https://')) return 'BASE_URL prod should be https://'
        return null
      },
    },
  },
}

const cfg = CONTEXTS[context]
if (!cfg) {
  console.error(`Unknown context: ${context}`)
  console.error('Valid:', Object.keys(CONTEXTS).join(', '))
  process.exit(1)
}

const errors = []
const warnings = []
const rows = []

function mask(v) {
  if (!v) return '(unset)'
  if (v.length <= 8) return '***'
  return `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})`
}

for (const key of cfg.required) {
  const val = process.env[key]
  if (!val || !String(val).trim()) {
    errors.push(`MISSING required: ${key}`)
    rows.push({ key, status: 'MISSING', value: '(unset)' })
  } else {
    const rule = cfg.rules?.[key]
    const err = rule ? rule(val) : null
    if (err && err.startsWith('WARN:')) {
      warnings.push(`${key}: ${err}`)
      rows.push({ key, status: 'WARN', value: mask(val) })
    } else if (err) {
      errors.push(`${key}: ${err}`)
      rows.push({ key, status: 'INVALID', value: mask(val) })
    } else {
      rows.push({ key, status: 'OK', value: mask(val) })
    }
  }
}

for (const key of cfg.optional) {
  const val = process.env[key]
  if (!val || !String(val).trim()) {
    rows.push({ key, status: 'optional/unset', value: '(unset)' })
    const rule = cfg.rules?.[key]
    if (rule) {
      const err = rule('')
      if (err && err.startsWith('WARN:')) warnings.push(`${key}: ${err}`)
    }
    continue
  }
  const rule = cfg.rules?.[key]
  const err = rule ? rule(val) : null
  if (err && err.startsWith('WARN:')) {
    warnings.push(`${key}: ${err}`)
    rows.push({ key, status: 'WARN', value: mask(val) })
  } else if (err) {
    errors.push(`${key}: ${err}`)
    rows.push({ key, status: 'INVALID', value: mask(val) })
  } else {
    rows.push({ key, status: 'OK', value: mask(val) })
  }
}

// Deploy: need at least one credential path
if (context === 'deploy') {
  const hasSsh =
    (process.env.SSH_HOST || process.env.VPS_HOST) &&
    (process.env.SSH_USER || process.env.VPS_USER) &&
    (process.env.SSH_PRIVATE_KEY || process.env.VPS_SSH_KEY)
  const hasFtp =
    !!(process.env.CREDENCIAIS_HOSTGATOR || process.env.CREDENCIAIS_PLATAFORMA_BAIT)
  if (!hasSsh && !hasFtp) {
    errors.push(
      'No deploy credentials: set SSH_* / VPS_* or CREDENCIAIS_HOSTGATOR / CREDENCIAIS_PLATAFORMA_BAIT',
    )
  } else {
    rows.push({
      key: 'deploy_credentials',
      status: 'OK',
      value: hasSsh ? 'SSH path available' : 'FTP/JSON path available',
    })
  }
}

console.log(`\n═══ validate-ci-env: context=${context} ═══\n`)
for (const r of rows) {
  const icon =
    r.status === 'OK'
      ? '✅'
      : r.status === 'WARN' || r.status === 'optional/unset'
        ? '⚠️'
        : '❌'
  console.log(`${icon} ${r.key.padEnd(32)} ${r.status.padEnd(16)} ${r.value}`)
}

if (warnings.length) {
  console.log('\nWarnings:')
  for (const w of warnings) console.log('  ⚠️  ' + w)
}
if (errors.length) {
  console.log('\nErrors:')
  for (const e of errors) console.log('  ❌ ' + e)
  console.log('')
  process.exit(1)
}

console.log('\n✅ Environment OK for context:', context)
console.log('')
