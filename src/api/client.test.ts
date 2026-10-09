import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server, RELAY, channelsPayload, healthPayload } from '../test/server'
import {
  ApiError,
  fetchChannels,
  fetchHealth,
  livePlaylistUrl,
  parseChannels,
  parseHealth,
  verifyAdminKey,
  relayUrl,
} from './client'

describe('parseChannels', () => {
  it('maps relay fields and falls back to the slug for a missing name', () => {
    const channels = parseChannels(channelsPayload)
    expect(channels).toHaveLength(4)
    expect(channels[0]).toEqual({
      slug: 'cctv1',
      name: 'CCTV-1 综合',
      logo: 'https://cdn/1.png',
      group: '央视',
    })
    expect(channels[3]?.name).toBe('misc')
  })

  it('drops entries without a slug', () => {
    const channels = parseChannels({ ok: true, channels: [{ chinese: 'x' }, null, 5, { ch: 'a' }] })
    expect(channels.map((c) => c.slug)).toEqual(['a'])
  })

  it.each([null, 5, 'x', [], { ok: false, channels: [] }, { ok: true }, { ok: true, channels: 'no' }])(
    'rejects %j',
    (value) => {
      expect(() => parseChannels(value)).toThrow(ApiError)
    },
  )
})

describe('parseHealth', () => {
  it('reads the counters and the channels redirected to the notice stream', () => {
    const health = parseHealth(
      healthPayload({
        notice: { url: 'u', ttl_ms: 1, cache: { cctv1: { ttl_ms: 5 } } },
        channels: { count: 62, reload_error: 'cannot parse' },
      }),
    )
    expect(health.segmentsStreamed).toBe(9)
    expect(health.segmentErrors).toBe(1)
    expect(health.channelCount).toBe(62)
    expect(health.reloadError).toBe('cannot parse')
    expect(health.unavailable).toEqual(['cctv1'])
    expect(health.upstreamCalls).toBe(2)
  })

  it('tolerates missing sections and non-numeric values', () => {
    const health = parseHealth({ ok: true, stats: { playlist_requests: 'x' } })
    expect(health.playlistRequests).toBe(0)
    expect(health.channelCount).toBe(0)
    expect(health.unavailable).toEqual([])
    expect(health.reloadError).toBeNull()
  })

  it('rejects a response that is not ok', () => {
    expect(() => parseHealth({ ok: false })).toThrow(ApiError)
    expect(() => parseHealth(null)).toThrow(ApiError)
  })
})

describe('urls', () => {
  it('builds relay URLs from the configured base', () => {
    expect(relayUrl('/health')).toBe(`${RELAY}/health`)
    expect(livePlaylistUrl('cctv 1')).toBe(`${RELAY}/live/cctv%201.m3u8`)
  })
})

describe('fetching', () => {
  it('returns parsed data on success', async () => {
    expect(await fetchChannels()).toHaveLength(4)
    expect((await fetchHealth()).channelCount).toBe(4)
  })

  it('reports a server error status', async () => {
    server.use(http.get(`${RELAY}/channels`, () => new HttpResponse(null, { status: 500 })))
    await expect(fetchChannels()).rejects.toMatchObject({ failure: 'status', status: 500 })
  })

  it('reports a body that is not JSON as a shape error', async () => {
    server.use(http.get(`${RELAY}/health`, () => new HttpResponse('<html>', { status: 200 })))
    await expect(fetchHealth()).rejects.toMatchObject({ failure: 'shape' })
  })

  it('reports a dropped connection as a network error', async () => {
    server.use(http.get(`${RELAY}/health`, () => HttpResponse.error()))
    await expect(fetchHealth()).rejects.toMatchObject({ failure: 'network' })
  })

  it('reports malformed JSON of the wrong shape', async () => {
    server.use(http.get(`${RELAY}/channels`, () => HttpResponse.json({ ok: true, channels: 3 })))
    await expect(fetchChannels()).rejects.toMatchObject({ failure: 'shape' })
  })
})

describe('verifyAdminKey', () => {
  const answer = (
    status: number,
    body: Record<string, unknown> = { ok: status === 200 },
    headers: Record<string, string> = {},
  ) => server.use(http.post(`${RELAY}/admin/verify`, () => HttpResponse.json(body, { status, headers })))

  it('maps the relay answers to a verdict', async () => {
    answer(200)
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'granted', retryAfterSecs: null })
    answer(403)
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'denied', retryAfterSecs: null })
    answer(429, { ok: false, retry_after: 900 })
    expect((await verifyAdminKey('k')).verdict).toBe('locked')
    answer(500)
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'error', retryAfterSecs: null })
    answer(200, { ok: false })
    expect((await verifyAdminKey('k')).verdict).toBe('denied')
  })

  it('reports how long a lock lasts: the header first, then the body, else unknown', async () => {
    answer(429, { ok: false, retry_after: 900 }, { 'retry-after': '120' })
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'locked', retryAfterSecs: 120 })
    answer(429, { ok: false, retry_after: 900 })
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'locked', retryAfterSecs: 900 })
    answer(429, { ok: false })
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'locked', retryAfterSecs: null })
    answer(429, { ok: false, retry_after: -5 })
    expect((await verifyAdminKey('k')).retryAfterSecs).toBeNull()
  })

  it('reports a network failure as an error, never as access', async () => {
    server.use(http.post(`${RELAY}/admin/verify`, () => HttpResponse.error()))
    expect(await verifyAdminKey('k')).toEqual({ verdict: 'error', retryAfterSecs: null })
  })
})

describe('on a browser without AbortSignal.any and AbortSignal.timeout', () => {
  // Safari before 16 and 17.4: calling either throws, which once made a healthy relay look
  // unreachable on an iPhone.
  const saved = {
    any: Object.getOwnPropertyDescriptor(AbortSignal, 'any'),
    timeout: Object.getOwnPropertyDescriptor(AbortSignal, 'timeout'),
  }
  beforeEach(() => {
    Reflect.deleteProperty(AbortSignal, 'any')
    Reflect.deleteProperty(AbortSignal, 'timeout')
  })
  afterEach(() => {
    if (saved.any) Object.defineProperty(AbortSignal, 'any', saved.any)
    if (saved.timeout) Object.defineProperty(AbortSignal, 'timeout', saved.timeout)
  })

  it('really lacks them here', () => {
    expect('any' in AbortSignal).toBe(false)
    expect('timeout' in AbortSignal).toBe(false)
  })

  it('still loads the channels and the health', async () => {
    expect((await fetchChannels()).length).toBeGreaterThan(0)
    expect((await fetchHealth()).channelCount).toBeGreaterThan(0)
    expect((await fetchChannels(new AbortController().signal)).length).toBeGreaterThan(0)
  })

  it('still checks an administrator key', async () => {
    server.use(http.post(`${RELAY}/admin/verify`, () => HttpResponse.json({ ok: true })))
    expect((await verifyAdminKey('k')).verdict).toBe('granted')
    server.use(http.post(`${RELAY}/admin/verify`, () => HttpResponse.json({ ok: false }, { status: 403 })))
    expect((await verifyAdminKey('k')).verdict).toBe('denied')
  })

  it('still reports a relay that really is down', async () => {
    server.use(http.get(`${RELAY}/channels`, () => HttpResponse.error()))
    await expect(fetchChannels()).rejects.toMatchObject({ failure: 'network' })
  })
})

describe('livePlaylistUrl', () => {
  it('is the normal playlist unless the lighter stream is asked for', () => {
    expect(livePlaylistUrl('cctv1')).toBe(`${RELAY}/live/cctv1.m3u8`)
    expect(livePlaylistUrl('cctv1', false)).toBe(`${RELAY}/live/cctv1.m3u8`)
    expect(livePlaylistUrl('cctv1', true)).toBe(`${RELAY}/live/cctv1.m3u8?profile=compat`)
    expect(livePlaylistUrl('a b', true)).toBe(`${RELAY}/live/a%20b.m3u8?profile=compat`)
  })
})

