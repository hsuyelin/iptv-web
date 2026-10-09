import { useCallback, useSyncExternalStore } from 'react'
import { formatDuration as formatDurationIn, formatNumber as formatNumberIn } from '../lib/format'
import { LOCALES, MESSAGES, type Locale, type MessageKey } from './messages'

const STORAGE_KEY = 'iptv-web-locale'
const listeners = new Set<() => void>()

/** Used when the browser's language is missing or is not one the console speaks. */
export const FALLBACK_LOCALE: Locale = 'zh-CN'

/**
 * Maps browser language tags to the closest supported language. Falls back to Simplified
 * Chinese when no tag is given or none of them is supported.
 */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('zh')) {
      const traditional = /hant|-tw|-hk|-mo/.test(lower)
      return traditional ? 'zh-TW' : 'zh-CN'
    }
    if (lower.startsWith('en')) return 'en'
  }
  return FALLBACK_LOCALE
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
  const languages = window.navigator.languages ?? [window.navigator.language]
  return stored() ?? detectLocale(languages.filter((tag) => typeof tag === 'string'))
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
  /** "3h 12m": the two largest units of a duration, in the active language. */
  formatDuration: (ms: number) => string
}

/** The active language: the saved choice, else the browser's, else English. */
export function useI18n(): I18n {
  const locale = useSyncExternalStore(subscribe, snapshot, (): Locale => FALLBACK_LOCALE)
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
  const formatNumber = useCallback((value: number) => formatNumberIn(value, locale), [locale])
  const formatClock = useCallback(
    (epochMs: number) => new Date(epochMs).toLocaleTimeString(locale, { hour12: false }),
    [locale],
  )
  const formatDuration = useCallback((ms: number) => formatDurationIn(ms, locale), [locale])
  return { locale, setLocale, t, formatNumber, formatClock, formatDuration }
}
