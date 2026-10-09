import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultEngine, MEDIA_RECOVERIES, NETWORK_RETRIES } from './engine'

// A stand-in for hls.js that records calls and lets a test raise errors.
const fake = vi.hoisted(() => {
  type Handler = (event: string, data: Record<string, unknown>) => void
  const state = { supported: true, instances: [] as FakeHls[] }
  class FakeHls {
    static Events = { ERROR: 'hlsError' }
    static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' }
    static isSupported() {
      return state.supported
    }
    calls: string[] = []
    handler: Handler | null = null
    constructor() {
      state.instances.push(this)
    }
    on(_event: string, handler: Handler) {
      this.handler = handler
    }
    attachMedia() {
      this.calls.push('attach')
    }
    loadSource(url: string) {
      this.calls.push(`load ${url}`)
    }
    startLoad() {
      this.calls.push('startLoad')
    }
    recoverMediaError() {
      this.calls.push('recover')
    }
    destroy() {
      this.calls.push('destroy')
    }
    raise(data: Record<string, unknown>) {
      this.handler?.('hlsError', data)
    }
  }
  return { state, FakeHls }
})

vi.mock('hls.js', () => ({ default: fake.FakeHls }))

const tick = () => new Promise<void>((done) => setTimeout(done, 0))
const video = () => document.createElement('video')

function start(onFatal = vi.fn()) {
  const engine = createDefaultEngine({ onFatal })
  const element = video()
  engine.attach(element)
  engine.load('http://relay/live/a.m3u8')
  return { engine, element, onFatal }
}

beforeEach(() => {
  fake.state.supported = true
  fake.state.instances.length = 0
})

describe('default engine', () => {
  it('loads hls.js lazily, attaches the media element and starts the playlist', async () => {
    start()
    expect(fake.state.instances).toHaveLength(0)
    await tick()
    expect(fake.state.instances[0]?.calls).toEqual(['attach', 'load http://relay/live/a.m3u8'])
  })

  it('destroys the player', async () => {
    const { engine } = start()
    await tick()
    engine.destroy()
    expect(fake.state.instances[0]?.calls.at(-1)).toBe('destroy')
  })

  it('never starts when destroyed before hls.js finished loading', async () => {
    const { engine } = start()
    engine.destroy()
    await tick()
    expect(fake.state.instances).toHaveLength(0)
  })

  it('ignores non-fatal errors', async () => {
    const { onFatal } = start()
    await tick()
    fake.state.instances[0]?.raise({ fatal: false, type: 'networkError', details: 'fragLoadError' })
    expect(onFatal).not.toHaveBeenCalled()
  })

  it('retries network errors a limited number of times, then gives up', async () => {
    const { onFatal } = start()
    await tick()
    const hls = fake.state.instances[0]
    for (let attempt = 0; attempt < NETWORK_RETRIES; attempt += 1) {
      hls?.raise({ fatal: true, type: 'networkError', details: 'manifestLoadError' })
    }
    expect(hls?.calls.filter((call) => call === 'startLoad')).toHaveLength(NETWORK_RETRIES)
    expect(onFatal).not.toHaveBeenCalled()
    hls?.raise({ fatal: true, type: 'networkError', details: 'manifestLoadError' })
    expect(onFatal).toHaveBeenCalledWith('networkError: manifestLoadError')
  })

  it('recovers a media error once, then gives up', async () => {
    const { onFatal } = start()
    await tick()
    const hls = fake.state.instances[0]
    for (let attempt = 0; attempt < MEDIA_RECOVERIES; attempt += 1) {
      hls?.raise({ fatal: true, type: 'mediaError', details: 'bufferAppendError' })
    }
    expect(hls?.calls.filter((call) => call === 'recover')).toHaveLength(MEDIA_RECOVERIES)
    hls?.raise({ fatal: true, type: 'mediaError', details: 'bufferAppendError' })
    expect(onFatal).toHaveBeenCalledWith('mediaError: bufferAppendError')
  })

  it('gives up at once on other fatal errors', async () => {
    const { onFatal } = start()
    await tick()
    fake.state.instances[0]?.raise({ fatal: true, type: 'otherError', details: 'internalException' })
    expect(onFatal).toHaveBeenCalledWith('otherError: internalException')
  })

  it('plays natively when Media Source Extensions are missing', async () => {
    fake.state.supported = false
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    const { engine, element } = start()
    await tick()
    expect(fake.state.instances).toHaveLength(0)
    expect(element.getAttribute('src')).toBe('http://relay/live/a.m3u8')
    engine.destroy()
    expect(element.hasAttribute('src')).toBe(false)
    expect(load).toHaveBeenCalledTimes(2)
    load.mockRestore()
  })
})
