import { describe, expect, it } from 'vitest'
import { promptSchema } from './validation'

describe('prompt schema', () => {
  it('accepts a trimmed prompt', () => {
    expect(promptSchema.parse({ prompt: '  a wooden chair  ' }).prompt).toBe('a wooden chair')
  })

  it('rejects an empty prompt', () => {
    const result = promptSchema.safeParse({ prompt: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Describe a 3D object before generating.')
  })

  it('rejects a short prompt', () => {
    const result = promptSchema.safeParse({ prompt: 'chair' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Your prompt is too short.')
  })
})
