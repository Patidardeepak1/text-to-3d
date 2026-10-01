import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { GenerationController } from './controllers/generationController.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestContext } from './middleware/requestContext.js'
import { createRouter } from './routes/index.js'
import { createTextTo3DProvider, type TextTo3DProvider } from './services/ai/provider.js'
import { isAllowedOrigin } from './utils/corsOrigin.js'
import { GenerationService } from './services/generationService.js'
import { JobStore } from './services/jobStore.js'
import { ModelFiles } from './services/modelFiles.js'

export function createApp(provider: TextTo3DProvider = createTextTo3DProvider()) {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  const origins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  )
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin, origins))
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type', 'X-Request-Id'],
    }),
  )
  app.use(requestContext)
  app.use(express.json({ limit: '32kb' }))

  const store = new JobStore()
  const files = new ModelFiles()
  const service = new GenerationService(provider, store, files)
  const controller = new GenerationController(service)

  app.get('/', (_req, res) => {
    res.json({
      name: '3DForge AI API',
      health: '/api/v1/health',
    })
  })

  app.use('/api/v1', createRouter(controller))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return { app, ready: () => store.init() }
}

const runtime = createApp()
export const app = runtime.app
export const ready = runtime.ready
