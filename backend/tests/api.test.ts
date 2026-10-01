import type { IncomingMessage } from 'node:http'
import { rm } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { storageDir } from '../src/config/env.js'
import { app, createApp, ready } from '../src/app.js'
import type { TextTo3DProvider } from '../src/services/ai/types.js'

beforeAll(async () => {
  await rm(storageDir, { recursive: true, force: true })
  await ready()
})

describe('generation API', () => {
  it('rejects an empty prompt with a validation message', async () => {
    const response = await request(app).post('/api/v1/generations').send({ prompt: '   ' }).expect(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.message).toBe('Describe a 3D object before generating.')
    expect(JSON.stringify(response.body)).not.toMatch(/at \//)
  })

  it('returns a development model and a real glb download', async () => {
    const created = await request(app)
      .post('/api/v1/generations')
      .send({ prompt: 'A futuristic cyberpunk motorcycle with glowing wheels' })
      .expect(202)

    expect(created.body.data.status).toBe('processing')
    expect(created.body.data.isDemo).toBe(true)
    expect(created.body.data.providerLabel).toBe('Development Demo Model')
    expect(created.body.data.filePath).toBeUndefined()
    expect(created.body.data.providerJobId).toBeUndefined()

    const completed = await request(app).get(`/api/v1/generations/${created.body.data.id}`).expect(200)
    expect(completed.body.data.status).toBe('completed')
    expect(completed.body.data.format).toBe('glb')
    expect(completed.body.data.fileSize).toBeGreaterThan(1000)
    expect(completed.body.data.filename).toBe('a-futuristic-cyberpunk-motorcycle-with-glowing-wheels.glb')

    const download = await request(app)
      .get(completed.body.data.downloadUrl)
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
    expect(download.headers['content-type']).toContain('model/gltf-binary')
    expect(download.headers['content-disposition']).toContain('a-futuristic-cyberpunk-motorcycle-with-glowing-wheels.glb')
    expect(download.body.length).toBe(completed.body.data.fileSize)
    expect(download.body.subarray(0, 4).toString('utf8')).toBe('glTF')

    const model = await request(app).get(completed.body.data.modelUrl).expect(200)
    expect(model.headers['content-disposition']).toContain('inline')
  })

  it('returns a friendly not-found error', async () => {
    const response = await request(app).get('/api/v1/generations/11111111-1111-4111-8111-111111111111').expect(404)
    expect(response.body.error.message).toMatch(/could not be found/)
  })

  it('hides provider exceptions from the client', async () => {
    const provider: TextTo3DProvider = {
      id: 'fal',
      displayName: 'Tripo H3.1',
      supportsCancel: false,
      isConfigured: () => true,
      async generateModel() {
        throw new Error('socket hang up at /opt/app/falProvider.ts:99 secret-key')
      },
    }
    const runtime = createApp(provider)
    await runtime.ready()

    const response = await request(runtime.app)
      .post('/api/v1/generations')
      .send({ prompt: 'A low poly robot with round eyes' })
      .expect(503)

    expect(response.body.error.message).toBe('The 3D generation service is temporarily unavailable.')
    expect(JSON.stringify(response.body)).not.toContain('secret-key')
    expect(JSON.stringify(response.body)).not.toContain('falProvider')
  })

  it('explains when the AI provider is not configured', async () => {
    const provider: TextTo3DProvider = {
      id: 'fal',
      displayName: 'Tripo H3.1',
      supportsCancel: true,
      isConfigured: () => false,
      async generateModel() {
        throw new Error('should not be called')
      },
    }
    const runtime = createApp(provider)
    await runtime.ready()
    const response = await request(runtime.app)
      .post('/api/v1/generations')
      .send({ prompt: 'A medieval stone castle with towers' })
      .expect(503)

    expect(response.body.error.code).toBe('PROVIDER_NOT_CONFIGURED')
  })

  it('serves health metadata without secrets', async () => {
    const response = await request(app).get('/api/v1/health').expect(200)
    expect(response.body.data.status).toBe('ok')
    expect(response.body.data.demo).toBe(true)
    expect(JSON.stringify(response.body)).not.toMatch(/FAL_KEY|sk-/i)
  })
})

function binaryParser(res: IncomingMessage, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk))
  })
  res.on('end', () => {
    callback(null, Buffer.concat(chunks))
  })
}
