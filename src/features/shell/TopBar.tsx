import type { RelayHealth } from '../../api/types'
import { GlobeIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import { LOCALES, LOCALE_NAME, LOCALE_SHORT } from '../../i18n/messages'
import { useSenior } from '../../i18n/senior'
import styles from './TopBar.module.css'

interface TopBarProps {
  health: RelayHealth | undefined
  /** True when the latest /health request failed. */
  failed: boolean
  /** When the latest successful response arrived, in ms since the epoch (0 if never). */
  lastSeenMs: number
}

/** Brand, relay status and the language switch, over a translucent bar. */
export function TopBar({ health, failed, lastSeenMs }: TopBarProps) {
  const { locale, setLocale, t, formatClock } = useI18n()
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
      <div className={styles.language} role="group" aria-label={t('nav.language')}>
        <span className={styles.globe}>
          <GlobeIcon />
        </span>
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            aria-pressed={option === locale}
            aria-label={LOCALE_NAME[option]}
            lang={option}
            onClick={() => setLocale(option)}
          >
            {LOCALE_SHORT[option]}
          </button>
        ))}
      </div>
    </header>
  )
}
