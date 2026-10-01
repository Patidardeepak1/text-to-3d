import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { demoModelPath, storageDir } from '../config/env.js'
import type { ModelFormat } from '../types/generation.js'
import { logger } from '../utils/logger.js'
import { assertAllowedAssetUrl } from '../utils/urls.js'

const MAX_BYTES = 80_000_000

export interface StoredFile {
  filePath: string
  size: number
  format: ModelFormat
}

export class ModelFiles {
  async saveFromResult(id: string, sourceUrl: string, format: ModelFormat): Promise<StoredFile> {
    await mkdir(storageDir, { recursive: true })
    const filePath = path.join(storageDir, `${id}.${format}`)

    if (sourceUrl === 'demo://sample') {
      await copyFile(demoModelPath, filePath)
      const info = await stat(filePath)
      return { filePath, size: info.size, format }
    }

    const url = assertAllowedAssetUrl(sourceUrl)
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok || !response.body) {
      throw new Error(`Asset download failed with status ${response.status}`)
    }
    assertAllowedAssetUrl(response.url)

    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_BYTES) {
      throw new Error('Generated model exceeds the size limit')
    }
    await writeFile(filePath, bytes)
    return { filePath, size: bytes.length, format }
  }

  async saveThumbnail(id: string, sourceUrl: string): Promise<string | null> {
    try {
      const url = assertAllowedAssetUrl(sourceUrl)
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok || !response.body) return null
      assertAllowedAssetUrl(response.url)
      const contentType = response.headers.get('content-type') ?? 'image/png'
      const extension = contentType.includes('jpeg') ? 'jpg' : 'png'
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length > 8_000_000) return null
      const filePath = path.join(storageDir, `${id}-thumb.${extension}`)
      await writeFile(filePath, bytes)
      return filePath
    } catch (error) {
      logger.warn('thumbnail.skipped', {
        generationId: id,
        technical: error instanceof Error ? error.message : 'unknown',
      })
      return null
    }
  }
}
