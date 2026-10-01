import { useCallback, useEffect, useState } from 'react'
import type { Generation } from '../types/generation'

const STORAGE_KEY = '3dforge.history.v1'
const MAX_ITEMS = 12

function readHistory(): Generation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Generation[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

export function useHistory() {
  const [items, setItems] = useState<Generation[]>(() => readHistory())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
    } catch {
      // Private browsing can block storage. History still works for this session.
    }
  }, [items])

  const add = useCallback((generation: Generation) => {
    setItems((current) => [generation, ...current.filter((item) => item.id !== generation.id)].slice(0, MAX_ITEMS))
  }, [])

  return { items, add }
}
