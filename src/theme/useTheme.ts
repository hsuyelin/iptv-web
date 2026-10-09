import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'iptv-web-theme'
const listeners = new Set<() => void>()
const query = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function snapshot(): Theme {
  return stored() ?? (query?.matches ? 'dark' : 'light')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  query?.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    query?.removeEventListener('change', listener)
  }
}

/** The active color scheme: the user's saved choice, else the system's. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, snapshot, (): Theme => 'light')
  const toggle = useCallback(() => {
    const next: Theme = snapshot() === 'dark' ? 'light' : 'dark'
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked; the choice then lasts only until reload.
    }
    listeners.forEach((listener) => listener())
  }, [])
  return { theme, toggle }
}
