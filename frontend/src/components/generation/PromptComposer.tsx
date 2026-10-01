import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { MAX_PROMPT_LENGTH, promptSchema } from '../../lib/validation'
import { examplePrompts } from '../../lib/examples'
import { ExamplePrompts } from './ExamplePrompts'
import { GenerateButton } from './GenerateButton'

interface PromptComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (prompt: string) => void
  isSubmitting: boolean
  serverError?: string | null
}

interface PromptFields {
  prompt: string
}

export function PromptComposer({ value, onChange, onSubmit, isSubmitting, serverError }: PromptComposerProps) {
  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PromptFields>({
    resolver: zodResolver(promptSchema),
    defaultValues: { prompt: value },
  })

  useEffect(() => {
    setValue('prompt', value)
  }, [setValue, value])

  const prompt = watch('prompt') ?? ''
  const field = register('prompt')
  const message = errors.prompt?.message ?? serverError

  return (
    <form
      className="glass rounded-[28px] p-3 sm:p-4"
      onSubmit={handleSubmit((data) => onSubmit(data.prompt))}
      aria-busy={isSubmitting}
    >
      <label htmlFor="prompt" className="px-2 text-sm text-muted">
        Describe a 3D object
      </label>
      <textarea
        id="prompt"
        {...field}
        rows={5}
        maxLength={MAX_PROMPT_LENGTH + 40}
        placeholder="A futuristic spaceship with metallic silver panels and blue neon lights"
        disabled={isSubmitting}
        aria-invalid={Boolean(message)}
        aria-describedby="prompt-help"
        className="mt-2 w-full resize-none bg-transparent px-2 py-3 text-lg text-ink outline-none placeholder:text-muted/70 sm:text-xl"
        onChange={(event) => {
          void field.onChange(event)
          onChange(event.target.value)
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            void handleSubmit((data) => onSubmit(data.prompt))()
          }
        }}
      />
      <div className="flex flex-col gap-4 px-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <ExamplePrompts prompts={examplePrompts} disabled={isSubmitting} onSelect={(next) => {
            setValue('prompt', next, { shouldValidate: true })
            onChange(next)
          }} />
          <p id="prompt-help" className="text-xs text-muted">
            {shortcut} + Enter to generate
            <span className="px-2" aria-hidden="true">·</span>
            <span className={prompt.trim().length > MAX_PROMPT_LENGTH ? 'text-rose-300' : undefined}>
              {prompt.trim().length} / {MAX_PROMPT_LENGTH}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2.5 text-sm text-muted hover:text-ink disabled:opacity-45"
            onClick={() => {
              setValue('prompt', '')
              onChange('')
            }}
            disabled={isSubmitting || prompt.length === 0}
          >
            Clear
          </button>
          <GenerateButton isSubmitting={isSubmitting} />
        </div>
      </div>
      {message ? (
        <p role="alert" className="px-2 pt-3 text-sm text-rose-300">
          {message}
        </p>
      ) : null}
    </form>
  )
}
