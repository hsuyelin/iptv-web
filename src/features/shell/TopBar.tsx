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
}

/** Brand, relay status and the language switch, over a translucent bar. */
export function TopBar({ health, failed, lastSeenMs, route }: TopBarProps) {
  const { t, formatClock } = useI18n()
  const { senior, toggle } = useSenior()
  const label = failed
    ? lastSeenMs > 0
      ? t('status.offlineSince', { time: formatClock(lastSeenMs) })
      : t('status.offline')
    : health
      ? t('status.online')
      : t('status.checking')
  const state = failed ? 'offline' : health ? 'online' : 'checking'

  return (
    <header className={styles.bar}>
      <h1 className={styles.brand}>
        <span className={styles.mark} aria-hidden="true" />
        IPTV
      </h1>
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
      <div className={styles.status} role="status" data-state={state}>
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
