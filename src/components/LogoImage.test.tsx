import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogoImage } from './LogoImage'

// A decorative <img alt=""> has the "presentation" role; the placeholder is a hidden "img".
const picture = () => screen.queryByRole('presentation')
const placeholder = () => screen.queryByRole('img', { hidden: true })

describe('LogoImage', () => {
  it('shows the picture while it loads', () => {
    render(<LogoImage src="https://cdn/a.png" />)
    expect(picture()).toHaveAttribute('src', 'https://cdn/a.png')
    expect(placeholder()).toBeNull()
  })

  it('swaps in the placeholder icon when the picture fails', () => {
    render(<LogoImage src="https://cdn/a.png" />)
    fireEvent.error(picture()!)
    expect(picture()).toBeNull()
    expect(placeholder()).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the placeholder for an empty address and retries a new address', () => {
    const view = render(<LogoImage src="" />)
    expect(placeholder()).not.toBeNull()
    view.rerender(<LogoImage src="https://cdn/b.png" />)
    expect(picture()).toHaveAttribute('src', 'https://cdn/b.png')
  })
})
