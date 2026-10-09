import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { EngineFactory } from './features/player/playback/engine'
import { setInView } from './test/setup'
import {
  ADMIN_KEY,
  channelsPayload,
  healthPayload,
  manyChannelsPayload,
  RELAY,
  server,
} from './test/server'

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
    await waitFor(() => expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument())
  })

  it('shows every group at once, with no search, group switcher or pager', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    expect(screen.getByRole('heading', { name: '卫视' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Groups' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
  })

  it('shows a long list whole, grouped, without paging', async () => {
    server.use(http.get(`${RELAY}/channels`, () => HttpResponse.json(manyChannelsPayload(60))))
    setup()
    await screen.findByRole('heading', { name: 'Even' })
    expect(screen.getByRole('heading', { name: 'Odd' })).toBeInTheDocument()
    expect(within(wall()).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(60)
    expect(tile('Channel 1')).toBeInTheDocument()
    expect(tile('Channel 60')).toBeInTheDocument()
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
    expect(screen.getByLabelText('CCTV-2 财经 live stream')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument())

    server.use(http.get(`${RELAY}/health`, () => HttpResponse.error()))
    await queryClient.refetchQueries({ queryKey: ['health'] })
    expect(await screen.findByRole('status', { name: /Offline, last seen \d\d:\d\d:\d\d/ })).toHaveTextContent('Offline')
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
    expect(wall()).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await chooseLanguage('简体中文')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '频道' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '其他' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('status', { name: '在线' })).toBeInTheDocument())

    await chooseLanguage('繁體中文')
    expect(screen.getByRole('region', { name: '頻道' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '在線' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '在線' }).closest('[lang="zh-TW"]')).not.toBeNull()
    expect(window.localStorage.getItem('iptv-web-locale')).toBe('zh-TW')

    await chooseLanguage('English')
    expect(wall()).toBeInTheDocument()
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
    await userEvent.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('starts in the saved language, else the browser language, else Simplified Chinese', async () => {
    window.localStorage.setItem('iptv-web-locale', 'zh-TW')
    setup()
    expect(await screen.findByRole('region', { name: '頻道' })).toBeInTheDocument()
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
    // Same channels, same buttons, now stacked as list lines.
    expect(within(wall()).getAllByRole('button')).toHaveLength(4)
    await userEvent.click(tile(/CCTV-1/))
    expect(tile(/CCTV-1/)).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Senior mode' }))
    expect(window.localStorage.getItem('iptv-web-senior')).toBe('off')
  })

  it('can be operated with the keyboard alone', async () => {
    setup()
    await screen.findByRole('heading', { name: '央视' })
    const user = userEvent.setup()
    // Order: senior mode, the language menu, start, then the tiles.
    // A standard visitor has no page tabs to stop at.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Senior mode' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /^Language: / })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Start watching' })).toHaveFocus()
    const tile = screen.getByRole('button', { name: /CCTV-1/ })
    for (let stops = 0; stops < 10 && document.activeElement !== tile; stops += 1) {
      await user.tab()
    }
    expect(tile).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /CCTV-1/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/CCTV-1 综合 live stream/)).toBeInTheDocument()
  })

  describe('playlist', () => {
    const open = async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Playlist' }))
      return screen.getByRole('complementary', { name: 'Playlist' })
    }

    it('is offered only once something is playing', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(screen.queryByRole('button', { name: 'Playlist' })).not.toBeInTheDocument()
      await userEvent.click(tile(/CCTV-1/))
      expect(screen.getByRole('button', { name: 'Playlist' })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('complementary', { name: 'Playlist' })).not.toBeInTheDocument()
    })

    it('opens a sidebar with every channel and switches the stream on a click', async () => {
      const { loads, destroyed } = setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      const list = await open()
      expect(screen.getByRole('button', { name: 'Playlist' })).toHaveAttribute('aria-expanded', 'true')
      expect(within(list).getAllByRole('button').filter((b) => b.className.includes('item'))).toHaveLength(4)
      expect(within(list).getByRole('button', { name: /CCTV-1/ })).toHaveAttribute('aria-current', 'true')

      await userEvent.click(within(list).getByRole('button', { name: /CCTV-2/ }))
      expect(destroyed).toEqual([`${RELAY}/live/cctv1.m3u8`])
      expect(loads).toEqual([`${RELAY}/live/cctv1.m3u8`, `${RELAY}/live/cctv2.m3u8`])
      // The sidebar stays open so the next channel is one click away.
      expect(within(screen.getByRole('complementary', { name: 'Playlist' })).getByRole('button', { name: /CCTV-2/ })).toHaveAttribute('aria-current', 'true')
      expect(within(wall()).getByRole('button', { name: /CCTV-2/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('closes from its own button and with Escape', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      const list = await open()
      await userEvent.click(within(list).getByRole('button', { name: 'Close the playlist' }))
      expect(screen.queryByRole('complementary', { name: 'Playlist' })).not.toBeInTheDocument()

      const reopened = await open()
      fireEvent.keyDown(within(reopened).getByRole('button', { name: /CCTV-1/ }), { key: 'Escape' })
      expect(screen.queryByRole('complementary', { name: 'Playlist' })).not.toBeInTheDocument()
    })

    it('gives way to the floating window', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      await userEvent.click(tile(/CCTV-1/))
      await open()
      const slot = screen.getByLabelText(/live stream/).closest('[data-floating]')!.parentElement!
      act(() => setInView(slot, false))
      expect(screen.queryByRole('complementary', { name: 'Playlist' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Playlist' })).not.toBeInTheDocument()
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
      expect(await screen.findByRole('region', { name: '頻道' })).toBeInTheDocument()
    })

    it('uses Simplified Chinese when the browser reports no language', async () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([])
      setup()
      expect(await screen.findByRole('region', { name: '频道' })).toBeInTheDocument()
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
    beforeEach(() => {
      // The dashboard belongs to administrator mode: the address carries the key.
      window.history.pushState({}, '', `/${ADMIN_KEY}`)
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
      await waitFor(() => expect(screen.getAllByText('Online').length).toBeGreaterThan(0))
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
      await waitFor(() => expect(screen.getAllByText('Offline').length).toBeGreaterThan(0))
    })
  })

  describe('administrator mode', () => {
    const tabs = () => screen.queryByRole('navigation', { name: 'Main' })

    it('hides every page tab from a standard visit and keeps the page whole', async () => {
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(tabs()).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Channels' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
      // Everything else is where it should be.
      expect(screen.getByRole('heading', { name: 'IPTV' })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: 'Online' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Senior mode' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Channels' })).toBeInTheDocument()
    })

    it('shows the tabs when the address carries the right key', async () => {
      window.history.pushState({}, '', `/${ADMIN_KEY}`)
      setup()
      expect(await screen.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Channels' })).toHaveAttribute('aria-current', 'page')
    })

    it.each([
      ['a wrong key', 403],
      ['a locked-out client', 429],
      ['a relay that errors', 500],
    ])('stays a standard visit for %s', async (_name, status) => {
      let asked = 0
      server.use(
        http.post(`${RELAY}/admin/verify`, () => {
          asked += 1
          return HttpResponse.json({ ok: false }, { status })
        }),
      )
      window.history.pushState({}, '', '/some-key-that-is-wrong')
      setup()
      await screen.findByRole('heading', { name: '央视' })
      await waitFor(() => expect(asked).toBe(1))
      expect(tabs()).not.toBeInTheDocument()
      // One try per visit: a refused key is not asked about again.
      await new Promise((done) => setTimeout(done, 50))
      expect(asked).toBe(1)
    })

    it('sends the key in the request body, not in the address of the call', async () => {
      let seen: { url: string; body: unknown } | null = null
      server.use(
        http.post(`${RELAY}/admin/verify`, async ({ request }) => {
          seen = { url: request.url, body: await request.json() }
          return HttpResponse.json({ ok: true })
        }),
      )
      window.history.pushState({}, '', `/${ADMIN_KEY}`)
      setup()
      await screen.findByRole('link', { name: 'Dashboard' })
      expect(seen).toEqual({ url: `${RELAY}/admin/verify`, body: { key: ADMIN_KEY } })
    })

    it('does not ask the relay at all for the plain address or a deep path', async () => {
      let asked = 0
      server.use(
        http.post(`${RELAY}/admin/verify`, () => {
          asked += 1
          return HttpResponse.json({ ok: false }, { status: 403 })
        }),
      )
      window.history.pushState({}, '', '/a/b')
      setup()
      await screen.findByRole('heading', { name: '央视' })
      expect(asked).toBe(0)
    })

    it('keeps a standard visitor on the channels even when the dashboard is asked for by hand', async () => {
      window.location.hash = '#/dashboard'
      setup()
      expect(await screen.findByRole('heading', { name: '央视' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Relay dashboard' })).not.toBeInTheDocument()
      window.location.hash = ''
    })
  })
})
