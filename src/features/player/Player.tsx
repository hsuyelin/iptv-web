import { useState } from 'react'
import type { Channel } from '../../api/types'
import { livePlaylistUrl } from '../../api/client'
import { PlayIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import type { MessageKey } from '../../i18n/messages'
import type { EngineFactory } from './playback/engine'
import { useHlsPlayback, type PlaybackState } from './playback/useHlsPlayback'
import styles from './Player.module.css'

interface PlayerProps {
  channel: Channel | null
  /** True when the relay is redirecting this channel to its notice stream. */
  unavailable: boolean
  /** Starts the first channel; shown on the empty stage when there is one to start. */
  onStart?: () => void
  factory?: EngineFactory
}

const STATE_LABEL: Record<PlaybackState, MessageKey> = {
  loading: 'player.loading',
  playing: 'player.playing',
  stalled: 'player.stalled',
  failed: 'player.failed',
}

/** The stage: artwork behind a rounded screen, with the channel's name and state under it. */
export function Player({ channel, unavailable, onStart, factory }: PlayerProps) {
  const { t } = useI18n()
  const [attempt, setAttempt] = useState(0)

  if (!channel) {
    return (
      <section className={styles.stage} aria-label={t('player.label')}>
        <div className={styles.frame}>
          <div className={`${styles.screen} ${styles.empty}`}>
            <p className={styles.emptyTitle}>{t('player.emptyTitle')}</p>
            <p className={styles.emptyText}>{t('player.emptyText')}</p>
            {onStart && (
              <button type="button" className={styles.start} onClick={onStart}>
                <PlayIcon />
                {t('player.start')}
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.stage} aria-label={t('player.label')}>
      {/* A new key mounts a new surface, which destroys the previous engine first. */}
      <Surface
        key={`${channel.slug}:${attempt}`}
        channel={channel}
        unavailable={unavailable}
        onRetry={() => setAttempt((value) => value + 1)}
        {...(factory ? { factory } : {})}
      />
    </section>
  )
}

interface SurfaceProps {
  channel: Channel
  unavailable: boolean
  onRetry: () => void
  factory?: EngineFactory
}

function Surface({ channel, unavailable, onRetry, factory }: SurfaceProps) {
  const { t } = useI18n()
  const { videoRef, state, failure, handlers } = useHlsPlayback({
    url: livePlaylistUrl(channel.slug),
    ...(factory ? { factory } : {}),
  })
  const onAir = state === 'playing' && !unavailable

  return (
    <div className={styles.frame}>
      <div className={styles.screen} data-state={state}>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          autoPlay
          muted
          playsInline
          aria-label={t('player.liveStream', { name: channel.name })}
          {...handlers}
        />
        {state === 'loading' && <div className={styles.veil}>{t('player.loadingVeil')}</div>}
        {state === 'stalled' && <div className={styles.veil}>{t('player.bufferingVeil')}</div>}
        {state === 'failed' && (
          <div className={styles.veil} role="alert">
            <p>{t('player.failedDetail', { detail: failure ?? '' })}</p>
            <button type="button" className={styles.retry} onClick={onRetry}>
              {t('player.retry')}
            </button>
          </div>
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.badge} data-on={onAir}>
          <span className={styles.tally} aria-hidden="true" />
        </span>
        <div className={styles.title}>
          <h2 className={styles.name}>{channel.name}</h2>
          <p className={styles.status} role="status">
            {unavailable ? t('player.unavailableShort') : t(STATE_LABEL[state])}
          </p>
        </div>
      </div>
      {unavailable && (
        <p className={styles.notice} role="alert">
          {t('player.unavailableNotice')}
        </p>
      )}
    </div>
  )
}
