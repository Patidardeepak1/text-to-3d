import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import type { Request, Response } from 'express'
import type { GenerationService } from '../services/generationService.js'
import { AppError } from '../utils/errors.js'
import { contentDisposition } from '../utils/filename.js'
import { generationIdSchema, generationRequestSchema } from '../validators/generation.js'

const CONTENT_TYPES = {
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
} as const

export class GenerationController {
  constructor(private readonly generations: GenerationService) {}

  health = (_req: Request, res: Response) => {
    const meta = this.generations.meta()
    res.json({
      success: true,
      data: {
        status: 'ok',
        provider: meta.provider,
        configured: meta.configured,
        demo: meta.demo,
      },
    })
  }

  meta = (_req: Request, res: Response) => {
    res.json({ success: true, data: this.generations.meta() })
  }

  create = async (req: Request, res: Response) => {
    const body = generationRequestSchema.parse(req.body)
    const requestId = requestIdOf(res)
    const record = await this.generations.create(body.prompt, requestId)
    const statusCode = record.status === 'completed' ? 201 : record.status === 'queued' || record.status === 'processing' ? 202 : 200
    res.status(statusCode).json({
      success: true,
      data: this.generations.toPublic(record),
    })
  }

  get = async (req: Request, res: Response) => {
    const { id } = generationIdSchema.parse(req.params)
    const record = await this.generations.get(id, requestIdOf(res))
    res.json({ success: true, data: this.generations.toPublic(record) })
  }

  cancel = async (req: Request, res: Response) => {
    const { id } = generationIdSchema.parse(req.params)
    const record = await this.generations.cancel(id, requestIdOf(res))
    res.json({ success: true, data: this.generations.toPublic(record) })
  }

  model = async (req: Request, res: Response) => {
    await this.sendFile(req, res, 'inline')
  }

  download = async (req: Request, res: Response) => {
    await this.sendFile(req, res, 'attachment')
  }

  thumbnail = async (req: Request, res: Response) => {
    const { id } = generationIdSchema.parse(req.params)
    const record = this.generations.requireFile(id)
    if (!record.thumbnailPath) {
      throw new AppError(404, 'THUMBNAIL_NOT_FOUND', 'This generation does not have a preview image.')
    }
    try {
      await access(record.thumbnailPath)
    } catch {
      throw new AppError(404, 'THUMBNAIL_NOT_FOUND', 'This generation does not have a preview image.')
    }
    const info = await stat(record.thumbnailPath)
    const type = record.thumbnailPath.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
    res.setHeader('Content-Type', type)
    res.setHeader('Content-Length', info.size)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    createReadStream(record.thumbnailPath).pipe(res)
  }

  private async sendFile(req: Request, res: Response, disposition: 'inline' | 'attachment') {
    const { id } = generationIdSchema.parse(req.params)
    const record = this.generations.requireFile(id)
    if (!record.filePath || !record.format) {
      throw new AppError(404, 'MODEL_NOT_READY', 'The generated model is not available.')
    }
    try {
      await access(record.filePath)
    } catch {
      throw new AppError(404, 'MODEL_NOT_READY', 'The generated model is not available.')
    }
    const info = await stat(record.filePath)
    res.setHeader('Content-Type', CONTENT_TYPES[record.format])
    res.setHeader('Content-Length', info.size)
    res.setHeader('Content-Disposition', contentDisposition(record.filename, disposition))
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    createReadStream(record.filePath).pipe(res)
  }
}

function requestIdOf(res: Response): string | undefined {
  return typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined
}
