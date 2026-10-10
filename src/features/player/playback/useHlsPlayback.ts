import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { createDefaultEngine, type EngineFactory } from './engine'

/** `ready`: loaded but not started, as when the browser wants a tap before it plays. */
export type PlaybackState = 'loading' | 'ready' | 'playing' | 'stalled' | 'failed'

interface Options {
  /** Playlist to play. Changing it means mounting a new surface (see `Player`). */
  url: string
  factory?: EngineFactory
}

/**
 * Plays `url` in the returned video ref. The engine is created on mount and destroyed on
 * unmount, so replacing the component (by key) detaches the old stream before the new
 * one starts. Playback state follows the video element's own events.
 */
export function useHlsPlayback({ url, factory = createDefaultEngine }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<PlaybackState>('loading')
  const [failure, setFailure] = useState<string | null>(null)
  // True while the browser made us start silent; the viewer is offered the sound.
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const engine = factory({
      onFatal: (message) => {
        setFailure(message)
        setState('failed')
      },
    })
    engine.attach(video)
    engine.load(url)
    return () => engine.destroy()
  }, [url, factory])

  // Playing for real: not paused and with enough data. Some browsers (native HLS on old iOS)
  // never repeat `playing` after a stall, so the other events are checked against the element.
  const settle = (video: HTMLVideoElement) => {
    if (!video.paused && video.readyState >= 3) {
      setState((current) =>
        current === 'loading' || current === 'stalled' || current === 'ready' ? 'playing' : current,
      )
    }
  }

  const handlers = {
    onPlaying: () => setState('playing'),
    onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => settle(event.currentTarget),
    onCanPlay: (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget
      if (video.paused) {
        // Sound is wanted from the start. A browser that refuses to start with sound (no tap
        // yet on this page) gets a silent start instead, and the viewer is offered the sound.
        if (!video.muted) {
          const started: unknown = video.play()
          if (started instanceof Promise) {
            started.catch(() => {
              video.muted = true
              setMuted(true)
              const silent: unknown = video.play()
              if (silent instanceof Promise) silent.catch(() => undefined)
            })
          }
        }
        // Still refused: stop saying "loading" and leave the play button to the viewer.
        setState((current) => (current === 'loading' ? 'ready' : current))
      } else {
        settle(video)
      }
    },
    onVolumeChange: (event: SyntheticEvent<HTMLVideoElement>) => setMuted(event.currentTarget.muted),
    onWaiting: () => setState((current) => (current === 'playing' ? 'stalled' : current)),
    onError: (event: SyntheticEvent<HTMLVideoElement>) => {
      // Only the element's own errors count; children (sources) bubble here as well.
      if (event.currentTarget !== event.target) return
      setFailure('The video element reported an error')
      setState('failed')
    },
  }

  const unmute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setMuted(false)
  }

  // A browser only allows sound after a tap or key press on the page, so while the stream is
  // silent for that reason, the first one anywhere on the page turns the sound on.
  useEffect(() => {
    if (!muted) return undefined
    const events = ['click', 'touchend', 'keydown']
    const turnOn = () => {
      const video = videoRef.current
      if (video) video.muted = false
    }
    events.forEach((name) => document.addEventListener(name, turnOn, { once: true }))
    return () => events.forEach((name) => document.removeEventListener(name, turnOn))
  }, [muted])

  return { videoRef, state, failure, handlers, muted, unmute }
}
