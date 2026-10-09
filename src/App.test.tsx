import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { EngineFactory } from './features/player/playback/engine'
import { setInView } from './test/setup'
import { channelsPayload, healthPayload, manyChannelsPayload, RELAY, server } from './test/server'

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

  const chooseLanguage = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /^(Language|语言|語言): / }))
    await userEvent.click(screen.getByRole('menuitemradio', { name }))
  }

  it('switches the whole interface between the three languages from a drop-down menu', async () => {
    window.localStorage.setItem('iptv-web-locale', 'en')
    setup()
    await screen.findByRole('heading', { name: '央视' })
    expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await chooseLanguage('简体中文')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByLabelText('按名称筛选')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '其他' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('中继在线')).toBeInTheDocument())

    await chooseLanguage('繁體中文')
    expect(screen.getByLabelText('依名稱篩選')).toBeInTheDocument()
    expect(screen.getByText('中繼在線')).toBeInTheDocument()
    expect(screen.getByText('中繼在線').closest('[lang="zh-TW"]')).not.toBeNull()
    expect(window.localStorage.getItem('iptv-web-locale')).toBe('zh-TW')

    await chooseLanguage('English')
    expect(screen.getByLabelText('Filter by name')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Language: English/ }))
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
  })

  it('drives the language menu from the keyboard and closes it with Escape', async () => {
    window.localStorage.setItem('iptv-web-locale', 'en')
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const user = userEvent.setup()
    const button = screen.getByRole('button', { name: /^Language: English/ })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    // The open menu puts focus on the current language; arrows move, Escape returns.
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitemradio', { name: '繁體中文' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitemradio', { name: '简体中文' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
    await user.click(button)
    await user.keyboard('{Enter}')
    expect(window.localStorage.getItem('iptv-web-locale')).toBe('en')
  })

  it('closes the language menu when something else is pressed', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await userEvent.click(screen.getByRole('button', { name: /^Language: / }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Filter by name'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('starts in the saved language, else the browser language, else Simplified Chinese', async () => {
    window.localStorage.setItem('iptv-web-locale', 'zh-TW')
    setup()
    expect(await screen.findByLabelText('依名稱篩選')).toBeInTheDocument()
  })

  it('offers a senior mode that lists the channels in one large column', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const toggle = screen.getByRole('button', { name: 'Senior mode' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(wall().closest('[data-senior]')).toHaveAttribute('data-senior', 'false')

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Senior mode' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('iptv-web-senior')).toBe('on')
    // Same channels, same buttons, now stacked as list lines with a plain on-air label.
    expect(within(wall()).getAllByRole('button')).toHaveLength(4)
    await userEvent.click(tile(/CCTV-1/))
    expect(within(wall()).getByText('On air')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Senior mode' }))
    expect(window.localStorage.getItem('iptv-web-senior')).toBe('off')
  })

  it('can be operated with the keyboard alone', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const user = userEvent.setup()
    // Order: page links, senior mode, the language menu, start, filter, group buttons, tiles.
    await user.tab()
    expect(screen.getByRole('link', { name: 'Channels' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Senior mode' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /^Language: / })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Start watching' })).toHaveFocus()
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

  describe('pagination', () => {
    const useMany = (count: number) =>
      server.use(http.get(`${RELAY}/channels`, () => HttpResponse.json(manyChannelsPayload(count))))
    const pager = () => screen.getByRole('navigation', { name: 'Pages' })

    it('splits a long list into pages and moves between them', async () => {
      useMany(60)
      setup()
      await screen.findByRole('heading', { name: 'Even' })
      expect(within(wall()).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(24)
      expect(tile('Channel 1')).toBeInTheDocument()
      // Channels are listed group by group: the Even group (odd numbers) fills page 1.
      expect(screen.queryByRole('button', { name: 'Channel 49' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

      await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
      expect(screen.getByRole('button', { name: 'Channel 49' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Channel 1' })).not.toBeInTheDocument()
      expect(within(pager()).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')

      await userEvent.click(within(pager()).getByRole('button', { name: 'Page 3' }))
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Channel 60' })).toBeInTheDocument()
    })

    it('has no pager when everything fits on one page', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
    })

    it('goes back to the first page when the filter or group changes', async () => {
      useMany(60)
      setup()
      await screen.findByRole('heading', { name: 'Even' })
      await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
      await userEvent.type(screen.getByLabelText('Filter by name'), 'Channel 1')
      // "Channel 1", "Channel 10".."Channel 19": 11 channels, so one page and no pager.
      expect(screen.getByRole('button', { name: 'Channel 1' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
      await userEvent.clear(screen.getByLabelText('Filter by name'))
      expect(within(pager()).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    })

    it('uses smaller pages in senior mode and keeps the selection across pages', async () => {
      useMany(60)
      setup()
      await screen.findByRole('heading', { name: 'Even' })
      await userEvent.click(tile('Channel 1'))
      await userEvent.click(screen.getByRole('button', { name: 'Senior mode' }))
      expect(within(wall()).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(10)
      expect(within(pager()).getByRole('button', { name: 'Page 6' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
      // The channel on air is on page 1, but the player keeps playing it.
      expect(screen.getByLabelText('Channel 1 live stream')).toBeInTheDocument()
    })
  })

  describe('floating player', () => {
    const slotOf = () => screen.getByLabelText(/live stream/).closest('[data-floating]')!.parentElement!
    const screenOf = () => screen.getByLabelText(/live stream/).closest('[data-floating]')!

    it('lifts the one video into a floating window when the player leaves the view, and back', async () => {
      const { loads, destroyed } = setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      expect(screenOf()).toHaveAttribute('data-floating', 'false')
      const video = screen.getByLabelText(/live stream/)

      act(() => setInView(slotOf(), false))
      expect(screenOf()).toHaveAttribute('data-floating', 'true')
      expect(screen.getByRole('group', { name: 'Floating player' })).toBeInTheDocument()
      // The same element carries on: one video, one stream, nothing restarted.
      expect(screen.getAllByLabelText(/live stream/)).toHaveLength(1)
      expect(screen.getByLabelText(/live stream/)).toBe(video)
      expect(screen.queryAllByLabelText(/live stream/)).toHaveLength(1)
      expect(loads).toHaveLength(1)
      expect(destroyed).toHaveLength(0)

      act(() => setInView(slotOf(), true))
      expect(screenOf()).toHaveAttribute('data-floating', 'false')
      expect(screen.queryByRole('group', { name: 'Floating player' })).not.toBeInTheDocument()
      expect(screen.getByLabelText(/live stream/)).toBe(video)
      expect(loads).toHaveLength(1)
    })

    it('never floats before something is playing', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(screen.queryByRole('group', { name: 'Floating player' })).not.toBeInTheDocument()
      expect(screen.queryAllByLabelText(/live stream/)).toHaveLength(0)
    })

    it('keeps a single video while floating and the channel changes', async () => {
      const { loads, destroyed } = setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      act(() => setInView(slotOf(), false))
      await userEvent.click(tile(/CCTV-2/))
      expect(destroyed).toEqual([`${RELAY}/live/cctv1.m3u8`])
      expect(loads).toHaveLength(2)
      expect(screen.queryAllByLabelText(/live stream/)).toHaveLength(1)
    })

    it('scrolls back to the player from the floating window', async () => {
      const scrolls: Element[] = []
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolls.push(this)
      }
      setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      const slot = slotOf()
      act(() => setInView(slot, false))
      await userEvent.click(screen.getByRole('button', { name: 'Back to the player' }))
      expect(scrolls).toContain(slot)
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    })

    it('closing the floating window stops the stream', async () => {
      const { destroyed } = setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      act(() => setInView(slotOf(), false))
      await userEvent.click(screen.getByRole('button', { name: 'Close the floating window' }))
      expect(destroyed).toEqual([`${RELAY}/live/cctv1.m3u8`])
      expect(screen.queryAllByLabelText(/live stream/)).toHaveLength(0)
      expect(screen.getByText('Nothing on air')).toBeInTheDocument()
      expect(tile(/CCTV-1/)).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('language default', () => {
    it('follows a Chinese browser', async () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['zh-HK', 'en'])
      setup()
      expect(await screen.findByLabelText('依名稱篩選')).toBeInTheDocument()
    })

    it('uses Simplified Chinese when the browser reports no language', async () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([])
      setup()
      expect(await screen.findByLabelText('按名称筛选')).toBeInTheDocument()
    })
  })

  it('titles the page simply IPTV in every language', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    await waitFor(() => expect(document.title).toBe('IPTV'))
    await userEvent.click(screen.getByRole('button', { name: /^Language: / }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: '简体中文' }))
    expect(document.title).toBe('IPTV')
  })

  it('swaps in the placeholder icon for a logo that fails to load', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const picture = (name: RegExp) => within(tile(name)).queryByRole('presentation')
    const placeholder = (name: RegExp) => within(tile(name)).queryByRole('img', { hidden: true })
    // CCTV-1 has a logo address, so a picture is tried first; CCTV-2 has none.
    expect(picture(/CCTV-1/)).not.toBeNull()
    expect(placeholder(/CCTV-2/)).not.toBeNull()
    expect(picture(/CCTV-2/)).toBeNull()
    fireEvent.error(picture(/CCTV-1/)!)
    expect(picture(/CCTV-1/)).toBeNull()
    expect(placeholder(/CCTV-1/)).not.toBeNull()
  })

  describe('dashboard', () => {
    afterEach(() => {
      window.location.hash = ''
    })

    it('links to the dashboard and back, following the address bar', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(screen.getByRole('link', { name: 'Channels' })).toHaveAttribute('aria-current', 'page')
      await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
      expect(await screen.findByRole('heading', { name: 'Relay dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
      expect(screen.queryByRole('region', { name: 'Channels' })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('link', { name: 'Channels' }))
      expect(await screen.findByRole('heading', { name: '央视' })).toBeInTheDocument()
    })

    it('shows the relay state, the counters and what needs attention', async () => {
      server.use(
        http.get(`${RELAY}/health`, () =>
          HttpResponse.json(
            healthPayload({
              stats: { ...healthPayload().stats, started_at_ms: Date.now() - 3 * 3600_000 - 5 * 60_000 },
              channels: { path: '/app/channels.yaml', count: 4, reload_error: 'bad line 3' },
              notice: { url: 'u', ttl_ms: 1, cache: { cctv1: {}, ghost: {} } },
            }),
          ),
        ),
      )
      window.location.hash = '#/dashboard'
      setup()
      expect(await screen.findByRole('heading', { name: 'Relay dashboard' })).toBeInTheDocument()
      await waitFor(() => expect(screen.getAllByText('Relay online').length).toBeGreaterThan(0))
      expect(screen.getByText('Segments streamed', { selector: 'dt' }).nextSibling).toHaveTextContent('9')
      expect(screen.getByText('Uptime').nextSibling).toHaveTextContent(/3h 5m/)
      expect(screen.getByText('/app/channels.yaml')).toBeInTheDocument()
      expect(screen.getByText('Segment error rate').nextSibling).toHaveTextContent('10%')
      // Known channels are shown by name, unknown ones by slug.
      expect(screen.getByText('CCTV-1 综合', { selector: 'li' })).toBeInTheDocument()
      expect(screen.getByText('ghost')).toBeInTheDocument()
      expect(screen.getAllByRole('alert').some((el) => /bad line 3/.test(el.textContent ?? ''))).toBe(true)
    })

    it('says all is well when nothing needs attention, and reports an offline relay', async () => {
      window.location.hash = '#/dashboard'
      const { queryClient } = setup()
      expect(await screen.findByText('Nothing needs attention.')).toBeInTheDocument()
      expect(screen.getByText('Collecting readings…')).toBeInTheDocument()
      server.use(http.get(`${RELAY}/health`, () => HttpResponse.error()))
      await queryClient.refetchQueries({ queryKey: ['health'] })
      await waitFor(() => expect(screen.getAllByText('Relay unreachable').length).toBeGreaterThan(0))
    })
  })
})
