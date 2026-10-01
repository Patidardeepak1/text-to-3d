import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from '../src/utils/corsOrigin.js'

const configured = ['https://text-to-3d-umber.vercel.app']

describe('browser origins', () => {
  it('allows the production site and Vercel preview deployments', () => {
    expect(isAllowedOrigin('https://text-to-3d-umber.vercel.app', configured)).toBe(true)
    expect(
      isAllowedOrigin('https://text-to-3d-nqx3b1e22-patidardeepak1s-projects.vercel.app', configured),
    ).toBe(true)
    expect(
      isAllowedOrigin('https://text-to-3d-git-main-patidardeepak1s-projects.vercel.app', configured),
    ).toBe(true)
  })

  it('rejects other websites', () => {
    expect(isAllowedOrigin('https://evil.example', configured)).toBe(false)
    expect(isAllowedOrigin('https://text-to-3d-evil.vercel.app', configured)).toBe(false)
    expect(isAllowedOrigin('http://text-to-3d-umber.vercel.app', configured)).toBe(false)
  })
})
