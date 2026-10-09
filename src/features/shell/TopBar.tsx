import type { RelayHealth } from '../../api/types'
import { useI18n } from '../../i18n/locale'
import { useSenior } from '../../i18n/senior'
import { ROUTE_HASH, type Route } from '../../lib/route'
import { LanguageMenu } from './LanguageMenu'
import styles from './TopBar.module.css'

interface TopBarProps {
  health: RelayHealth | undefined
  /** True when the latest /health request failed. */
  failed: boolean
  /** When the latest successful response arrived, in ms since the epoch (0 if never). */
  lastSeenMs: number
  route: Route
  /** True in administrator mode, which is the only mode that shows the page tabs. */
  admin: boolean
}

/** Brand, relay status and the language switch, over a translucent bar. */
export function TopBar({ health, failed, lastSeenMs, route, admin }: TopBarProps) {
  const { t, formatClock } = useI18n()
  const { senior, toggle } = useSenior()
  // The visible text is one word beside a green, red or amber dot; the full sentence
  // (with the last-seen time when offline) is the accessible name and the tooltip.
  const label = failed ? t('status.offline') : health ? t('status.online') : t('status.checking')
  const detail =
    failed && lastSeenMs > 0 ? t('status.offlineSince', { time: formatClock(lastSeenMs) }) : label
  const state = failed ? 'offline' : health ? 'online' : 'checking'

  return (
    <header className={styles.bar}>
      <h1 className={styles.brand}>
        <span className={styles.mark} aria-hidden="true" />
        IPTV
      </h1>
      {admin && (
          <nav className={styles.nav} aria-label={t('nav.main')}>
          {(['channels', 'dashboard'] as const).map((target) => (
            <a
              key={target}
              href={ROUTE_HASH[target]}
              className={styles.link}
              aria-current={route === target ? 'page' : undefined}
            >
              {t(target === 'channels' ? 'nav.channels' : 'nav.dashboard')}
            </a>
          ))}
        </nav>
      )}
      <span className={styles.spacer} aria-hidden="true" />
      <div
        className={styles.status}
        role="status"
        data-state={state}
        aria-label={detail}
        title={detail}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.statusText}>{label}</span>
      </div>
      <button
        type="button"
        className={styles.senior}
        aria-pressed={senior}
        aria-label={t('nav.senior')}
        onClick={toggle}
      >
        <span className={styles.aa} aria-hidden="true">
          Aa
        </span>
        <span className={styles.seniorText}>{t('nav.senior')}</span>
      </button>
      <LanguageMenu />
    </header>
  )
}
