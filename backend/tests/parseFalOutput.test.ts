import { describe, expect, it } from 'vitest'
import { parseFalOutput } from '../src/services/ai/parseFalOutput.js'

describe('fal output parser', () => {
  it('prefers the glb url from Tripo output', () => {
    const parsed = parseFalOutput({
      model_mesh: {
        url: 'https://v3b.fal.media/files/b/model.glb',
        file_name: 'model.glb',
        file_size: 1200,
        content_type: 'model/gltf-binary',
      },
      model_urls: {
        glb: {
          url: 'https://v3b.fal.media/files/b/model.glb',
          file_name: 'model.glb',
          file_size: 1200,
          content_type: 'model/gltf-binary',
        },
      },
      rendered_image: {
        url: 'https://v3b.fal.media/files/b/preview.png',
        content_type: 'image/png',
      },
    })

    expect(parsed).toEqual({
      url: 'https://v3b.fal.media/files/b/model.glb',
      format: 'glb',
      fileSize: 1200,
      thumbnailUrl: 'https://v3b.fal.media/files/b/preview.png',
    })
  })

  it('reads Hunyuan model_glb payloads wrapped in data', () => {
    const parsed = parseFalOutput({
      data: {
        model_glb: {
          url: 'https://v3.fal.media/files/ship.glb',
          content_type: 'model/gltf-binary',
          file_size: 40,
        },
        thumbnail: { url: 'https://v3.fal.media/files/preview.png' },
      },
    })
    expect(parsed?.format).toBe('glb')
    expect(parsed?.thumbnailUrl).toContain('preview.png')
  })

  it('ignores non-mesh files', () => {
    expect(
      parseFalOutput({
        model_mesh: { url: 'https://v3.fal.media/files/preview.png', content_type: 'image/png', file_name: 'preview.png' },
      }),
    ).toBeNull()
  })
})
