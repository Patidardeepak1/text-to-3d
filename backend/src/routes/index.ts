import { Router } from 'express'
import type { GenerationController } from '../controllers/generationController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generationLimiter } from '../middleware/rateLimit.js'

export function createRouter(controller: GenerationController) {
  const router = Router()

  router.get('/health', controller.health)
  router.get('/meta', controller.meta)
  router.post('/generations', generationLimiter, asyncHandler(controller.create))
  router.get('/generations/:id', asyncHandler(controller.get))
  router.post('/generations/:id/cancel', asyncHandler(controller.cancel))
  router.get('/generations/:id/model', asyncHandler(controller.model))
  router.get('/generations/:id/download', asyncHandler(controller.download))
  router.get('/generations/:id/thumbnail', asyncHandler(controller.thumbnail))

  return router
}
