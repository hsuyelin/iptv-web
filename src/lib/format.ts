import type { Locale } from '../i18n/messages'

/** 1234567 -> "1,234,567", without Intl (iOS 9 has none). Non-integers keep their fraction. */
function groupDigits(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  const [whole = '', fraction] = String(value).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

/** A number in the language's own style, or plain digit grouping where Intl is missing. */
export function formatNumber(value: number, locale: Locale): string {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return new Intl.NumberFormat(locale).format(value)
    }
  } catch {
    // An unknown locale or a half-built Intl: fall through to the plain form.
  }
  return groupDigits(value)
}

type Unit = 'day' | 'hour' | 'minute' | 'second'

/** Short unit labels, for browsers that cannot format a unit themselves. */
const UNIT_LABELS: Record<Locale, Record<Unit, string>> = {
  en: { day: 'd', hour: 'h', minute: 'm', second: 's' },
  'zh-CN': { day: '天', hour: '小时', minute: '分', second: '秒' },
  'zh-TW': { day: '天', hour: '小時', minute: '分', second: '秒' },
}

function formatUnit(value: number, unit: Unit, locale: Locale): string {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        unitDisplay: 'narrow',
      }).format(value)
    }
  } catch {
    // `style: 'unit'` is newer than Intl itself (Safari 14.1): use the labels below.
  }
  return `${formatNumber(value, locale)}${UNIT_LABELS[locale][unit]}`
}

/** "3h 12m": the two largest non-zero units of a duration, in the active language. */
export function formatDuration(ms: number, locale: Locale): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const parts: Array<[number, Unit]> = [
    [Math.floor(seconds / 86_400), 'day'],
    [Math.floor((seconds % 86_400) / 3600), 'hour'],
    [Math.floor((seconds % 3600) / 60), 'minute'],
    [seconds % 60, 'second'],
  ]
  const used = parts.filter(([value]) => value > 0).slice(0, 2)
  const shown = used.length > 0 ? used : [parts[3]!]
  return shown.map(([value, unit]) => formatUnit(value, unit, locale)).join(' ')
}
