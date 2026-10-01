import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { logger } from '../utils/logger.js'

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id')
  const requestId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID()
  const started = process.hrtime.bigint()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000
    logger.info('request.completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    })
  })

  next()
}
