import { afterEach, describe, expect, it, vi } from 'vitest'
import { compatOverride, compatWanted, iosMajor, wantsCompat } from './compat'

const IPHONE_15 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
const IPHONE_16 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const IPAD_9 =
  'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1'
const IPAD_DESKTOP_15 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15'
const IPAD_DESKTOP_17 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
const CHROME_IOS_14 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 8.0; Pixel 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

describe('iosMajor', () => {
  it('reads the system version from an iPhone, an old iPad or Chrome on iOS', () => {
    expect(iosMajor(IPHONE_15)).toBe(15)
    expect(iosMajor(IPHONE_16)).toBe(16)
    expect(iosMajor(IPAD_9)).toBe(9)
    expect(iosMajor(CHROME_IOS_14)).toBe(14)
  })

  it('takes an iPad that poses as a Mac by its touch screen and Safari version', () => {
    expect(iosMajor(IPAD_DESKTOP_15, 5)).toBe(15)
    expect(iosMajor(IPAD_DESKTOP_17, 5)).toBe(17)
  })

  it('knows a real Mac and an Android phone are not iOS', () => {
    expect(iosMajor(MAC, 0)).toBeNull()
    expect(iosMajor(MAC, 1)).toBeNull()
    expect(iosMajor(ANDROID, 5)).toBeNull()
    expect(iosMajor('', 0)).toBeNull()
  })
})

describe('compatOverride', () => {
  it('follows ?compat=1 and ?compat=0 anywhere in the query', () => {
    expect(compatOverride('?compat=1')).toBe(true)
    expect(compatOverride('?compat=on')).toBe(true)
    expect(compatOverride('?a=b&compat=1&c=d')).toBe(true)
    expect(compatOverride('?compat=0')).toBe(false)
    expect(compatOverride('?compat=off#/x')).toBe(false)
  })

  it('has no opinion otherwise', () => {
    for (const search of ['', '?', '?compat', '?compat=', '?compat=2', '?xcompat=1', '?a=compat=1']) {
      expect(compatOverride(search), search).toBeNull()
    }
  })

  it('does not need URLSearchParams, which iOS 9 lacks', () => {
    vi.stubGlobal('URLSearchParams', undefined)
    try {
      expect(compatOverride('?compat=1')).toBe(true)
      expect(wantsCompat(IPAD_9, '')).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('wantsCompat', () => {
  it('asks for the lighter stream on iOS before 16', () => {
    expect(wantsCompat(IPAD_9, '')).toBe(true)
    expect(wantsCompat(CHROME_IOS_14, '')).toBe(true)
    expect(wantsCompat(IPHONE_15, '')).toBe(true)
    expect(wantsCompat(IPAD_DESKTOP_15, '', 5)).toBe(true)
  })

  it('asks for the normal stream everywhere else', () => {
    expect(wantsCompat(IPHONE_16, '')).toBe(false)
    expect(wantsCompat(IPAD_DESKTOP_17, '', 5)).toBe(false)
    expect(wantsCompat(MAC, '')).toBe(false)
    expect(wantsCompat(ANDROID, '', 5)).toBe(false)
  })

  it('lets the address override the device, both ways', () => {
    expect(wantsCompat(MAC, '?compat=1')).toBe(true)
    expect(wantsCompat(IPAD_9, '?compat=0')).toBe(false)
  })
})

describe('compatWanted', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('reads this page', () => {
    expect(compatWanted()).toBe(false)
    window.history.replaceState({}, '', '/?compat=1')
    expect(compatWanted()).toBe(true)
    window.history.replaceState({}, '', '/')
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(IPAD_9)
    expect(compatWanted()).toBe(true)
  })
})
