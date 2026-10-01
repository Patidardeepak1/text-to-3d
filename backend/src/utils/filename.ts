export function modelNameFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 64) return cleaned
  return `${cleaned.slice(0, 61).trimEnd()}...`
}

export function promptToFilename(prompt: string, extension: 'glb' | 'gltf' = 'glb'): string {
  const base = prompt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${base || 'model'}.${extension}`
}

export function contentDisposition(filename: string, type: 'inline' | 'attachment'): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '') || 'model.glb'
  return `${type}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}
