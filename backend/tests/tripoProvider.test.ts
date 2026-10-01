import { describe, expect, it } from 'vitest'
import { TripoTextTo3DProvider } from '../src/services/ai/tripoProvider.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('TripoTextTo3DProvider', () => {
  it('submits a prompt and then reads a completed glb result', async () => {
    const calls: Array<{ url: string; method: string; authorization: string; body?: string }> = []
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      calls.push({
        url,
        method: init?.method ?? 'GET',
        authorization: headers.get('authorization') ?? '',
        body: typeof init?.body === 'string' ? init.body : undefined,
      })

      if (init?.method === 'POST') {
        return jsonResponse({ code: 0, data: { task_id: 'task_abc123' } })
      }

      return jsonResponse({
        code: 0,
        data: {
          task_id: 'task_abc123',
          type: 'text_to_model',
          status: 'success',
          progress: 100,
          output: {
            model_url: 'https://cdn.tripo3d.ai/output/model_pbr.glb',
            rendered_image_url: 'https://cdn.tripo3d.ai/output/preview.png',
          },
        },
      })
    }

    const provider = new TripoTextTo3DProvider({
      apiKey: 'test-key',
      modelId: 'v3.1-20260211',
      fetchImpl,
    })

    const submitted = await provider.generateModel('a cute ceramic cat')
    expect(submitted.providerJobId).toBe('task_abc123')
    expect(submitted.status).toBe('queued')
    expect(submitted.isDemo).toBe(false)

    const completed = await provider.getGenerationStatus(submitted.providerJobId)
    expect(completed.status).toBe('completed')
    expect(completed.remoteModelUrl).toBe('https://cdn.tripo3d.ai/output/model_pbr.glb')
    expect(completed.format).toBe('glb')

    expect(calls[0]?.url).toBe('https://openapi.tripo3d.ai/v3/generation/text-to-model')
    expect(calls[0]?.authorization).toBe('Bearer test-key')
    expect(calls[0]?.body).toContain('"model":"v3.1-20260211"')
    expect(calls[1]?.url).toBe('https://openapi.tripo3d.ai/v3/tasks/task_abc123')
  })

  it('maps an empty credit balance without returning the provider body', async () => {
    const provider = new TripoTextTo3DProvider({
      apiKey: 'test-key',
      fetchImpl: async () =>
        jsonResponse({
          code: 2010,
          message: 'Insufficient credits',
          suggestion: 'top up with secret sk-live-should-not-leak',
        }),
    })

    await expect(provider.generateModel('a small wooden chair')).rejects.toMatchObject({
      code: 'BILLING',
      statusCode: 402,
    })
  })

  it('maps a rejected key without returning the provider body', async () => {
    const provider = new TripoTextTo3DProvider({
      apiKey: 'test-key',
      fetchImpl: async () => jsonResponse({ code: 1000, message: 'Invalid API Key sk-live-secret' }, 401),
    })

    await expect(provider.generateModel('a small wooden chair')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('reports running progress', async () => {
    const provider = new TripoTextTo3DProvider({
      apiKey: 'test-key',
      fetchImpl: async () =>
        jsonResponse({
          code: 0,
          data: { task_id: 'task_abc123', status: 'running', progress: 42 },
        }),
    })

    const status = await provider.getGenerationStatus('task_abc123')
    expect(status.status).toBe('processing')
    expect(status.detail).toBe('42%')
  })

  it('is not configured without a key', () => {
    const provider = new TripoTextTo3DProvider({ apiKey: '   ' })
    expect(provider.isConfigured()).toBe(false)
  })
})
