import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
export const projectRoot = path.resolve(moduleDir, '../..')

dotenv.config({ path: path.join(projectRoot, '.env') })

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().optional().default(''),
  AI_PROVIDER: z.enum(['tripo', 'fal', 'demo']).default('tripo'),
  TRIPO_API_KEY: z.string().optional().default(''),
  TRIPO_MODEL: z.string().min(1).default('v3.1-20260211'),
  FAL_KEY: z.string().optional().default(''),
  FAL_MODEL_ID: z.string().min(1).default('tripo3d/h3.1/text-to-3d'),
  FAL_INPUT_JSON: z.string().optional().default(''),
  DEMO_DELAY_MS: z.coerce.number().int().nonnegative().default(800),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(8),
  STORAGE_DIR: z.string().min(1).default('data'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.message).join('; ')
  throw new Error(`Invalid environment configuration: ${details}`)
}

export const env = parsed.data

export const storageDir = path.resolve(projectRoot, env.STORAGE_DIR)
export const demoModelPath = path.join(projectRoot, 'assets', 'demo', 'sample.glb')

export function modelLabel(modelId: string): string {
  const id = modelId.toLowerCase()
  if (id.includes('v3.1')) return 'Tripo v3.1'
  if (id.includes('tripo')) return 'Tripo H3.1'
  if (id.includes('hunyuan')) return 'Hunyuan 3D'
  if (id.includes('meshy')) return 'Meshy'
  return modelId
}

export function parseExtraInput(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  let value: unknown
  try {
    value = JSON.parse(raw) as unknown
  } catch {
    throw new Error('FAL_INPUT_JSON must be valid JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('FAL_INPUT_JSON must be a JSON object')
  }
  if ('prompt' in value) {
    throw new Error('FAL_INPUT_JSON cannot override prompt')
  }
  return value as Record<string, unknown>
}
