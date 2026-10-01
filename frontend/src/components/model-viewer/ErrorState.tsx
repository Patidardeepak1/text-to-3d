import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center" role="alert">
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-200">
        <AlertTriangle aria-hidden="true" />
      </span>
      <h2 className="font-serif text-3xl">Generation needs another try</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{message}</p>
    </div>
  )
}
