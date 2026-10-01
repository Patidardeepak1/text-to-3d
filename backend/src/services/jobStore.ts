import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { storageDir } from '../config/env.js'
import type { GenerationRecord } from '../types/generation.js'
import { logger } from '../utils/logger.js'

export class JobStore {
  private readonly records = new Map<string, GenerationRecord>()
  private loaded = false

  async init(): Promise<void> {
    if (this.loaded) return
    await mkdir(storageDir, { recursive: true })
    const entries = await readdir(storageDir)
    await Promise.all(
      entries
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          try {
            const raw = await readFile(path.join(storageDir, name), 'utf8')
            const record = JSON.parse(raw) as GenerationRecord
            if (record?.id) this.records.set(record.id, record)
          } catch (error) {
            logger.warn('store.skip_record', {
              file: name,
              technical: error instanceof Error ? error.message : 'unknown',
            })
          }
        }),
    )
    this.loaded = true
  }

  get(id: string): GenerationRecord | undefined {
    return this.records.get(id)
  }

  async save(record: GenerationRecord): Promise<void> {
    this.records.set(record.id, record)
    await mkdir(storageDir, { recursive: true })
    const destination = path.join(storageDir, `${record.id}.json`)
    const temporary = `${destination}.tmp`
    await writeFile(temporary, JSON.stringify(record), 'utf8')
    await rename(temporary, destination)
  }
}
