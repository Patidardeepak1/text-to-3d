import { Grid3x3, Maximize2, Minimize2, RotateCcw, RotateCw, Square } from 'lucide-react'
import type { ReactNode } from 'react'

interface ViewerToolbarProps {
  autoRotate: boolean
  wireframe: boolean
  showGrid: boolean
  fullscreen: boolean
  background: string
  onReset: () => void
  onToggleRotate: () => void
  onToggleWireframe: () => void
  onToggleGrid: () => void
  onToggleFullscreen: () => void
  onBackground: (color: string) => void
}

const backgrounds = [
  { id: 'void', color: '#07070a', label: 'Void background' },
  { id: 'graphite', color: '#14151c', label: 'Graphite background' },
  { id: 'studio', color: '#1c1e27', label: 'Studio background' },
]

export function ViewerToolbar(props: ViewerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarButton label="Reset camera" onClick={props.onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Reset</span>
      </ToolbarButton>
      <ToolbarButton label={props.autoRotate ? 'Stop auto rotate' : 'Start auto rotate'} pressed={props.autoRotate} onClick={props.onToggleRotate}>
        <RotateCw size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Rotate</span>
      </ToolbarButton>
      <ToolbarButton label={props.wireframe ? 'Hide wireframe' : 'Show wireframe'} pressed={props.wireframe} onClick={props.onToggleWireframe}>
        <Square size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Wireframe</span>
      </ToolbarButton>
      <ToolbarButton label={props.showGrid ? 'Hide grid' : 'Show grid'} pressed={props.showGrid} onClick={props.onToggleGrid}>
        <Grid3x3 size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Grid</span>
      </ToolbarButton>
      <ToolbarButton label={props.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} pressed={props.fullscreen} onClick={props.onToggleFullscreen}>
        {props.fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
        <span className="hidden sm:inline">Fullscreen</span>
      </ToolbarButton>
      <div className="ml-auto flex items-center gap-1" role="group" aria-label="Background">
        {backgrounds.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={props.background === item.color}
            onClick={() => props.onBackground(item.color)}
            className={`h-7 w-7 rounded-full border ${props.background === item.color ? 'border-white' : 'border-white/20'}`}
            style={{ background: item.color }}
          />
        ))}
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  label,
  pressed,
  onClick,
}: {
  children: ReactNode
  label: string
  pressed?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
        pressed ? 'border-indigo-300/50 bg-white/10 text-ink' : 'border-border bg-black/20 text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
