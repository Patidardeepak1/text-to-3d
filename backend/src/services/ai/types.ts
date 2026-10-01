import type { ModelFormat } from '../../types/generation.js'

export interface TextTo3DProvider {
  readonly id: string
  readonly displayName: string
  readonly supportsCancel: boolean
  isConfigured(): boolean
  generateModel(prompt: string): Promise<GenerationResult>
  getGenerationStatus?(jobId: string): Promise<GenerationResult>
  cancel?(jobId: string): Promise<void>
}

export interface GenerationResult {
  providerJobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  step?: string
  queuePosition?: number | null
  detail?: string | null
  remoteModelUrl?: string
  remoteThumbnailUrl?: string
  format?: ModelFormat
  fileSize?: number | null
  isDemo: boolean
  errorMessage?: string
}

export interface ParsedAsset {
  url: string
  format: ModelFormat
  fileSize: number | null
  thumbnailUrl: string | null
}
