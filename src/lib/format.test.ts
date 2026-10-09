import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDuration, formatNumber } from './format'

afterEach(() => vi.unstubAllGlobals())

describe('formatNumber', () => {
  it('uses Intl where there is one', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567')
  })

  it('groups digits by hand where Intl is missing (iOS 9)', () => {
    vi.stubGlobal('Intl', undefined)
    expect(formatNumber(0, 'zh-CN')).toBe('0')
    expect(formatNumber(999, 'zh-CN')).toBe('999')
    expect(formatNumber(1000, 'zh-CN')).toBe('1,000')
    expect(formatNumber(1234567, 'en')).toBe('1,234,567')
    expect(formatNumber(-1234, 'en')).toBe('-1,234')
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
  })

  it('does not fail on a number that cannot be grouped', () => {
    vi.stubGlobal('Intl', undefined)
    expect(formatNumber(Number.NaN, 'en')).toBe('NaN')
    expect(formatNumber(Number.POSITIVE_INFINITY, 'en')).toBe('Infinity')
  })

  it('falls back when Intl itself throws', () => {
    vi.stubGlobal('Intl', {
      NumberFormat: () => {
        throw new RangeError('no')
      },
    })
    expect(formatNumber(12345, 'en')).toBe('12,345')
  })
})

describe('formatDuration', () => {
  const span = (d: number, h: number, m: number, s: number) => ((d * 24 + h) * 60 + m) * 60_000 + s * 1000

  it('keeps the two largest units', () => {
    expect(formatDuration(span(0, 3, 12, 40), 'en')).toMatch(/3.*12/)
    expect(formatDuration(span(2, 0, 0, 5), 'en')).toMatch(/2.*5/)
  })

  it('says 0 seconds for nothing and never goes negative', () => {
    expect(formatDuration(0, 'en')).toMatch(/0/)
    expect(formatDuration(-5000, 'en')).toMatch(/0/)
  })

  it('writes plain labels where Intl is missing, in each language', () => {
    vi.stubGlobal('Intl', undefined)
    expect(formatDuration(span(0, 3, 12, 40), 'en')).toBe('3h 12m')
    expect(formatDuration(span(1, 2, 0, 0), 'en')).toBe('1d 2h')
    expect(formatDuration(span(0, 3, 12, 0), 'zh-CN')).toBe('3小时 12分')
    expect(formatDuration(span(0, 3, 12, 0), 'zh-TW')).toBe('3小時 12分')
    expect(formatDuration(52_000, 'en')).toBe('52s')
    expect(formatDuration(0, 'zh-CN')).toBe('0秒')
  })

  it('writes the same labels where Intl exists but cannot format a unit (Safari 14.0 and older)', () => {
    const Real = Intl.NumberFormat
    vi.stubGlobal('Intl', {
      NumberFormat: function (locale: string, options?: Intl.NumberFormatOptions) {
        if (options?.style === 'unit') throw new RangeError('Value unit out of range for Intl.NumberFormat options property style')
        return new Real(locale, options)
      },
    })
    expect(formatDuration(span(0, 3, 12, 40), 'en')).toBe('3h 12m')
  })
})
