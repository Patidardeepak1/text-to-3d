import { env, modelLabel, parseExtraInput } from '../../config/env.js'
import { ProviderError } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { assertSafeModelId, assertSafeProviderId } from '../../utils/urls.js'
import { parseFalOutput } from './parseFalOutput.js'
import type { GenerationResult, TextTo3DProvider } from './types.js'

const QUEUE_BASE = 'https://queue.fal.run'
const REQUEST_TIMEOUT_MS = 30_000

interface FalStatusBody {
  status?: string
  queue_position?: number
  logs?: Array<{ message?: string }>
  metrics?: { inference_time?: number }
  error?: string
}

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

function errorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  if (typeof payload.error === 'string') return payload.error
  if (typeof payload.detail === 'string') return payload.detail
  if (typeof payload.message === 'string') return payload.message
  return fallback
}

export class FalTextTo3DProvider implements TextTo3DProvider {
  readonly id = 'fal'
  readonly supportsCancel = true
  readonly displayName: string
  private readonly apiKey: string
  private readonly modelId: string
  private readonly extraInput: Record<string, unknown>
  private readonly fetchImpl: typeof fetch

  constructor(options?: { apiKey?: string; modelId?: string; extraInput?: Record<string, unknown>; fetchImpl?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? env.FAL_KEY
    this.modelId = assertSafeModelId(options?.modelId ?? env.FAL_MODEL_ID)
    this.extraInput = options?.extraInput ?? parseExtraInput(env.FAL_INPUT_JSON)
    this.fetchImpl = options?.fetchImpl ?? fetch
    this.displayName = modelLabel(this.modelId)
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0
  }

  async generateModel(prompt: string): Promise<GenerationResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(503, 'NOT_CONFIGURED', 'FAL_KEY is not configured')
    }

    const response = await this.fetchImpl(`${QUEUE_BASE}/${this.modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, ...this.extraInput }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    const payload = await readJson(response)
    if (!response.ok) {
      const technical = safeProviderError(response.status, payload, response.statusText)
      logger.error('fal.submit_failed', { status: response.status, technical, modelId: this.modelId })
      throw this.mapHttpError(response.status, technical)
    }

    if (!isRecord(payload) || typeof payload.request_id !== 'string') {
      logger.error('fal.submit_invalid', { modelId: this.modelId })
      throw new ProviderError(502, 'INVALID_RESPONSE', 'fal submit response did not include a request id')
    }

    const requestId = assertSafeProviderId(payload.request_id)
    const queuePosition = typeof payload.queue_position === 'number' ? payload.queue_position : null

    return {
      providerJobId: requestId,
      status: 'processing',
      step: 'Preparing prompt',
      queuePosition,
      isDemo: false,
    }
  }

  async getGenerationStatus(jobId: string): Promise<GenerationResult> {
    const requestId = assertSafeProviderId(jobId)
    const response = await this.fetchImpl(`${QUEUE_BASE}/${this.modelId}/requests/${requestId}/status?logs=1`, {
      headers: { Authorization: `Key ${this.apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const payload = (await readJson(response)) as FalStatusBody | null

    if (!response.ok) {
      const technical = safeProviderError(response.status, payload, response.statusText)
      logger.error('fal.status_failed', { status: response.status, technical, providerJobId: requestId })
      if (response.status === 404) {
        throw new ProviderError(404, 'NOT_FOUND', technical)
      }
      throw this.mapHttpError(response.status, technical)
    }

    const status = payload?.status ?? ''
    const logs = Array.isArray(payload?.logs) ? payload.logs : []
    const detail = [...logs].reverse().find((entry) => typeof entry.message === 'string' && entry.message.trim())?.message ?? null
    const queuePosition = typeof payload?.queue_position === 'number' ? payload.queue_position : null

    if (status === 'IN_QUEUE') {
      return {
        providerJobId: requestId,
        status: 'queued',
        step: 'Preparing prompt',
        queuePosition,
        detail,
        isDemo: false,
      }
    }

    if (status === 'IN_PROGRESS') {
      return {
        providerJobId: requestId,
        status: 'processing',
        step: stepFromLogs(detail),
        queuePosition: null,
        detail,
        isDemo: false,
      }
    }

    if (status === 'COMPLETED' && payload?.error) {
      return {
        providerJobId: requestId,
        status: 'failed',
        isDemo: false,
        errorMessage: 'Model generation failed. Please try again.',
      }
    }

    if (status === 'COMPLETED') {
      const resultResponse = await this.fetchImpl(`${QUEUE_BASE}/${this.modelId}/requests/${requestId}`, {
        headers: { Authorization: `Key ${this.apiKey}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const resultPayload = await readJson(resultResponse)
      if (!resultResponse.ok) {
        const technical = safeProviderError(resultResponse.status, resultPayload, resultResponse.statusText)
        logger.error('fal.result_failed', { status: resultResponse.status, technical, providerJobId: requestId })
        throw this.mapHttpError(resultResponse.status, technical)
      }

      const asset = parseFalOutput(resultPayload)
      if (!asset) {
        logger.error('fal.result_unparsed', { providerJobId: requestId })
        return {
          providerJobId: requestId,
          status: 'failed',
          isDemo: false,
          errorMessage: 'Model generation failed. Please try again.',
        }
      }

      return {
        providerJobId: requestId,
        status: 'completed',
        step: 'Preparing 3D viewer',
        remoteModelUrl: asset.url,
        remoteThumbnailUrl: asset.thumbnailUrl ?? undefined,
        format: asset.format,
        fileSize: asset.fileSize,
        isDemo: false,
        detail,
      }
    }

    logger.error('fal.status_unknown', { status, providerJobId: requestId })
    return {
      providerJobId: requestId,
      status: 'failed',
      isDemo: false,
      errorMessage: 'Model generation failed. Please try again.',
    }
  }

  async cancel(jobId: string): Promise<void> {
    const requestId = assertSafeProviderId(jobId)
    const response = await this.fetchImpl(`${QUEUE_BASE}/${this.modelId}/requests/${requestId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Key ${this.apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.status === 202 || response.ok) return

    const payload = await readJson(response)
    if (response.status === 400) {
      throw new ProviderError(409, 'ALREADY_COMPLETED', errorMessage(payload, 'Already completed'))
    }
    logger.error('fal.cancel_failed', {
      status: response.status,
      technical: safeProviderError(response.status, payload, response.statusText),
      providerJobId: requestId,
    })
    throw new ProviderError(502, 'CANCEL_FAILED', 'Cancellation was not accepted')
  }

  private mapHttpError(status: number, technical: string): ProviderError {
    if (status === 401 || status === 403) {
      return new ProviderError(status, 'UNAUTHORIZED', technical)
    }
    if (status === 422) {
      return new ProviderError(422, 'PROMPT_REJECTED', technical)
    }
    if (status === 429) {
      return new ProviderError(429, 'RATE_LIMITED', technical)
    }
    return new ProviderError(status, 'PROVIDER_ERROR', technical)
  }
}

function safeProviderError(status: number, payload: unknown, fallback: string): string {
  if (status === 401 || status === 403) return 'authentication failed'
  return errorMessage(payload, fallback).slice(0, 300)
}

function stepFromLogs(detail: string | null): string {
  const text = detail?.toLowerCase() ?? ''
  if (text.includes('texture') || text.includes('material') || text.includes('pbr')) {
    return 'Processing materials'
  }
  return 'Generating geometry'
}
