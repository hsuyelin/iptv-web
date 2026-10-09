import type { Channel, RelayHealth } from './types'

/** Why a call to the relay failed. */
export type ApiFailure = 'network' | 'status' | 'shape'

export class ApiError extends Error {
  readonly failure: ApiFailure
  readonly status: number | undefined

  constructor(failure: ApiFailure, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.failure = failure
    this.status = status
  }
}

const DEFAULT_TIMEOUT_MS = 4000

/** Base URL of the relay; empty means "same origin" (or the dev proxy). */
export function relayBase(): string {
  const configured: unknown = import.meta.env['VITE_RELAY_URL']
  return typeof configured === 'string' ? configured.replace(/\/+$/, '') : ''
}

/** Absolute or origin-relative URL for a relay route. */
export function relayUrl(path: string): string {
  return `${relayBase()}${path}`
}

/** URL of a channel's live playlist. */
export function livePlaylistUrl(slug: string): string {
  return relayUrl(`/live/${encodeURIComponent(slug)}.m3u8`)
}

async function fetchJson(path: string, signal: AbortSignal | undefined): Promise<unknown> {
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(relayUrl(path), { signal: combined })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'request failed'
    throw new ApiError('network', `Relay unreachable: ${reason}`)
  }
  if (!response.ok) {
    throw new ApiError('status', `Relay answered ${response.status}`, response.status)
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError('shape', 'Relay sent a response that is not JSON')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Reads the /channels response. Entries without a slug are dropped. */
export function parseChannels(json: unknown): Channel[] {
  if (!isRecord(json) || json['ok'] !== true || !Array.isArray(json['channels'])) {
    throw new ApiError('shape', 'Unexpected /channels response')
  }
  const channels: Channel[] = []
  for (const entry of json['channels'] as unknown[]) {
    if (!isRecord(entry)) continue
    const slug = text(entry['ch']).trim()
    if (slug === '') continue
    channels.push({
      slug,
      name: text(entry['chinese']).trim() || slug,
      logo: text(entry['logo']),
      group: text(entry['group']).trim(),
    })
  }
  return channels
}

/** Reads the /health response. */
export function parseHealth(json: unknown): RelayHealth {
  if (!isRecord(json) || json['ok'] !== true) {
    throw new ApiError('shape', 'Unexpected /health response')
  }
  const stats = isRecord(json['stats']) ? json['stats'] : {}
  const channels = isRecord(json['channels']) ? json['channels'] : {}
  const notice = isRecord(json['notice']) ? json['notice'] : {}
  const flow = isRecord(json['api_flow']) ? json['api_flow'] : {}
  const cache = isRecord(notice['cache']) ? notice['cache'] : {}
  const reloadError = channels['reload_error']
  return {
    channelCount: count(channels['count']),
    channelFile: text(channels['path']),
    startedAtMs: count(stats['started_at_ms']),
    reloadError: typeof reloadError === 'string' && reloadError !== '' ? reloadError : null,
    playlistRequests: count(stats['playlist_requests']),
    segmentRequests: count(stats['segment_requests']),
    segmentsStreamed: count(stats['segment_streamed']),
    segmentErrors: count(stats['segment_errors']),
    segmentsRejected: count(stats['segment_rejected']),
    unavailable: Object.keys(cache),
    upstreamCalls: count(flow['completed']),
    upstreamQueued: count(flow['queued']),
  }
}

export async function fetchChannels(signal?: AbortSignal): Promise<Channel[]> {
  return parseChannels(await fetchJson('/channels', signal))
}

export async function fetchHealth(signal?: AbortSignal): Promise<RelayHealth> {
  return parseHealth(await fetchJson('/health', signal))
}

/** What the relay said about an administrator key. */
export type AdminVerdict = 'granted' | 'denied' | 'locked' | 'error'

/**
 * Asks the relay whether `key` is the administrator key. The key travels in the request
 * body, never in a query string. A wrong key is `denied`; too many wrong ones from this
 * client is `locked`; anything unexpected, including a network failure, is `error`.
 */
export async function verifyAdminKey(key: string, signal?: AbortSignal): Promise<AdminVerdict> {
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(relayUrl('/admin/verify'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (response.status === 429) return 'locked'
    if (response.status === 403) return 'denied'
    if (!response.ok) return 'error'
    const body: unknown = await response.json()
    return isRecord(body) && body['ok'] === true ? 'granted' : 'denied'
  } catch {
    return 'error'
  }
}
