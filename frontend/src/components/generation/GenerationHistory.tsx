import { formatTime } from '../../lib/format'
import { assetUrl } from '../../services/api'
import type { Generation } from '../../types/generation'

interface GenerationHistoryProps {
  items: Generation[]
  activeId?: string
  onSelect: (generation: Generation) => void
}

export function GenerationHistory({ items, activeId, onSelect }: GenerationHistoryProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Models you generate in this browser will show up here.</p>
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const thumb = assetUrl(item.thumbnailUrl)
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition hover:border-white/20 ${
                item.id === activeId ? 'border-indigo-300/50 bg-white/5' : 'border-border bg-card'
              }`}
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-xl bg-white/5 text-xs text-muted">
                  {item.format?.toUpperCase() ?? '3D'}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{item.name}</span>
                <span className="mt-1 block text-xs text-muted">
                  {formatTime(item.createdAt)} · {(item.format ?? 'glb').toUpperCase()}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
