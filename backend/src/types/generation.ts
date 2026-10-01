export const generationStatuses = [
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const

export type GenerationStatus = (typeof generationStatuses)[number]

export type ModelFormat = 'glb' | 'gltf'

export interface GenerationRecord {
  id: string
  prompt: string
  name: string
  filename: string
  status: GenerationStatus
  format: ModelFormat | null
  fileSize: number | null
  generationTimeMs: number | null
  createdAt: string
  updatedAt: string
  startedAt: string
  completedAt: string | null
  step: string | null
  queuePosition: number | null
  detail: string | null
  isDemo: boolean
  cancellable: boolean
  error: string | null
  provider: string
  providerJobId: string | null
  filePath: string | null
  thumbnailPath: string | null
}

export interface GenerationPublic {
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

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}
