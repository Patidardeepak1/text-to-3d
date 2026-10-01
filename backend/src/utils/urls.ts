const ALLOWED_SUFFIXES = ['fal.media', 'fal.ai', 'tripo3d.ai', 'tripo3d.com']

export function assertAllowedAssetUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Generated asset URL is invalid')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Generated asset URL must use HTTPS')
  }

  const host = url.hostname.toLowerCase()
  const allowed = ALLOWED_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  if (!allowed) {
    throw new Error('Generated asset URL host is not allowed')
  }

  return url
}

export function assertSafeProviderId(value: string): string {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(value)) {
    throw new Error('Provider job id is invalid')
  }
  return value
}

export function assertSafeModelId(value: string): string {
  if (!/^[a-zA-Z0-9._/-]{3,200}$/.test(value) || value.includes('..') || value.startsWith('/')) {
    throw new Error('FAL_MODEL_ID is invalid')
  }
  return value
}
