import type { ApiFailure, Generation, ServiceMeta } from '../types/generation'
import { filenameFromDisposition } from '../lib/format'

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function assetUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${baseUrl}${path}`
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function failureMessage(payload: unknown, fallback: string): { code: string; message: string } {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as ApiFailure).error
    if (error?.message) return { code: error.code || 'REQUEST_FAILED', message: error.message }
  }
  return { code: 'REQUEST_FAILED', message: fallback }
}

async function request<T>(path: string, init: RequestInit | undefined, timeoutMs: number): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'The 3D generation service is temporarily unavailable.')
  }

  const payload = await readPayload(response)
  if (!response.ok || !isSuccess<T>(payload)) {
    const error = failureMessage(payload, 'Something went wrong. Please try again.')
    throw new ApiError(response.status, error.code, error.message)
  }
  return payload.data
}

function isSuccess<T>(payload: unknown): payload is { success: true; data: T } {
  return typeof payload === 'object' && payload !== null && 'success' in payload && (payload as { success: boolean }).success === true && 'data' in payload
}

export const api = {
  meta() {
    return request<ServiceMeta>('/api/v1/meta', undefined, 15_000)
  },
  createGeneration(prompt: string) {
    return request<Generation>(
      '/api/v1/generations',
      { method: 'POST', body: JSON.stringify({ prompt }) },
      45_000,
    )
  },
  getGeneration(id: string) {
    return request<Generation>(`/api/v1/generations/${id}`, undefined, 180_000)
  },
  cancelGeneration(id: string) {
    return request<Generation>(`/api/v1/generations/${id}/cancel`, { method: 'POST' }, 30_000)
  },
  async download(path: string, fallbackName: string) {
    const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(180_000) })
    if (!response.ok) {
      throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'The model could not be downloaded.')
    }
    const blob = await response.blob()
    const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallbackName)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return filename
  },
}
