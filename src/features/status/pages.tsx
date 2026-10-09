import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/locale'
import { StatusPage } from './StatusPage'
import styles from './StatusPage.module.css'

/** The channels, as a plain address: it also leaves a wrong key or a stray hash behind. */
const HOME = '/'

/** `m:ss`, or `h:mm:ss` from an hour up. */
export function formatCountdown(totalSecs: number): string {
  const secs = Math.max(0, Math.ceil(totalSecs))
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const rest = String(secs % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${minutes}:${rest}`
}

/** 404: an address that matches no page. */
export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <StatusPage
      code="404"
      tone="info"
      title={t('error.notFoundTitle')}
      text={t('error.notFoundText')}
      actions={
        <a className={styles.action} href={HOME}>
          {t('error.home')}
        </a>
      }
    />
  )
}

/** 503: the relay does not answer, so there is nothing to show. */
export function UnavailablePage({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <StatusPage
      code="503"
      tone="warn"
      urgent
      title={t('error.unavailableTitle')}
      text={t('error.unavailableText')}
      detail={t('app.channelsFailed', { detail })}
      actions={
        <button type="button" className={styles.action} onClick={onRetry}>
          {t('app.tryAgain')}
        </button>
      }
    />
  )
}

/** 403: the key in the address is not the administrator key. Says nothing about the key. */
export function DeniedPage() {
  const { t } = useI18n()
  return (
    <StatusPage
      code="403"
      tone="alert"
      urgent
      title={t('error.deniedTitle')}
      text={t('error.deniedText')}
      actions={
        <a className={styles.action} href={HOME}>
          {t('error.home')}
        </a>
      }
    />
  )
}

/** 429: too many wrong keys; checks are paused, and the page counts the pause down. */
export function LockedPage({ retryAfterSecs }: { retryAfterSecs: number | null }) {
  const { t } = useI18n()
  // The end is fixed once, so the count stays right however late the timer fires.
  const [endsAt] = useState(() => (retryAfterSecs === null ? null : Date.now() + retryAfterSecs * 1000))
  const remaining = () => (endsAt === null ? null : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
  const [left, setLeft] = useState(remaining)

  useEffect(() => {
    if (endsAt === null) return undefined
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(next)
      if (next === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  const ready = left === 0
  return (
    <StatusPage
      code="429"
      tone="warn"
      urgent
      title={t('error.lockedTitle')}
      text={ready ? t('error.lockedReady') : t('error.lockedText')}
      actions={
        <>
          {ready && (
            <button type="button" className={styles.action} onClick={() => window.location.reload()}>
              {t('app.tryAgain')}
            </button>
          )}
          <a className={`${styles.action} ${ready ? styles.quiet : ''}`} href={HOME}>
            {t('error.home')}
          </a>
        </>
      }
    >
      {left !== null && !ready && (
        <>
          <p className={styles.countdown} aria-hidden="true">
            {formatCountdown(left)}
          </p>
          <p className={styles.sr}>{t('error.lockedIn', { time: formatCountdown(left) })}</p>
        </>
      )}
    </StatusPage>
  )
}
