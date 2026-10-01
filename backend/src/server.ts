import { env } from './config/env.js'
import { app, ready } from './app.js'
import { logger } from './utils/logger.js'

async function main() {
  await ready()
  app.listen(env.PORT, () => {
    logger.info('server.started', {
      port: env.PORT,
      provider: env.AI_PROVIDER,
      configured:
        env.AI_PROVIDER === 'demo' ||
        (env.AI_PROVIDER === 'fal' ? env.FAL_KEY.length > 0 : env.TRIPO_API_KEY.length > 0),
    })
  })
}

main().catch((error: unknown) => {
  logger.error('server.failed', {
    technical: error instanceof Error ? error.message : 'unknown',
  })
  process.exit(1)
})
