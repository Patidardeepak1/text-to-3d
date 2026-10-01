import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

export function createGenerationLimiter(max: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many generation requests. Please wait a few minutes and try again.',
      },
    },
  })
}

export const generationLimiter =
  env.NODE_ENV === 'test'
    ? (_req: Request, _res: Response, next: NextFunction) => {
        next()
      }
    : createGenerationLimiter(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS)
