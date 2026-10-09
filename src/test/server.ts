import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const RELAY = 'http://relay.test'
/** The administrator key the fake relay accepts. */
export const ADMIN_KEY = 'test-admin-key-0123'

export const channelsPayload = {
  ok: true,
  path: '/app/channels.yaml',
  count: 4,
  channels: [
    { ch: 'cctv1', chinese: 'CCTV-1 综合', cnlid: '1', livepid: '10', group: '央视', logo: 'https://cdn/1.png' },
    { ch: 'cctv2', chinese: 'CCTV-2 财经', cnlid: '2', livepid: '20', group: '央视', logo: '' },
    { ch: 'shandongws', chinese: '山东卫视', cnlid: '3', livepid: '30', group: '卫视', logo: '' },
    { ch: 'misc', chinese: '', cnlid: '4', livepid: '40', group: '', logo: '' },
  ],
}

/** A channels payload with `count` channels spread over two groups. */
export function manyChannelsPayload(count: number) {
  const channels = Array.from({ length: count }, (_, index) => ({
    ch: `ch${index + 1}`,
    chinese: `Channel ${index + 1}`,
    cnlid: String(index),
    livepid: String(index),
    group: index % 2 === 0 ? 'Even' : 'Odd',
    logo: '',
  }))
  return { ok: true, path: '/app/channels.yaml', count, channels }
}

export function healthPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    mode: 'rust-staged-mpegts',
    stats: {
      started_at_ms: 1,
      playlist_requests: 3,
      segment_requests: 10,
      live_info_fetches: 1,
      segment_streamed: 9,
      segment_errors: 1,
      segment_rejected: 0,
    },
    channels: { path: '/app/channels.yaml', count: 4, reload_error: null },
    notice: { url: 'https://notice', ttl_ms: 60000, cache: {} },
    api_flow: { completed: 2, queued: 0 },
    routes: [],
    ...overrides,
  }
}

export const server = setupServer(
  http.get(`${RELAY}/channels`, () => HttpResponse.json(channelsPayload)),
  http.get(`${RELAY}/health`, () => HttpResponse.json(healthPayload())),
  http.post(`${RELAY}/admin/verify`, async ({ request }) => {
    const body = (await request.json()) as { key?: string }
    return body.key === ADMIN_KEY
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ ok: false }, { status: 403 })
  }),
)
