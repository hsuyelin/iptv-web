import { describe, expect, it } from 'vitest'
import { format, detectLocale } from './locale'
import { LOCALES, MESSAGES, type MessageKey } from './messages'

const keys = Object.keys(MESSAGES.en) as MessageKey[]
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('messages', () => {
  it.each(LOCALES)('%s has every key, filled in', (locale) => {
    expect(Object.keys(MESSAGES[locale]).sort()).toEqual([...keys].sort())
    for (const key of keys) expect(MESSAGES[locale][key].trim()).not.toBe('')
  })

  it.each(LOCALES)('%s uses the same placeholders as English', (locale) => {
    for (const key of keys) {
      expect(placeholders(MESSAGES[locale][key]), `${locale} ${key}`).toEqual(
        placeholders(MESSAGES.en[key]),
      )
    }
  })

  it('keeps Traditional text distinct from Simplified', () => {
    expect(MESSAGES['zh-TW']['player.playlist']).toBe('播放清單')
    expect(MESSAGES['zh-CN']['player.playlist']).toBe('播放列表')
  })
})

describe('detectLocale', () => {
  it('maps Chinese variants to the right script', () => {
    expect(detectLocale(['zh-CN'])).toBe('zh-CN')
    expect(detectLocale(['zh'])).toBe('zh-CN')
    expect(detectLocale(['zh-Hans-CN'])).toBe('zh-CN')
    expect(detectLocale(['zh-TW'])).toBe('zh-TW')
    expect(detectLocale(['zh-HK'])).toBe('zh-TW')
    expect(detectLocale(['zh-Hant'])).toBe('zh-TW')
  })

  it('takes the first supported language', () => {
    expect(detectLocale(['fr-FR', 'zh-TW', 'en'])).toBe('zh-TW')
    expect(detectLocale(['en-GB'])).toBe('en')
    expect(detectLocale(['ja', 'en-US'])).toBe('en')
  })

  it('falls back to Simplified Chinese when nothing usable is reported', () => {
    expect(detectLocale([])).toBe('zh-CN')
    expect(detectLocale(['ja', 'de'])).toBe('zh-CN')
    expect(detectLocale([''])).toBe('zh-CN')
  })
})

describe('format', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(format('Hi {name}', { name: 'Ana' })).toBe('Hi Ana')
    expect(format('Hi {name} {x}', { name: 'Ana' })).toBe('Hi Ana {x}')
    expect(format('plain')).toBe('plain')
  })
})
