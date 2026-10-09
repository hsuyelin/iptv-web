import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import type { EngineFactory } from './features/player/playback/engine'
import { channelsPayload, healthPayload, RELAY, server } from './test/server'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const loads: string[] = []
  const destroyed: string[] = []
  const factory: EngineFactory = () => {
    let current = ''
    return {
      attach: () => undefined,
      load: (url) => {
        current = url
        loads.push(url)
      },
      destroy: () => destroyed.push(current),
    }
  }
  render(
    <QueryClientProvider client={queryClient}>
      <App engineFactory={factory} />
    </QueryClientProvider>,
  )
  return { queryClient, loads, destroyed }
}

const tile = (name: string | RegExp) => screen.getByRole('button', { name })
const wall = () => screen.getByRole('region', { name: 'Channels' })

describe('App', () => {
  it('lists the channels by group and shows the relay as online', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: '央视' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '卫视' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Other' })).toBeInTheDocument()
    expect(within(wall()).getAllByRole('button')).toHaveLength(4)
    // A channel without a name shows its slug.
    expect(tile('misc')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Relay online')).toBeInTheDocument())
    expect(screen.getByText('Segments streamed').nextSibling).toHaveTextContent('9')
  })

  it('filters by name or slug and hides groups that end up empty', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await userEvent.type(screen.getByLabelText('Filter by name'), 'CCTV')
    expect(within(wall()).getAllByRole('button')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: '卫视' })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Filter by name'))
    await userEvent.type(screen.getByLabelText('Filter by name'), 'shandong')
    expect(within(wall()).getAllByRole('button')).toHaveLength(1)
  })

  it('explains an empty result and offers to clear the filter', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await userEvent.type(screen.getByLabelText('Filter by name'), 'zzz')
    expect(screen.getByText(/No channel matches/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(screen.getByLabelText('Filter by name')).toHaveValue('')
    expect(within(wall()).getAllByRole('button')).toHaveLength(4)
  })

  it('narrows the wall to one group', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Groups' })).getByRole('button', { name: /卫视/ }))
    expect(within(wall()).getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: '央视' })).not.toBeInTheDocument()
  })

  it('starts playback when a channel is chosen and swaps streams on the next choice', async () => {
    const { loads, destroyed } = setup()
    await screen.findByRole('heading', { name: '央视' })
    expect(screen.getByText(/pick a channel/i)).toBeInTheDocument()

    await userEvent.click(tile(/CCTV-1/))
    expect(loads).toEqual([`${RELAY}/live/cctv1.m3u8`])
    expect(tile(/CCTV-1/)).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(tile(/CCTV-2/))
    expect(destroyed).toEqual([`${RELAY}/live/cctv1.m3u8`])
    expect(loads).toEqual([`${RELAY}/live/cctv1.m3u8`, `${RELAY}/live/cctv2.m3u8`])
    expect(tile(/CCTV-1/)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'CCTV-2 财经', level: 2 })).toBeInTheDocument()
  })

  it('warns when the relay is redirecting the selected channel to its notice stream', async () => {
    server.use(
      http.get(`${RELAY}/health`, () =>
        HttpResponse.json(healthPayload({ notice: { url: 'u', ttl_ms: 1, cache: { cctv1: {} } } })),
      ),
    )
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await userEvent.click(tile(/CCTV-1/))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i))
    expect(tile(/CCTV-1/)).toHaveAttribute('data-unavailable', 'true')
    expect(tile(/CCTV-2/)).toHaveAttribute('data-unavailable', 'false')
  })

  it('reports a failed channel list and recovers on retry', async () => {
    server.use(http.get(`${RELAY}/channels`, () => new HttpResponse(null, { status: 503 })))
    setup()
    expect(await screen.findByText(/Cannot load the channel list/)).toBeInTheDocument()
    server.use(http.get(`${RELAY}/channels`, () => HttpResponse.json(channelsPayload)))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: '央视' })).toBeInTheDocument()
  })

  it('keeps the channel list and shows the offline state when the relay stops answering', async () => {
    const { queryClient } = setup()
    await screen.findByRole('heading', { name: '央视' })
    await waitFor(() => expect(screen.getByText('Relay online')).toBeInTheDocument())

    server.use(http.get(`${RELAY}/health`, () => HttpResponse.error()))
    await queryClient.refetchQueries({ queryKey: ['health'] })
    expect(await screen.findByText(/Relay unreachable, last seen \d\d:\d\d:\d\d/)).toBeInTheDocument()
    expect(within(wall()).getAllByRole('button')).toHaveLength(4)
  })

  it('switches between light and dark themes', async () => {
    setup()
    const toggle = await screen.findByRole('button', { name: /Use (dark|light) theme/ })
    const before = toggle.textContent
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Use (dark|light) theme/ }).textContent).not.toBe(before)
  })

  it('can be operated with the keyboard alone', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const user = userEvent.setup()
    // Order: theme toggle (header), filter, group buttons, then the tiles.
    await user.tab()
    expect(screen.getByRole('button', { name: /Use (dark|light) theme/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Filter by name')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /All channels/ })).toHaveFocus()
    // The remaining stops are the group buttons, then the first tile.
    const tile = screen.getByRole('button', { name: /CCTV-1/ })
    for (let stops = 0; stops < 10 && document.activeElement !== tile; stops += 1) {
      await user.tab()
    }
    expect(tile).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /CCTV-1/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/CCTV-1 综合 live stream/)).toBeInTheDocument()
  })
})
