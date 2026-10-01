import { describe, expect, it } from 'vitest'
import { contentDisposition, promptToFilename } from '../src/utils/filename.js'
import { assertAllowedAssetUrl, assertSafeModelId } from '../src/utils/urls.js'

describe('prompt filenames', () => {
  it('builds a readable slug from a prompt', () => {
    expect(promptToFilename('A futuristic cyberpunk motorcycle')).toBe('a-futuristic-cyberpunk-motorcycle.glb')
  })

  it('strips path characters and accents', () => {
    const filename = promptToFilename('../../etc/passwd café')
    expect(filename).toMatch(/^[a-z0-9-]+\.glb$/)
    expect(filename).not.toContain('..')
    expect(filename).not.toContain('/')
  })

  it('falls back when the prompt has no safe characters', () => {
    expect(promptToFilename('@@@')).toBe('model.glb')
  })

  it('writes a safe content-disposition header', () => {
    expect(contentDisposition('cyberpunk-motorcycle.glb', 'attachment')).toContain('filename="cyberpunk-motorcycle.glb"')
  })
})

describe('asset url guard', () => {
  it('allows fal media hosts', () => {
    expect(assertAllowedAssetUrl('https://v3b.fal.media/files/abc/model.glb').hostname).toBe('v3b.fal.media')
  })

  it('rejects unexpected hosts and insecure urls', () => {
    expect(() => assertAllowedAssetUrl('https://evil.example/model.glb')).toThrow(/not allowed/)
    expect(() => assertAllowedAssetUrl('http://v3.fal.media/model.glb')).toThrow(/HTTPS/)
  })

  it('rejects model ids that could change the request path', () => {
    expect(() => assertSafeModelId('../admin')).toThrow(/invalid/i)
    expect(assertSafeModelId('tripo3d/h3.1/text-to-3d')).toBe('tripo3d/h3.1/text-to-3d')
  })
})
