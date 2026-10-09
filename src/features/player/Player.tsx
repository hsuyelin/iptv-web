import { useId, useRef, useState } from 'react'
import type { Channel } from '../../api/types'
import { livePlaylistUrl } from '../../api/client'
import { compatWanted } from '../../lib/compat'
import { ArrowUpIcon, CloseIcon, ListIcon, PlayIcon } from '../../components/Icons'
import { useInView } from '../../components/useInView'
import { useI18n } from '../../i18n/locale'
import type { MessageKey } from '../../i18n/messages'
import type { EngineFactory } from './playback/engine'
import { useHlsPlayback } from './playback/useHlsPlayback'
import { Playlist } from './Playlist'
import styles from './Player.module.css'

interface PlayerProps {
  channel: Channel | null
  /** Every channel, for the playlist sidebar. */
  channels?: readonly Channel[]
  /** Switches to another channel; used by the playlist sidebar. */
  onSelect?: (channel: Channel) => void
  /** True when the relay is redirecting this channel to its notice stream. */
  unavailable: boolean
  /** Starts the first channel; shown on the empty stage when there is one to start. */
  onStart?: () => void
  /** Stops the stream and clears the selection; used by the floating window's close. */
  onClose?: () => void
  /** What the empty stage says: waiting for the list, an empty list, or idle. */
  status?: StageStatus
  /** Asks for the channel list again; offered when the list is empty. */
  onRefresh?: () => void
  factory?: EngineFactory
}

export type StageStatus = 'idle' | 'loading' | 'none'

const STAGE_TITLE: Record<Exclude<StageStatus, 'loading'>, MessageKey> = {
  idle: 'player.emptyTitle',
  none: 'player.noneTitle',
}

const STAGE_TEXT: Record<Exclude<StageStatus, 'loading'>, MessageKey> = {
  idle: 'player.emptyText',
  none: 'player.noneText',
}

/** The stage: artwork behind a rounded screen, with a playlist of every channel on it. */
export function Player({
  channel,
  channels = [],
  onSelect,
  unavailable,
  onStart,
  onClose,
  status = 'idle',
  onRefresh,
  factory,
}: PlayerProps) {
  const { t } = useI18n()
  const [attempt, setAttempt] = useState(0)
  // Kept here, not in the surface: a new channel mounts a new surface and must not close it.
  const [playlistOpen, setPlaylistOpen] = useState(false)

  if (!channel) {
    return (
      <section className={styles.stage} aria-label={t('player.label')}>
        <div className={styles.frame}>
          {status === 'loading' ? (
            // A grey screen with a soft shimmer, the size of the real one, so nothing jumps.
            <div
              className={`${styles.screen} ${styles.empty} ${styles.skeleton}`}
              role="status"
              aria-label={t('app.loadingChannels')}
            />
          ) : (
            <div className={`${styles.screen} ${styles.empty}`}>
              <p className={styles.emptyTitle}>{t(STAGE_TITLE[status])}</p>
              <p className={styles.emptyText}>{t(STAGE_TEXT[status])}</p>
              {status === 'idle' && onStart && (
                <button type="button" className={styles.start} onClick={onStart}>
                  <PlayIcon />
                  {t('player.start')}
                </button>
              )}
              {status === 'none' && onRefresh && (
                <button type="button" className={styles.start} onClick={onRefresh}>
                  {t('app.tryAgain')}
                </button>
              )}
            </div>
          )}
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
        channels={channels}
        playlistOpen={playlistOpen}
        onPlaylistOpenChange={setPlaylistOpen}
        unavailable={unavailable}
        onRetry={() => setAttempt((value) => value + 1)}
        {...(onSelect ? { onSelect } : {})}
        {...(onClose
          ? {
              onClose: () => {
                setPlaylistOpen(false)
                onClose()
              },
            }
          : {})}
        {...(factory ? { factory } : {})}
      />
    </section>
  )
}

interface SurfaceProps {
  channel: Channel
  channels: readonly Channel[]
  playlistOpen: boolean
  onPlaylistOpenChange: (open: boolean) => void
  onSelect?: (channel: Channel) => void
  unavailable: boolean
  onRetry: () => void
  onClose?: () => void
  factory?: EngineFactory
}

/**
 * One <video>, one engine. When the slot that holds the screen scrolls out of view the
 * very same screen is lifted into a floating window by CSS alone, and it drops back into
 * the slot when the slot is visible again. Nothing is mounted twice, so the stream never
 * plays in two places and the audio cannot overlap.
 */
function Surface({
  channel,
  channels,
  playlistOpen,
  onPlaylistOpenChange,
  onSelect,
  unavailable,
  onRetry,
  onClose,
  factory,
}: SurfaceProps) {
  const { t } = useI18n()
  const playlistId = useId()
  const slotRef = useRef<HTMLDivElement>(null)
  // The sticky bar covers the top of the page, so the slot counts as gone once it is under it.
  const visible = useInView(slotRef, { threshold: 0.25, rootMargin: '-72px 0px 0px 0px' })
  const floating = !visible
  // Decided once per screen: switching the stream under a playing video would restart it.
  const [compat] = useState(compatWanted)
  const { videoRef, state, failure, handlers } = useHlsPlayback({
    url: livePlaylistUrl(channel.slug, compat),
    ...(factory ? { factory } : {}),
  })
  const canBrowse = onSelect !== undefined && channels.length > 0

  return (
    <div className={styles.frame}>
      <div className={styles.slot} ref={slotRef}>
      <div
        className={styles.screen}
        data-state={state}
        data-floating={floating}
        {...(floating ? { role: 'group', 'aria-label': t('player.floating') } : {})}
      >
        {floating && (
          <div className={styles.floatBar}>
            <span className={styles.floatName}>{channel.name}</span>
            <button
              type="button"
              className={styles.floatButton}
              aria-label={t('player.floatBack')}
              onClick={() =>
                slotRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
              }
            >
              <ArrowUpIcon />
            </button>
            {onClose && (
              <button
                type="button"
                className={styles.floatButton}
                aria-label={t('player.floatClose')}
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        {canBrowse && !floating && (
          <button
            type="button"
            className={styles.playlistButton}
            aria-label={t('player.playlist')}
            title={t('player.playlist')}
            aria-expanded={playlistOpen}
            aria-controls={playlistId}
            onClick={() => onPlaylistOpenChange(!playlistOpen)}
          >
            <ListIcon />
          </button>
        )}
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
        {canBrowse && !floating && playlistOpen && (
          <Playlist
            id={playlistId}
            channels={channels}
            currentSlug={channel.slug}
            onSelect={onSelect}
            onClose={() => onPlaylistOpenChange(false)}
          />
        )}
        {state === 'failed' && (
          <div className={styles.veil} role="alert">
            <p>{t('player.failedDetail', { detail: failure ?? '' })}</p>
            <button type="button" className={styles.retry} onClick={onRetry}>
              {t('player.retry')}
            </button>
          </div>
        )}
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
