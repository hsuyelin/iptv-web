import { useCallback, useSyncExternalStore } from 'react'
import { LOCALES, MESSAGES, type Locale, type MessageKey } from './messages'

const STORAGE_KEY = 'iptv-web-locale'
const listeners = new Set<() => void>()

/** Maps browser language tags to the closest supported language; English otherwise. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('zh')) {
      const traditional = /hant|-tw|-hk|-mo/.test(lower)
      return traditional ? 'zh-TW' : 'zh-CN'
    }
    if (lower.startsWith('en')) return 'en'
  }
  return 'en'
}

function stored(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return LOCALES.find((locale) => locale === value) ?? null
  } catch {
    return null
  }
}

function snapshot(): Locale {
  return stored() ?? detectLocale(window.navigator.languages ?? [window.navigator.language])
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Replaces `{name}` placeholders in `template`. */
export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  formatNumber: (value: number) => string
  formatClock: (epochMs: number) => string
}

/** The active language: the saved choice, else the browser's, else English. */
export function useI18n(): I18n {
  const locale = useSyncExternalStore(subscribe, snapshot, (): Locale => 'en')
  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked; the choice then lasts only until reload.
    }
    listeners.forEach((listener) => listener())
  }, [])
  const t = useCallback<I18n['t']>(
    (key, params) => format(MESSAGES[locale][key], params),
    [locale],
  )
  const formatNumber = useCallback(
    (value: number) => new Intl.NumberFormat(locale).format(value),
    [locale],
  )
  const formatClock = useCallback(
    (epochMs: number) => new Date(epochMs).toLocaleTimeString(locale, { hour12: false }),
    [locale],
  )
  return { locale, setLocale, t, formatNumber, formatClock }
}
