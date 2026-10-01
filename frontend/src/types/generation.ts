export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type ModelFormat = 'glb' | 'gltf'

export interface Generation {
  id: string
  prompt: string
  name: string
  status: GenerationStatus
  format: ModelFormat | null
  modelUrl: string | null
  downloadUrl: string | null
  thumbnailUrl: string | null
  fileSize: number | null
  generationTimeMs: number | null
  createdAt: string
  updatedAt: string
  step: string | null
  queuePosition: number | null
  detail: string | null
  isDemo: boolean
  cancellable: boolean
  filename: string
  error: string | null
  providerLabel: string
}

export interface ServiceMeta {
  provider: string
  modelLabel: string
  configured: boolean
  demo: boolean
  outputFormat: 'glb'
  supportsCancel: boolean
}

export interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
  }
}
