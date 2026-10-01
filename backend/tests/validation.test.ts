import { describe, expect, it } from 'vitest'
import { generationRequestSchema } from '../src/validators/generation.js'

describe('generation request validation', () => {
  it('trims a valid prompt', () => {
    const parsed = generationRequestSchema.parse({ prompt: '  a wooden chair with grain  ' })
    expect(parsed.prompt).toBe('a wooden chair with grain')
  })

  it('rejects an empty prompt', () => {
    const result = generationRequestSchema.safeParse({ prompt: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Describe a 3D object before generating.')
    }
  })

  it('rejects a prompt that is too short', () => {
    const result = generationRequestSchema.safeParse({ prompt: 'chair' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Your prompt is too short.')
    }
  })

  it('rejects a prompt that is too long', () => {
    const result = generationRequestSchema.safeParse({ prompt: 'a'.repeat(1025) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/too long/)
    }
  })

  it('rejects a missing prompt', () => {
    const result = generationRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
