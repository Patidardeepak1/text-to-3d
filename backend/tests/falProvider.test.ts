import { describe, expect, it } from 'vitest'
import { FalTextTo3DProvider } from '../src/services/ai/falProvider.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('FalTextTo3DProvider', () => {
  it('submits a prompt and then reads a completed glb result', async () => {
    const calls: Array<{ url: string; method: string; authorization: string }> = []
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      calls.push({
        url,
        method: init?.method ?? 'GET',
        authorization: headers.get('authorization') ?? '',
      })

      if (init?.method === 'POST') {
        return jsonResponse({
          request_id: '764cabcf-b745-4b3e-ae38-1200304cf45b',
          queue_position: 1,
        })
      }

      if (url.includes('/status')) {
        return jsonResponse({
          status: 'COMPLETED',
          logs: [{ message: 'Generating textures' }],
          metrics: { inference_time: 12.5 },
        })
      }

      return jsonResponse({
        model_urls: {
          glb: {
            url: 'https://v3b.fal.media/files/b/model.glb',
            file_name: 'model.glb',
            file_size: 99,
            content_type: 'model/gltf-binary',
          },
        },
        rendered_image: { url: 'https://v3b.fal.media/files/b/preview.png' },
      })
    }

    const provider = new FalTextTo3DProvider({
      apiKey: 'test-key',
      modelId: 'tripo3d/h3.1/text-to-3d',
      extraInput: {},
      fetchImpl,
    })

    const submitted = await provider.generateModel('A small wooden chair')
    expect(submitted.status).toBe('processing')
    expect(submitted.providerJobId).toBe('764cabcf-b745-4b3e-ae38-1200304cf45b')
    expect(submitted.isDemo).toBe(false)

    const completed = await provider.getGenerationStatus(submitted.providerJobId)
    expect(completed.status).toBe('completed')
    expect(completed.remoteModelUrl).toBe('https://v3b.fal.media/files/b/model.glb')
    expect(completed.format).toBe('glb')
    expect(completed.remoteThumbnailUrl).toContain('preview.png')
    expect(calls.every((call) => call.authorization === 'Key test-key')).toBe(true)
    expect(calls.some((call) => call.url.startsWith('https://queue.fal.run/tripo3d/h3.1/text-to-3d'))).toBe(true)
  })

  it('maps authentication failures without returning the provider body', async () => {
    const provider = new FalTextTo3DProvider({
      apiKey: 'bad-key',
      modelId: 'tripo3d/h3.1/text-to-3d',
      extraInput: {},
      fetchImpl: async () => jsonResponse({ detail: 'Invalid API key sk-secret' }, 401),
    })

    await expect(provider.generateModel('A medieval castle on a hill')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401,
    })
  })

  it('cancels with the queue cancel endpoint', async () => {
    let method = ''
    const provider = new FalTextTo3DProvider({
      apiKey: 'test-key',
      modelId: 'tripo3d/h3.1/text-to-3d',
      extraInput: {},
      fetchImpl: async (_input, init) => {
        method = init?.method ?? 'GET'
        return jsonResponse({ status: 'CANCELLATION_REQUESTED' }, 202)
      },
    })

    await provider.cancel('764cabcf-b745-4b3e-ae38-1200304cf45b')
    expect(method).toBe('PUT')
  })

  it('reports that it is not configured without a key', () => {
    const provider = new FalTextTo3DProvider({
      apiKey: '   ',
      modelId: 'tripo3d/h3.1/text-to-3d',
      extraInput: {},
      fetchImpl: fetch,
    })
    expect(provider.isConfigured()).toBe(false)
  })
})
