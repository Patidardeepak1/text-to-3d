import { Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { formatBytes, formatDuration } from '../../lib/format'
import type { Generation } from '../../types/generation'
import { Button } from '../ui/Button'
import { DownloadButton } from './DownloadButton'

interface ModelInfoProps {
  generation: Generation
  onDownload: () => void
  downloading: boolean
  onRegenerate: () => void
  onCopy: () => void
  onShare: () => void
  regenerating: boolean
}

export function ModelInfo({ generation, onDownload, downloading, onRegenerate, onCopy, onShare, regenerating }: ModelInfoProps) {
  const [copied, setCopied] = useState(false)

  return (
    <aside className="glass flex flex-col gap-5 rounded-[28px] p-5">
      {generation.isDemo ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          Development Demo Model. This is a sample GLB, not an AI-generated result.
        </p>
      ) : null}
      <div>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Model</p>
        <h2 className="mt-2 text-xl leading-snug text-ink">{generation.name}</h2>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <Info label="Format" value={(generation.format ?? 'glb').toUpperCase()} />
        <Info label="Status" value={generation.status} />
        <Info label="File size" value={formatBytes(generation.fileSize)} />
        <Info label="Generation time" value={formatDuration(generation.generationTimeMs)} />
      </dl>
      <div>
        <p className="text-xs text-muted">Prompt</p>
        <p className="mt-2 text-sm leading-6 text-ink">{generation.prompt}</p>
      </div>
      <DownloadButton
        onDownload={onDownload}
        busy={downloading}
        disabled={!generation.downloadUrl}
        label={generation.format === 'gltf' ? 'Download .GLTF' : 'Download .GLB'}
      />
      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" onClick={onRegenerate} disabled={regenerating} aria-label="Regenerate">
          <RefreshCw size={15} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Regenerate</span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Copy prompt"
          onClick={() => {
            onCopy()
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          }}
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">Copy</span>
        </Button>
        <Button variant="ghost" onClick={onShare} aria-label="Copy share link">
          <Share2 size={15} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Share</span>
        </Button>
      </div>
    </aside>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-ink capitalize">{value}</dd>
    </div>
  )
}
