import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      AI_PROVIDER: 'demo',
      DEMO_DELAY_MS: '0',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:5173',
      STORAGE_DIR: 'data-test',
    },
    fileParallelism: false,
  },
})
