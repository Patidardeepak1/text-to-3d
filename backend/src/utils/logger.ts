type Level = 'info' | 'warn' | 'error'

const sensitiveKey = /key|secret|authorization|token|password/i

function sanitize(fields: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (sensitiveKey.test(key)) {
      safe[key] = '[redacted]'
      continue
    }
    safe[key] = value
  }
  return safe
}

function write(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  const payload = {
    time: new Date().toISOString(),
    level,
    message,
    ...sanitize(fields),
  }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  info(message: string, fields?: Record<string, unknown>) {
    write('info', message, fields)
  },
  warn(message: string, fields?: Record<string, unknown>) {
    write('warn', message, fields)
  },
  error(message: string, fields?: Record<string, unknown>) {
    write('error', message, fields)
  },
}
