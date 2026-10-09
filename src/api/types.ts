/** A channel as the console shows it. */
export interface Channel {
  /** Slug used in stream URLs. */
  readonly slug: string
  readonly name: string
  readonly logo: string
  readonly group: string
}

/** The parts of the relay's /health response the console uses. */
export interface RelayHealth {
  readonly channelCount: number
  /** Path of the channel file the relay reads, as the relay reports it. */
  readonly channelFile: string
  /** When the relay started, in ms since the epoch (0 if unknown). */
  readonly startedAtMs: number
  /** Why the latest channel-file reload failed, if it did. */
  readonly reloadError: string | null
  readonly playlistRequests: number
  readonly segmentRequests: number
  readonly segmentsStreamed: number
  readonly segmentErrors: number
  readonly segmentsRejected: number
  /** Slugs the relay currently redirects to its notice stream. */
  readonly unavailable: readonly string[]
  readonly upstreamCalls: number
  readonly upstreamQueued: number
}

/** One reading of the relay's counters, kept to draw the dashboard's chart. */
export interface HealthSample {
  /** When the reading arrived, in ms since the epoch. */
  readonly at: number
  readonly segmentsStreamed: number
  readonly segmentErrors: number
}
