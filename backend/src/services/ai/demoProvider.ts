import crypto from 'node:crypto'
import { env } from '../../config/env.js'
import type { GenerationResult, TextTo3DProvider } from './types.js'

interface DemoJob {
  createdAt: number
  cancelled: boolean
}

export class DemoTextTo3DProvider implements TextTo3DProvider {
  readonly id = 'demo'
  readonly displayName = 'Development Demo Model'
  readonly supportsCancel = true
  private readonly jobs = new Map<string, DemoJob>()
  private readonly delayMs: number

  constructor(delayMs = env.DEMO_DELAY_MS) {
    this.delayMs = delayMs
  }

  isConfigured(): boolean {
    return true
  }

  async generateModel(_prompt: string): Promise<GenerationResult> {
    const providerJobId = crypto.randomUUID().replace(/-/g, '')
    this.jobs.set(providerJobId, { createdAt: Date.now(), cancelled: false })
    return {
      providerJobId,
      status: 'processing',
      step: 'Preparing development sample',
      isDemo: true,
    }
  }

  async getGenerationStatus(jobId: string): Promise<GenerationResult> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return {
        providerJobId: jobId,
        status: 'failed',
        isDemo: true,
        errorMessage: 'Model generation failed. Please try again.',
      }
    }
    if (job.cancelled) {
      return { providerJobId: jobId, status: 'cancelled', isDemo: true }
    }
    if (Date.now() - job.createdAt < this.delayMs) {
      return {
        providerJobId: jobId,
        status: 'processing',
        step: 'Loading development sample',
        isDemo: true,
      }
    }
    return {
      providerJobId: jobId,
      status: 'completed',
      step: 'Preparing 3D viewer',
      remoteModelUrl: 'demo://sample',
      format: 'glb',
      isDemo: true,
    }
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) return
    job.cancelled = true
  }
}
