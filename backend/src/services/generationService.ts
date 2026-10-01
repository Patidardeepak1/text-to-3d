import crypto from 'node:crypto'
import { modelLabel } from '../config/env.js'
import type { GenerationPublic, GenerationRecord } from '../types/generation.js'
import { AppError, ProviderError } from '../utils/errors.js'
import { modelNameFromPrompt, promptToFilename } from '../utils/filename.js'
import { logger } from '../utils/logger.js'
import type { GenerationResult, TextTo3DProvider } from './ai/types.js'
import type { JobStore } from './jobStore.js'
import type { ModelFiles } from './modelFiles.js'

const UNAVAILABLE = 'The 3D generation service is temporarily unavailable.'
const FAILED = 'Model generation failed. Please try again.'

export class GenerationService {
  private readonly refreshing = new Set<string>()

  constructor(
    private readonly provider: TextTo3DProvider,
    private readonly store: JobStore,
    private readonly files: ModelFiles,
  ) {}

  meta() {
    return {
      provider: this.provider.id,
      modelLabel: this.provider.displayName,
      configured: this.provider.isConfigured(),
      demo: this.provider.id === 'demo',
      outputFormat: 'glb' as const,
      supportsCancel: this.provider.supportsCancel,
    }
  }

  async create(prompt: string, requestId?: string): Promise<GenerationRecord> {
    if (!this.provider.isConfigured()) {
      throw new AppError(
        503,
        'PROVIDER_NOT_CONFIGURED',
        this.missingKeyMessage(),
      )
    }

    const now = new Date().toISOString()
    const record: GenerationRecord = {
      id: crypto.randomUUID(),
      prompt,
      name: modelNameFromPrompt(prompt),
      filename: promptToFilename(prompt),
      status: 'queued',
      format: null,
      fileSize: null,
      generationTimeMs: null,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: null,
      step: 'Preparing prompt',
      queuePosition: null,
      detail: null,
      isDemo: this.provider.id === 'demo',
      cancellable: false,
      error: null,
      provider: this.provider.id,
      providerJobId: null,
      filePath: null,
      thumbnailPath: null,
    }

    await this.store.save(record)
    logger.info('generation.started', {
      requestId,
      generationId: record.id,
      provider: this.provider.id,
      promptLength: prompt.length,
    })

    try {
      const result = await this.provider.generateModel(prompt)
      record.providerJobId = result.providerJobId
      record.isDemo = result.isDemo
      record.step = result.step ?? record.step
      record.queuePosition = result.queuePosition ?? null
      record.detail = result.detail ?? null
      record.cancellable = this.provider.supportsCancel && result.status !== 'completed' && result.status !== 'failed'

      if (result.status === 'failed') {
        this.fail(record, result.errorMessage ?? FAILED)
      } else if (result.status === 'completed') {
        await this.finalize(record, result, requestId)
      } else {
        record.status = result.status === 'queued' ? 'queued' : 'processing'
      }
    } catch (error) {
      this.fail(record, this.publicProviderMessage(error))
      await this.store.save(record)
      logger.error('generation.provider_error', {
        requestId,
        generationId: record.id,
        technical: error instanceof Error ? error.message : 'unknown',
        code: error instanceof ProviderError ? error.code : 'UNKNOWN',
      })
      throw new AppError(this.providerStatus(error), this.providerCode(error), record.error ?? UNAVAILABLE)
    }

    record.updatedAt = new Date().toISOString()
    await this.store.save(record)
    return record
  }

  async get(id: string, requestId?: string): Promise<GenerationRecord> {
    const existing = this.store.get(id)
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'That generation could not be found.')
    if (this.isTerminal(existing.status) || !existing.providerJobId || !this.provider.getGenerationStatus) {
      return existing
    }
    if (this.refreshing.has(id)) return existing

    this.refreshing.add(id)
    try {
      const result = await this.provider.getGenerationStatus(existing.providerJobId)
      existing.step = result.step ?? existing.step
      existing.queuePosition = result.queuePosition ?? null
      existing.detail = result.detail ?? existing.detail
      existing.isDemo = result.isDemo

      if (result.status === 'completed') {
        await this.finalize(existing, result, requestId)
      } else if (result.status === 'failed') {
        this.fail(existing, result.errorMessage ?? FAILED)
      } else if (result.status === 'cancelled') {
        existing.status = 'cancelled'
        existing.cancellable = false
        existing.step = null
      } else {
        existing.status = result.status === 'queued' ? 'queued' : 'processing'
        existing.cancellable = this.provider.supportsCancel
      }

      existing.updatedAt = new Date().toISOString()
      await this.store.save(existing)
      return existing
    } catch (error) {
      logger.error('generation.poll_failed', {
        requestId,
        generationId: id,
        technical: error instanceof Error ? error.message : 'unknown',
      })
      throw new AppError(this.providerStatus(error), this.providerCode(error), this.publicProviderMessage(error))
    } finally {
      this.refreshing.delete(id)
    }
  }

  async cancel(id: string, requestId?: string): Promise<GenerationRecord> {
    const record = this.store.get(id)
    if (!record) throw new AppError(404, 'NOT_FOUND', 'That generation could not be found.')
    if (this.isTerminal(record.status)) {
      throw new AppError(409, 'NOT_CANCELLABLE', 'This generation can no longer be cancelled.')
    }
    if (!this.provider.cancel || !record.providerJobId) {
      throw new AppError(400, 'CANCEL_UNSUPPORTED', 'This provider does not support cancellation.')
    }

    try {
      await this.provider.cancel(record.providerJobId)
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'ALREADY_COMPLETED') {
        return this.get(id, requestId)
      }
      logger.error('generation.cancel_failed', {
        requestId,
        generationId: id,
        technical: error instanceof Error ? error.message : 'unknown',
      })
      throw new AppError(503, 'CANCEL_FAILED', 'The generation could not be cancelled. Please try again.')
    }

    record.status = 'cancelled'
    record.cancellable = false
    record.step = null
    record.updatedAt = new Date().toISOString()
    await this.store.save(record)
    logger.info('generation.cancelled', { requestId, generationId: id })
    return record
  }

  requireFile(id: string): GenerationRecord {
    const record = this.store.get(id)
    if (!record || record.status !== 'completed' || !record.filePath) {
      throw new AppError(404, 'MODEL_NOT_READY', 'The generated model is not available.')
    }
    return record
  }

  toPublic(record: GenerationRecord): GenerationPublic {
    const ready = record.status === 'completed' && Boolean(record.filePath)
    return {
      id: record.id,
      prompt: record.prompt,
      name: record.name,
      status: record.status,
      format: record.format,
      modelUrl: ready ? `/api/v1/generations/${record.id}/model` : null,
      downloadUrl: ready ? `/api/v1/generations/${record.id}/download` : null,
      thumbnailUrl: record.thumbnailPath ? `/api/v1/generations/${record.id}/thumbnail` : null,
      fileSize: record.fileSize,
      generationTimeMs: record.generationTimeMs,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      step: record.step,
      queuePosition: record.queuePosition,
      detail: record.detail,
      isDemo: record.isDemo,
      cancellable: record.cancellable && (record.status === 'queued' || record.status === 'processing'),
      filename: record.filename,
      error: record.error,
      providerLabel: record.isDemo ? 'Development Demo Model' : modelLabel(this.provider.displayName),
    }
  }

  private async finalize(record: GenerationRecord, result: GenerationResult, requestId?: string) {
    if (!result.remoteModelUrl || !result.format) {
      this.fail(record, FAILED)
      return
    }

    record.status = 'processing'
    record.step = 'Preparing 3D viewer'
    record.cancellable = false
    await this.store.save(record)

    try {
      const stored = await this.files.saveFromResult(record.id, result.remoteModelUrl, result.format)
      record.filePath = stored.filePath
      record.fileSize = stored.size
      record.format = stored.format
      record.filename = promptToFilename(record.prompt, stored.format)
      if (result.remoteThumbnailUrl) {
        record.thumbnailPath = await this.files.saveThumbnail(record.id, result.remoteThumbnailUrl)
      }
      record.status = 'completed'
      record.completedAt = new Date().toISOString()
      record.generationTimeMs = Date.now() - Date.parse(record.startedAt)
      record.step = null
      record.error = null
      record.detail = null
      logger.info('generation.completed', {
        requestId,
        generationId: record.id,
        durationMs: record.generationTimeMs,
        fileSize: record.fileSize,
        format: record.format,
        demo: record.isDemo,
      })
    } catch (error) {
      logger.error('generation.persist_failed', {
        requestId,
        generationId: record.id,
        technical: error instanceof Error ? error.message : 'unknown',
      })
      this.fail(record, FAILED)
    }
  }

  private fail(record: GenerationRecord, message: string) {
    record.status = 'failed'
    record.error = message
    record.cancellable = false
    record.step = null
    record.completedAt = new Date().toISOString()
    record.generationTimeMs = Date.now() - Date.parse(record.startedAt)
  }

  private missingKeyMessage(): string {
    if (this.provider.id === 'tripo') {
      return 'The 3D generation service is not configured. Add TRIPO_API_KEY on the server.'
    }
    return 'The 3D generation service is not configured. Add FAL_KEY on the server.'
  }

  private isTerminal(status: GenerationRecord['status']) {
    return status === 'completed' || status === 'failed' || status === 'cancelled'
  }

  private publicProviderMessage(error: unknown): string {
    if (error instanceof ProviderError) {
      if (error.code === 'PROMPT_REJECTED') {
        return 'The generation service could not use this prompt. Try a different description.'
      }
      if (error.code === 'RATE_LIMITED') {
        return 'The 3D generation service is busy. Please wait and try again.'
      }
      if (error.code === 'BILLING') {
        if (this.provider.id === 'tripo') {
          return 'Your Tripo API credits are used up. Add credits at platform.tripo3d.ai, then try again.'
        }
        return 'Your fal.ai balance is used up. Add credits at fal.ai/dashboard/billing, then try again.'
      }
      if (error.code === 'UNAUTHORIZED') {
        return 'The 3D generation service rejected the server credentials.'
      }
    }
    if (error instanceof AppError) return error.message
    return UNAVAILABLE
  }

  private providerStatus(error: unknown): number {
    if (error instanceof ProviderError) {
      if (error.code === 'PROMPT_REJECTED') return 422
      if (error.code === 'RATE_LIMITED') return 429
      if (error.code === 'BILLING') return 402
      if (error.code === 'UNAUTHORIZED') return 503
    }
    return 503
  }

  private providerCode(error: unknown): string {
    if (error instanceof ProviderError) return error.code
    return 'PROVIDER_UNAVAILABLE'
  }
}
