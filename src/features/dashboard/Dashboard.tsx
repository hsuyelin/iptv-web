import { HEALTH_INTERVAL_MS, HISTORY_LENGTH } from '../../api/queries'
import type { Channel, HealthSample, RelayHealth } from '../../api/types'
import { useI18n } from '../../i18n/locale'
import { RelayStats } from '../health/RelayStats'
import { Sparkline } from './Sparkline'
import styles from './Dashboard.module.css'

interface DashboardProps {
  health: RelayHealth | undefined
  /** True when the latest /health request failed. */
  failed: boolean
  /** When the latest successful response arrived, in ms since the epoch (0 if never). */
  lastSeenMs: number
  history: readonly HealthSample[]
  /** Used to give unavailable channels their display names. */
  channels: readonly Channel[]
  /** Current time in ms; passed in so uptime is stable under test. */
  now: number
}

/** Segments gained between each pair of readings; a restarted relay counts as zero. */
export function deltas(history: readonly HealthSample[]): number[] {
  return history.slice(1).map((sample, index) => {
    const before = history[index]
    return before ? Math.max(0, sample.segmentsStreamed - before.segmentsStreamed) : 0
  })
}

/** The relay at a glance: state, uptime, counters, a throughput chart and what needs care. */
export function Dashboard({ health, failed, lastSeenMs, history, channels, now }: DashboardProps) {
  const { t, formatClock, formatDuration, formatNumber } = useI18n()
  const state = failed ? 'offline' : health ? 'online' : 'checking'
  const names = new Map(channels.map((channel) => [channel.slug.toLowerCase(), channel.name]))
  const series = deltas(history)
  const total = health ? health.segmentsStreamed + health.segmentErrors : 0
  const errorRate = health && total > 0 ? (health.segmentErrors / total) * 100 : 0

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{t('dashboard.title')}</h2>

      <section className={styles.overview} data-state={state}>
        <div className={styles.state}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.stateText}>
            {failed
              ? t('status.offline')
              : health
                ? t('status.online')
                : t('dashboard.waiting')}
          </p>
        </div>
        <dl className={styles.details}>
          <Detail
            label={t('dashboard.updated')}
            value={lastSeenMs > 0 ? formatClock(lastSeenMs) : t('dashboard.unknown')}
          />
          <Detail
            label={t('dashboard.uptime')}
            value={
              health && health.startedAtMs > 0
                ? formatDuration(now - health.startedAtMs)
                : t('dashboard.unknown')
            }
          />
          <Detail
            label={t('dashboard.errorRate')}
            value={health ? `${formatNumber(Math.round(errorRate * 10) / 10)}%` : t('dashboard.unknown')}
          />
          <Detail
            label={t('dashboard.file')}
            value={health?.channelFile || t('dashboard.unknown')}
            wide
          />
        </dl>
      </section>

      <RelayStats health={health} stale={failed} />

      <section className={styles.card} aria-labelledby="traffic-title">
        <h3 id="traffic-title" className={styles.cardTitle}>
          {t('dashboard.traffic')}
        </h3>
        <p className={styles.hint}>
          {t('dashboard.trafficHint', {
            seconds: HEALTH_INTERVAL_MS / 1000,
            count: HISTORY_LENGTH,
          })}
        </p>
        <div className={styles.chart}>
          {series.length >= 2 ? (
            <Sparkline values={series} label={t('dashboard.traffic')} />
          ) : (
            <p className={styles.empty}>{t('dashboard.trafficEmpty')}</p>
          )}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="attention-title">
        <h3 id="attention-title" className={styles.cardTitle}>
          {t('dashboard.attention')}
        </h3>
        {health && health.reloadError && (
          <p className={styles.issue} role="alert">
            {t('stats.reloadError')} <code>{health.reloadError}</code>
          </p>
        )}
        {health && health.unavailable.length > 0 && (
          <div className={styles.issue}>
            <p>{t('dashboard.unavailable')}</p>
            <ul className={styles.chips}>
              {health.unavailable.map((slug) => (
                <li key={slug} className={styles.chip}>
                  {names.get(slug.toLowerCase()) ?? slug}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(!health || (!health.reloadError && health.unavailable.length === 0)) && (
          <p className={styles.clear}>{t('dashboard.allClear')}</p>
        )}
      </section>
    </div>
  )
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={styles.detail} data-wide={wide}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
