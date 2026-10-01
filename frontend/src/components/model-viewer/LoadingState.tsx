export function LoadingState({ label = 'Loading 3D viewer...' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4" role="status">
      <span className="h-10 w-10 animate-pulse rounded-2xl border border-indigo-300/40" aria-hidden="true" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
