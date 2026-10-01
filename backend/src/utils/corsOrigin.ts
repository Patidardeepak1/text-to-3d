const PRODUCTION_HOST = 'text-to-3d-umber.vercel.app'
const PREVIEW_HOST = /^text-to-3d(?:-[a-z0-9]+)*-patidardeepak1s-projects\.vercel\.app$/

export function isAllowedOrigin(origin: string | undefined, configured: string[]): boolean {
  if (!origin) return true
  if (configured.includes('*') || configured.includes(origin)) return true

  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return host === PRODUCTION_HOST || PREVIEW_HOST.test(host)
}
