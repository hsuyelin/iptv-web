import type { RelayHealth } from '../../api/types'
import { useI18n } from '../../i18n/locale'
import styles from './RelayStats.module.css'

interface RelayStatsProps {
  health: RelayHealth | undefined
  /** True when the latest /health request failed, so the figures may be out of date. */
  stale: boolean
}

/** The relay's counters as glass tiles. Renders nothing until the first response. */
export function RelayStats({ health, stale }: RelayStatsProps) {
  const { t, formatNumber } = useI18n()
  if (!health) return null
  return (
    <section className={styles.stats} aria-labelledby="relay-stats-title">
      <h2 id="relay-stats-title" className={styles.title}>
        {t('stats.title')}
      </h2>
      {health.reloadError && (
        <p className={styles.warning} role="alert">
          {t('stats.reloadError')}
        </p>
      )}
      <dl className={styles.facts} aria-label={t('stats.figures')} data-stale={stale}>
        <Fact label={t('stats.channels')} value={formatNumber(health.channelCount)} />
        <Fact label={t('stats.playlists')} value={formatNumber(health.playlistRequests)} />
        <Fact label={t('stats.segments')} value={formatNumber(health.segmentsStreamed)} />
        <Fact
          label={t('stats.errors')}
          value={formatNumber(health.segmentErrors)}
          warn={health.segmentErrors > 0}
        />
        <Fact label={t('stats.requests')} value={formatNumber(health.segmentRequests)} />
        <Fact
          label={t('stats.rejected')}
          value={formatNumber(health.segmentsRejected)}
          warn={health.segmentsRejected > 0}
        />
        <Fact label={t('stats.upstream')} value={formatNumber(health.upstreamCalls)} />
        <Fact label={t('stats.queued')} value={formatNumber(health.upstreamQueued)} />
      </dl>
    </section>
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
