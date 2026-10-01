import { env } from '../../config/env.js'
import { ProviderError } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { assertSafeModelId, assertSafeProviderId } from '../../utils/urls.js'
import type { GenerationResult, TextTo3DProvider } from './types.js'

const API_BASE = 'https://openapi.tripo3d.ai/v3'
const REQUEST_TIMEOUT_MS = 30_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { raw: text.slice(0, 500) }
  }
}

function tripoCode(payload: unknown): number | null {
  if (!isRecord(payload) || typeof payload.code !== 'number') return null
  return payload.code
}

export class TripoTextTo3DProvider implements TextTo3DProvider {
  readonly id = 'tripo'
  readonly supportsCancel = false
  readonly displayName = 'Tripo v3.1'
  private readonly apiKey: string
  private readonly modelId: string
  private readonly fetchImpl: typeof fetch

  constructor(options?: { apiKey?: string; modelId?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? env.TRIPO_API_KEY
    this.modelId = assertSafeModelId(options?.modelId ?? env.TRIPO_MODEL)
    this.fetchImpl = options?.fetchImpl ?? fetch
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0
  }

  async generateModel(prompt: string): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(503, 'NOT_CONFIGURED', 'TRIPO_API_KEY is not configured')
    }

    const response = await this.fetchImpl(`${API_BASE}/generation/text-to-model`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        prompt,
        model: this.modelId,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    const payload = await readJson(response)
    this.assertOk(response, payload, 'submit')

    const taskId = isRecord(payload) && isRecord(payload.data) ? payload.data.task_id : undefined
    if (typeof taskId !== 'string') {
      logger.error('tripo.submit_invalid', { modelId: this.modelId })
      throw new ProviderError(502, 'INVALID_RESPONSE', 'Tripo submit response did not include a task id')
    }

    return {
      providerJobId: assertSafeProviderId(taskId),
      status: 'queued',
      step: 'Waiting in queue',
      queuePosition: null,
      isDemo: false,
    }
  }

  async getGenerationStatus(taskId: string): Promise<GenerationResult> {
    const safeId = assertSafeProviderId(taskId)
    const response = await this.fetchImpl(`${API_BASE}/tasks/${safeId}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const payload = await readJson(response)
    this.assertOk(response, payload, 'status')

    if (!isRecord(payload) || !isRecord(payload.data)) {
      logger.error('tripo.status_invalid', { providerJobId: safeId })
      throw new ProviderError(502, 'INVALID_RESPONSE', 'Tripo task response was missing task data')
    }

    return mapTask(payload.data, safeId)
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  private assertOk(response: Response, payload: unknown, action: string): void {
    const code = tripoCode(payload)
    if (response.ok && (code === null || code === 0)) return

    const technical = `status ${response.status} code ${code ?? 'none'}`
    logger.error('tripo.request_failed', { action, status: response.status, code, modelId: this.modelId })
    throw mapTripoError(response.status, code, technical)
  }
}

function mapTask(data: Record<string, unknown>, taskId: string): GenerationResult {
  const status = typeof data.status === 'string' ? data.status : 'unknown'
  const progress = typeof data.progress === 'number' ? `${Math.round(data.progress)}%` : null
  const base = { providerJobId: taskId, isDemo: false as const, queuePosition: null }

  if (status === 'queued') {
    return { ...base, status: 'queued', step: 'Waiting in queue', detail: progress }
  }
  if (status === 'running') {
    return { ...base, status: 'processing', step: 'Generating 3D model', detail: progress }
  }
  if (status === 'success') {
    const output = isRecord(data.output) ? data.output : null
    const modelUrl = output && typeof output.model_url === 'string' ? output.model_url : ''
    const thumbnail = output && typeof output.rendered_image_url === 'string' ? output.rendered_image_url : undefined
    if (!modelUrl) {
      return { ...base, status: 'failed', errorMessage: 'Model generation finished without a downloadable file.' }
    }
    return {
      ...base,
      status: 'completed',
      remoteModelUrl: modelUrl,
      remoteThumbnailUrl: thumbnail,
      format: 'glb',
      step: 'Preparing 3D viewer',
    }
  }
  if (status === 'cancelled') {
    return { ...base, status: 'cancelled', errorMessage: 'Generation was cancelled.' }
  }
  if (status === 'banned') {
    return {
      ...base,
      status: 'failed',
      errorMessage: 'The generation service could not use this prompt. Try a different description.',
    }
  }
  if (status === 'expired') {
    return { ...base, status: 'failed', errorMessage: 'The generated file expired before it could be saved. Please try again.' }
  }
  return { ...base, status: 'failed', errorMessage: 'Model generation failed. Please try again.' }
}

function mapTripoError(status: number, code: number | null, technical: string): ProviderError {
  if (code === 2010) return new ProviderError(402, 'BILLING', technical)
  if (code === 2008) return new ProviderError(422, 'PROMPT_REJECTED', technical)
  if (code === 2000 || status === 429) return new ProviderError(429, 'RATE_LIMITED', technical)
  if (code === 1000 || code === 1001 || status === 401 || status === 403) {
    return new ProviderError(status === 429 ? 429 : 401, 'UNAUTHORIZED', technical)
  }
  return new ProviderError(502, 'PROVIDER_UNAVAILABLE', technical)
}
