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
