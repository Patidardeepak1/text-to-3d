import { Box } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-white/5 text-muted">
        <Box aria-hidden="true" />
      </span>
      <h2 className="font-serif text-3xl">Your model will appear here</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
        Describe an object, generate it, then orbit the result. Drag to rotate, scroll to zoom, and right-click to pan.
      </p>
    </div>
  )
}
