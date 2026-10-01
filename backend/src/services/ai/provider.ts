import { env } from '../../config/env.js'
import { DemoTextTo3DProvider } from './demoProvider.js'
import { FalTextTo3DProvider } from './falProvider.js'
import type { TextTo3DProvider } from './types.js'

export function createTextTo3DProvider(): TextTo3DProvider {
  if (env.AI_PROVIDER === 'demo') return new DemoTextTo3DProvider()
  return new FalTextTo3DProvider()
}

export type { GenerationResult, TextTo3DProvider } from './types.js'
