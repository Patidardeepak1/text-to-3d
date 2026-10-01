import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useHistory } from './useHistory'
import { ApiError, api } from '../services/api'
import type { Generation } from '../types/generation'

type Phase = 'idle' | 'generating' | 'completed' | 'error'

interface GenerationContextValue {
  prompt: string
  setPrompt: (value: string) => void
  phase: Phase
  current: Generation | null
  error: string | null
  history: Generation[]
  configured: boolean | null
  apiOnline: boolean | null
  demoMode: boolean
  modelLabel: string
  start: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
  regenerate: () => Promise<void>
  restore: (generation: Generation) => Promise<void>
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

function isActive(status: Generation['status'] | undefined) {
  return status === 'queued' || status === 'processing'
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const { items, add } = useHistory()
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<Generation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hashLoaded = useRef(false)

  const metaQuery = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.meta(),
    staleTime: 60_000,
    retry: 1,
  })

  const apply = useCallback(
    (generation: Generation) => {
      setCurrent(generation)
      setPrompt(generation.prompt)
      if (generation.status === 'completed') {
        setPhase('completed')
        setError(null)
        add(generation)
        window.history.replaceState(null, '', `#model=${generation.id}`)
        return
      }
      if (generation.status === 'failed') {
        setPhase('error')
        setError(generation.error ?? 'Model generation failed. Please try again.')
        return
      }
      if (generation.status === 'cancelled') {
        setPhase('idle')
        setError(null)
        return
      }
      setPhase('generating')
      setError(null)
    },
    [add],
  )

  const generationQuery = useQuery({
    queryKey: ['generation', current?.id],
    queryFn: () => api.getGeneration(current!.id),
    enabled: Boolean(current && isActive(current.status)),
    refetchInterval: (query) => (isActive(query.state.data?.status ?? current?.status) ? 2500 : false),
    refetchIntervalInBackground: true,
    retry: 1,
  })

  useEffect(() => {
    const next = generationQuery.data
    if (!next || !current || next.id !== current.id) return
    if (next.status === current.status && next.updatedAt === current.updatedAt && next.step === current.step) return
    apply(next)
  }, [apply, current, generationQuery.data])

  const start = useCallback(
    async (value: string) => {
      if (phase === 'generating') return
      setPhase('generating')
      setError(null)
      try {
        apply(await api.createGeneration(value))
      } catch (err) {
        setPhase('error')
        setError(messageFrom(err))
      }
    },
    [apply, phase],
  )

  const cancel = useCallback(async () => {
    if (!current?.cancellable) return
    try {
      apply(await api.cancelGeneration(current.id))
    } catch (err) {
      setError(messageFrom(err))
    }
  }, [apply, current])

  const regenerate = useCallback(async () => {
    if (!current) return
    await start(current.prompt)
  }, [current, start])

  const restore = useCallback(
    async (generation: Generation) => {
      apply(generation)
      try {
        apply(await api.getGeneration(generation.id))
      } catch (err) {
        setPhase('error')
        setError(messageFrom(err))
      }
    },
    [apply],
  )

  useEffect(() => {
    if (hashLoaded.current) return
    hashLoaded.current = true
    const match = /^#model=([0-9a-f-]{36})$/i.exec(window.location.hash)
    if (!match?.[1]) return
    void api
      .getGeneration(match[1])
      .then(apply)
      .catch(() => {
        setPhase('error')
        setError('That shared model is no longer available on the server.')
      })
  }, [apply])

  const value = useMemo<GenerationContextValue>(
    () => ({
      prompt,
      setPrompt,
      phase,
      current,
      error,
      history: items,
      configured: metaQuery.data?.configured ?? null,
      apiOnline: metaQuery.isSuccess ? true : metaQuery.isError ? false : null,
      demoMode: metaQuery.data?.demo ?? false,
      modelLabel: metaQuery.data?.modelLabel ?? 'Tripo v3.1',
      start,
      cancel,
      regenerate,
      restore,
    }),
    [cancel, current, error, items, metaQuery.data, metaQuery.isError, metaQuery.isSuccess, phase, prompt, regenerate, restore, start],
  )

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>
}

export function useGeneration() {
  const context = useContext(GenerationContext)
  if (!context) throw new Error('useGeneration must be used within GenerationProvider')
  return context
}
