const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const
type LogLevel = keyof typeof LOG_LEVELS

const currentLevel: number = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info']

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

export const logger = {
  debug(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog('debug')) return
    console.debug(JSON.stringify({ ts: formatTimestamp(), level: 'debug', msg, ...data }))
  },

  info(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog('info')) return
    console.log(JSON.stringify({ ts: formatTimestamp(), level: 'info', msg, ...data }))
  },

  warn(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog('warn')) return
    console.warn(JSON.stringify({ ts: formatTimestamp(), level: 'warn', msg, ...data }))
  },

  error(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog('error')) return
    console.error(JSON.stringify({ ts: formatTimestamp(), level: 'error', msg, ...data }))
  },
}

export function logRequest(method: string, pathname: string, status: number, durationMs: number) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  if (!shouldLog(level as LogLevel)) return
  const color = status >= 500 ? '31' : status >= 400 ? '33' : '32'
  console.log(
    `\x1b[${color}m${method}\x1b[0m ${pathname} ${status} ${durationMs}ms`
  )
}
