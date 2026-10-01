import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

function isJsonSyntaxError(error: unknown): error is SyntaxError & { status?: number } {
  return error instanceof SyntaxError && 'status' in error && (error as { status?: number }).status === 400
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined

  if (error instanceof AppError) {
    logger.warn('request.failed', {
      requestId,
      code: error.code,
      status: error.statusCode,
      errorMessage: error.message,
    })
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    })
    return
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'The request is invalid.'
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (isJsonSyntaxError(error)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
      },
    })
    return
  }

  const technical = error instanceof Error ? error.message : 'Unknown error'
  logger.error('request.unhandled', { requestId, technical })

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  })
}
