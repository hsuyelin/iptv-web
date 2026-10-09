import type HlsType from 'hls.js'

/**
 * The imperative edge of the console. Everything that has to drive a <video> element
 * by hand lives in this folder; the rest of the app renders declaratively.
 */
export interface PlaybackEngine {
  attach(video: HTMLVideoElement): void
  load(url: string): void
  destroy(): void
}

export interface EngineEvents {
  /** The engine gave up; the user can retry. */
  onFatal(message: string): void
}

/** Creates an engine. Injected so tests can run without a real player. */
export type EngineFactory = (events: EngineEvents) => PlaybackEngine

function hasMediaSource(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('MediaSource' in window || 'WebKitMediaSource' in window || 'ManagedMediaSource' in window)
  )
}

function canPlayHlsNatively(video: HTMLVideoElement): boolean {
  return (
    typeof video.canPlayType === 'function' &&
    video.canPlayType('application/vnd.apple.mpegurl') !== ''
  )
}

export const NETWORK_RETRIES = 2
export const MEDIA_RECOVERIES = 1

/**
 * Default engine. hls.js is about half of the bundle, so it is fetched only when a
 * channel is first played. Browsers without Media Source Extensions (Safari on iPhone)
 * play HLS natively instead.
 */
export const createDefaultEngine: EngineFactory = (events) => {
  let video: HTMLVideoElement | null = null
  let url: string | null = null
  let destroyed = false
  let hls: HlsType | null = null

  const start = async () => {
    // Without Media Source Extensions (iPad before iOS 13, iPhone) hls.js cannot run, so do
    // not even fetch it: the browser's own HLS player does the work. Old iOS also ignores
    // `autoplay`, so ask for playback here; a refusal just leaves the play button to the viewer.
    if (video && url !== null && !hasMediaSource() && canPlayHlsNatively(video)) {
      video.src = url
      video.load()
      const started: unknown = video.play()
      if (started instanceof Promise) started.catch(() => undefined)
      return
    }
    let Hls: typeof HlsType
    try {
      Hls = (await import('hls.js')).default
    } catch {
      if (!destroyed) events.onFatal('The player could not be loaded')
      return
    }
    if (destroyed || !video || url === null) return
    if (!Hls.isSupported()) {
      video.src = url
      video.load()
      return
    }
    const engine = new Hls({ liveSyncDurationCount: 3 })
    hls = engine
    let networkRetries = 0
    let mediaRecoveries = 0
    engine.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < NETWORK_RETRIES) {
        networkRetries += 1
        engine.startLoad()
        return
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < MEDIA_RECOVERIES) {
        mediaRecoveries += 1
        engine.recoverMediaError()
        return
      }
      events.onFatal(`${data.type}: ${data.details}`)
    })
    engine.attachMedia(video)
    engine.loadSource(url)
  }

  return {
    attach: (element) => {
      video = element
    },
    load: (source) => {
      url = source
      void start()
    },
    destroy: () => {
      destroyed = true
      if (hls) {
        hls.destroy()
        hls = null
      } else if (video?.hasAttribute('src')) {
        video.removeAttribute('src')
        video.load()
      }
      video = null
    },
  }
}
