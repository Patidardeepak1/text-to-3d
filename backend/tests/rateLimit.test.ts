import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createGenerationLimiter } from '../src/middleware/rateLimit.js'

describe('generation rate limit', () => {
  it('blocks requests after the configured limit', async () => {
    const app = express()
    app.set('trust proxy', 1)
    app.post('/api/v1/generations', createGenerationLimiter(2, 60_000), (_req, res) => {
      res.json({ success: true })
    })

    await request(app).post('/api/v1/generations').expect(200)
    await request(app).post('/api/v1/generations').expect(200)
    const blocked = await request(app).post('/api/v1/generations').expect(429)

    expect(blocked.body).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many generation requests. Please wait a few minutes and try again.',
      },
    })
    expect(blocked.headers['ratelimit-limit']).toBe('2')
  })
})
