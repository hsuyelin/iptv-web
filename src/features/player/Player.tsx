import { useState } from 'react'
import type { Channel } from '../../api/types'
import { livePlaylistUrl } from '../../api/client'
import type { EngineFactory } from './playback/engine'
import { useHlsPlayback, type PlaybackState } from './playback/useHlsPlayback'
import styles from './Player.module.css'

interface PlayerProps {
  channel: Channel | null
  /** True when the relay is redirecting this channel to its notice stream. */
  unavailable: boolean
  factory?: EngineFactory
}

const STATE_LABEL: Record<PlaybackState, string> = {
  loading: 'Loading the stream',
  playing: 'On air',
  stalled: 'Buffering',
  failed: 'Playback failed',
}

export function Player({ channel, unavailable, factory }: PlayerProps) {
  const [attempt, setAttempt] = useState(0)

  if (!channel) {
    return (
      <section className={styles.player} aria-label="Player">
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing on air</p>
          <p className={styles.emptyText}>Pick a channel from the wall to start watching.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.player} aria-label="Player">
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
  const { videoRef, state, failure, handlers } = useHlsPlayback({
    url: livePlaylistUrl(channel.slug),
    ...(factory ? { factory } : {}),
  })
  const onAir = state === 'playing' && !unavailable

  return (
    <>
      <div className={styles.screen} data-state={state}>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          autoPlay
          muted
          playsInline
          aria-label={`${channel.name} live stream`}
          {...handlers}
        />
        {state === 'loading' && <div className={styles.veil}>Loading the stream…</div>}
        {state === 'stalled' && <div className={styles.veil}>Buffering…</div>}
        {state === 'failed' && (
          <div className={styles.veil} role="alert">
            <p>Playback failed. {failure ?? ''}</p>
            <button type="button" className={styles.retry} onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.tally} data-on={onAir} aria-hidden="true" />
        <div className={styles.title}>
          <h2 className={styles.name}>{channel.name}</h2>
          <p className={styles.status} role="status">
            {unavailable ? 'Temporarily unavailable' : STATE_LABEL[state]}
          </p>
        </div>
      </div>
      {unavailable && (
        <p className={styles.notice} role="alert">
          This channel is temporarily unavailable. The relay is showing its notice stream and
          will try the channel again shortly.
        </p>
      )}
    </>
  )
}
