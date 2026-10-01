import type { ModelFormat } from '../../types/generation.js'
import type { ParsedAsset } from './types.js'

interface FalFile {
  url?: unknown
  file_size?: unknown
  content_type?: unknown
  file_name?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asFile(value: unknown): FalFile | null {
  if (!isRecord(value)) return null
  return value
}

function detectFormat(file: FalFile): ModelFormat | null {
  const contentType = typeof file.content_type === 'string' ? file.content_type.toLowerCase() : ''
  const name = typeof file.file_name === 'string' ? file.file_name.toLowerCase() : ''
  const url = typeof file.url === 'string' ? file.url.toLowerCase().split('?')[0] : ''

  if (contentType.includes('gltf-binary') || name.endsWith('.glb') || url.endsWith('.glb')) return 'glb'
  if (contentType.includes('gltf+json') || name.endsWith('.gltf') || url.endsWith('.gltf')) return 'gltf'
  return null
}

function unwrap(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null
  const data = payload.data
  if (
    isRecord(data) &&
    (data.model_glb || data.model_urls || data.model_mesh || data.rendered_image || data.thumbnail)
  ) {
    return data
  }
  return payload
}

function fileSize(file: FalFile): number | null {
  return typeof file.file_size === 'number' && Number.isFinite(file.file_size) && file.file_size > 0
    ? file.file_size
    : null
}

export function parseFalOutput(payload: unknown): ParsedAsset | null {
  const data = unwrap(payload)
  if (!data) return null

  const urls = isRecord(data.model_urls) ? data.model_urls : {}
  const candidates = [urls.glb, urls.pbr_model, data.model_glb, data.model_mesh, urls.base_model]

  for (const candidate of candidates) {
    const file = asFile(candidate)
    if (!file || typeof file.url !== 'string' || file.url.length === 0) continue
    const format = detectFormat(file)
    if (!format) continue
    const thumbnail = asFile(data.rendered_image) ?? asFile(data.thumbnail)
    const thumbnailUrl = thumbnail && typeof thumbnail.url === 'string' ? thumbnail.url : null
    return {
      url: file.url,
      format,
      fileSize: fileSize(file),
      thumbnailUrl,
    }
  }

  return null
}
