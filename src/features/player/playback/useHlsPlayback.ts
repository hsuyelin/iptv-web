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

  const handlers = {
    onPlaying: () => setState('playing'),
    onCanPlay: (event: SyntheticEvent<HTMLVideoElement>) => {
      // Autoplay refused: stop saying "loading" and leave the play button to the viewer.
      const video = event.currentTarget
      setState((current) => (current === 'loading' && video.paused ? 'ready' : current))
    },
    onWaiting: () => setState((current) => (current === 'playing' ? 'stalled' : current)),
    onError: (event: SyntheticEvent<HTMLVideoElement>) => {
      // Only the element's own errors count; children (sources) bubble here as well.
      if (event.currentTarget !== event.target) return
      setFailure('The video element reported an error')
      setState('failed')
    },
  }

  return { videoRef, state, failure, handlers }
}
