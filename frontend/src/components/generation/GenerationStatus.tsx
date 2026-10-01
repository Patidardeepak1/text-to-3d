import { motion, useReducedMotion } from 'framer-motion'

const aiSteps = ['Preparing prompt', 'Generating geometry', 'Processing materials', 'Preparing 3D viewer']
const demoSteps = ['Preparing development sample', 'Loading development sample', 'Preparing 3D viewer']

interface GenerationStatusProps {
  step: string | null
  queuePosition: number | null
  detail: string | null
  isDemo: boolean
  onCancel?: () => void
  canCancel: boolean
}

function activeIndex(step: string | null, steps: string[]) {
  if (!step) return 0
  const index = steps.findIndex((item) => step.toLowerCase().includes(item.toLowerCase().slice(0, 12)))
  if (index >= 0) return index
  if (step.toLowerCase().includes('material') || step.toLowerCase().includes('texture')) return Math.min(2, steps.length - 1)
  if (step.toLowerCase().includes('geometry') || step.toLowerCase().includes('generating')) return Math.min(1, steps.length - 1)
  if (step.toLowerCase().includes('viewer')) return steps.length - 1
  return 0
}

export function GenerationStatus({ step, queuePosition, detail, isDemo, onCancel, canCancel }: GenerationStatusProps) {
  const reduce = useReducedMotion()
  const steps = isDemo ? demoSteps : aiSteps
  const active = activeIndex(step, steps)

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center" role="status" aria-live="polite">
      <motion.div
        className="relative mb-8 h-24 w-24"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-3xl border border-indigo-300/30" />
        <span className="absolute inset-3 rounded-2xl border border-violet-300/40" />
        <span className="absolute inset-6 rounded-xl bg-indigo-400/20" />
      </motion.div>
      <h2 className="font-serif text-3xl text-ink">{isDemo ? 'Loading the development sample...' : 'Creating your 3D model...'}</h2>
      <ol className="mt-8 w-full max-w-sm space-y-3 text-left text-sm">
        {steps.map((label, index) => {
          const state = index < active ? 'done' : index === active ? 'current' : 'upcoming'
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${
                  state === 'upcoming' ? 'border-border text-muted' : 'border-indigo-300/50 text-indigo-100'
                }`}
                aria-hidden="true"
              >
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span className={state === 'upcoming' ? 'text-muted' : 'text-ink'}>
                {label}
                {state === 'current' ? <span className="sr-only">, in progress</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
      {queuePosition !== null ? <p className="mt-4 text-sm text-muted">Queue position: {queuePosition}</p> : null}
      {detail ? <p className="mt-2 max-w-md text-sm text-muted">{detail}</p> : null}
      {canCancel && onCancel ? (
        <button type="button" onClick={onCancel} className="mt-6 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Cancel generation
        </button>
      ) : null}
    </div>
  )
}
