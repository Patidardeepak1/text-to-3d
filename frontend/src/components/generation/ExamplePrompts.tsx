import type { ExamplePrompt } from '../../lib/examples'

interface ExamplePromptsProps {
  prompts: ExamplePrompt[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function ExamplePrompts({ prompts, onSelect, disabled = false }: ExamplePromptsProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Example prompts">
      {prompts.map((example) => (
        <button
          key={example.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(example.prompt)}
          className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-sm text-muted transition hover:border-white/20 hover:text-ink disabled:opacity-45"
        >
          {example.label}
        </button>
      ))}
    </div>
  )
}
