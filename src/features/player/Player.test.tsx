import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Channel } from '../../api/types'
import type { EngineEvents, EngineFactory, PlaybackEngine } from './playback/engine'
import { Player } from './Player'

const cctv1: Channel = { slug: 'cctv1', name: 'CCTV-1 综合', logo: '', group: '央视' }
const cctv2: Channel = { slug: 'cctv2', name: 'CCTV-2 财经', logo: '', group: '央视' }

/** Records what the player asks of the engine, in order. */
function recorder() {
  const log: string[] = []
  const events: EngineEvents[] = []
  const factory: EngineFactory = (engineEvents) => {
    const id = events.length + 1
    events.push(engineEvents)
    log.push(`create#${id}`)
    const engine: PlaybackEngine = {
      attach: () => log.push(`attach#${id}`),
      load: (url) => log.push(`load#${id} ${url}`),
      destroy: () => log.push(`destroy#${id}`),
    }
    return engine
  }
  return { log, events, factory }
}

const video = () => screen.getByLabelText(/live stream/i)

describe('Player', () => {
  it('invites the user to pick a channel when none is selected', () => {
    render(<Player channel={null} unavailable={false} factory={recorder().factory} />)
    expect(screen.getByText(/pick a channel/i)).toBeInTheDocument()
  })

  it('attaches the engine and loads the channel playlist', () => {
    const { log, factory } = recorder()
    render(<Player channel={cctv1} unavailable={false} factory={factory} />)
    expect(log).toEqual(['create#1', 'attach#1', 'load#1 http://relay.test/live/cctv1.m3u8'])
    expect(screen.getByText('Loading the stream…')).toBeInTheDocument()
  })

  it('detaches the first stream before the second one loads', () => {
    const { log, factory } = recorder()
    const { rerender } = render(<Player channel={cctv1} unavailable={false} factory={factory} />)
    rerender(<Player channel={cctv2} unavailable={false} factory={factory} />)
    expect(log).toEqual([
      'create#1',
      'attach#1',
      'load#1 http://relay.test/live/cctv1.m3u8',
      'destroy#1',
      'create#2',
      'attach#2',
      'load#2 http://relay.test/live/cctv2.m3u8',
    ])
  })

  it('destroys the engine when the player goes away', () => {
    const { log, factory } = recorder()
    const { unmount } = render(<Player channel={cctv1} unavailable={false} factory={factory} />)
    unmount()
    expect(log.at(-1)).toBe('destroy#1')
  })

  it('follows the video element: loading, playing, buffering, playing again', () => {
    render(<Player channel={cctv1} unavailable={false} factory={recorder().factory} />)
    expect(screen.getByText('Loading the stream…')).toBeInTheDocument()
    fireEvent.playing(video())
    expect(screen.queryByText('Loading the stream…')).not.toBeInTheDocument()
    fireEvent.waiting(video())
    expect(screen.getByText('Buffering…')).toBeInTheDocument()
    fireEvent.playing(video())
    expect(screen.queryByText('Buffering…')).not.toBeInTheDocument()
  })

  it('shows no on-air status line under the screen', () => {
    render(<Player channel={cctv1} unavailable={false} factory={recorder().factory} />)
    fireEvent.playing(video())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'CCTV-1 综合' })).not.toBeInTheDocument()
  })

  it('offers a playlist only when it has channels to list and a way to switch', async () => {
    const { rerender } = render(<Player channel={cctv1} unavailable={false} factory={recorder().factory} />)
    expect(screen.queryByRole('button', { name: 'Playlist' })).not.toBeInTheDocument()
    rerender(<Player channel={cctv1} channels={[cctv1, cctv2]} unavailable={false} factory={recorder().factory} />)
    expect(screen.queryByRole('button', { name: 'Playlist' })).not.toBeInTheDocument()
    const picks: string[] = []
    rerender(
      <Player
        channel={cctv1}
        channels={[cctv1, cctv2]}
        onSelect={(channel) => picks.push(channel.slug)}
        unavailable={false}
        factory={recorder().factory}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Playlist' }))
    await userEvent.click(screen.getByRole('button', { name: /CCTV-2/ }))
    expect(picks).toEqual(['cctv2'])
  })

  it('shows a failure with a retry that starts a new engine', async () => {
    const { log, events, factory } = recorder()
    render(<Player channel={cctv1} unavailable={false} factory={factory} />)
    events[0]?.onFatal('NETWORK_ERROR: manifestLoadError')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Playback failed')
    expect(alert).toHaveTextContent('manifestLoadError')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(log.filter((entry) => entry.startsWith('create'))).toEqual(['create#1', 'create#2'])
    expect(log).toContain('destroy#1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('treats an error on the video element itself as a failure', () => {
    render(<Player channel={cctv1} unavailable={false} factory={recorder().factory} />)
    fireEvent.error(video())
    expect(screen.getByRole('alert')).toHaveTextContent('Playback failed')
  })

  it('warns that the channel is temporarily unavailable when the relay shows its notice', () => {
    render(<Player channel={cctv1} unavailable factory={recorder().factory} />)
    fireEvent.playing(video())
    expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i)
  })
})
