import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'iptv-web-senior'
const listeners = new Set<() => void>()

function snapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Senior mode: larger type and controls, and the channel list as one column. */
export function useSenior(): { senior: boolean; toggle: () => void } {
  const senior = useSyncExternalStore(subscribe, snapshot, () => false)
  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, snapshot() ? 'off' : 'on')
    } catch {
      // Storage can be blocked; the choice then lasts only until reload.
    }
    listeners.forEach((listener) => listener())
  }, [])
  return { senior, toggle }
}
