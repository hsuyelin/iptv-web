import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Channel } from '../../api/types'
import { ChannelWall } from './ChannelWall'

const channels: Channel[] = [{ slug: 'cctv1', name: 'CCTV-1', logo: '', group: '央视' }]

function show() {
  window.localStorage.setItem('iptv-web-locale', 'en')
  render(
    <ChannelWall
      channels={channels}
      selectedSlug={null}
      onSelect={() => undefined}
      unavailable={[]}
      layout="rows"
    />,
  )
  // Hidden on touch screens by the stylesheet, so look it up by its label, not its role.
  return screen.getByLabelText(/Scroll .* forward/)
}

describe('the scroll arrows', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollLeft')
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  })

  const wide = () =>
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 })

  it('scroll smoothly where Element.scrollBy exists', async () => {
    wide()
    const scrollBy = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy })
    await userEvent.click(show())
    expect(scrollBy).toHaveBeenCalledWith({ left: 850, behavior: 'smooth' })
  })

  it('still scroll, by setting the position, where it does not (iOS 9)', async () => {
    wide()
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: undefined })
    let position = 0
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get: () => position,
      set: (value: number) => {
        position = value
      },
    })
    await userEvent.click(show())
    expect(position).toBe(850)
  })
})
