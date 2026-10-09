import type { RelayHealth } from '../../api/types'
import { formatClock, formatCount } from '../../lib/format'
import styles from './HealthStrip.module.css'

interface HealthStripProps {
  health: RelayHealth | undefined
  /** True when the latest /health request failed. */
  failed: boolean
  /** When the latest successful response arrived, in ms since the epoch (0 if never). */
  lastSeenMs: number
  themeLabel: string
  onToggleTheme: () => void
}

export function HealthStrip({
  health,
  failed,
  lastSeenMs,
  themeLabel,
  onToggleTheme,
}: HealthStripProps) {
  const offline = failed
  return (
    <header className={styles.strip}>
      <h1 className={styles.brand}>Relay console</h1>
      <div className={styles.status} role="status" data-offline={offline}>
        <span className={styles.dot} data-offline={offline} aria-hidden="true" />
        {offline ? (
          <span>
            Relay unreachable
            {lastSeenMs > 0 ? `, last seen ${formatClock(lastSeenMs)}` : ''}
          </span>
        ) : health ? (
          <span>Relay online</span>
        ) : (
          <span>Checking the relay…</span>
        )}
      </div>
      {health && (
        <dl className={styles.facts} aria-label="Relay figures" data-stale={offline}>
          <Fact label="Channels" value={formatCount(health.channelCount)} />
          <Fact label="Playlists served" value={formatCount(health.playlistRequests)} />
          <Fact label="Segments streamed" value={formatCount(health.segmentsStreamed)} />
          <Fact
            label="Segment errors"
            value={formatCount(health.segmentErrors)}
            warn={health.segmentErrors > 0}
          />
          <Fact label="Upstream calls" value={formatCount(health.upstreamCalls)} />
        </dl>
      )}
      {health?.reloadError && (
        <p className={styles.warning} role="alert">
          The channel file has an error, so the relay is serving its last good list.
        </p>
      )}
      <button type="button" className={styles.theme} onClick={onToggleTheme}>
        {themeLabel}
      </button>
    </header>
  )
}

function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={styles.fact} data-warn={warn}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
