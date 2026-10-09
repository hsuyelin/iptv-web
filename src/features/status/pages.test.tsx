import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeniedPage, formatCountdown, LockedPage, NotFoundPage, UnavailablePage } from './pages'

describe('formatCountdown', () => {
  it('writes minutes and seconds, and hours from an hour up', () => {
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(899.2)).toBe('15:00')
    expect(formatCountdown(3600)).toBe('1:00:00')
    expect(formatCountdown(86_399)).toBe('23:59:59')
    expect(formatCountdown(-3)).toBe('0:00')
  })
})

describe('status pages', () => {
  it('says 404 and leads back to the channels', () => {
    render(<NotFoundPage />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the channels' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says 503 with the reason and a retry, as an alert', () => {
    const calls: string[] = []
    render(<UnavailablePage detail="HTTP 503" onRetry={() => calls.push('retry')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable')
    expect(screen.getByText('503')).toBeInTheDocument()
    expect(screen.getByText(/HTTP 503/)).toBeInTheDocument()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(calls).toEqual(['retry'])
  })

  it('says 403 without repeating or hinting at the key', () => {
    window.history.pushState({}, '', '/secret-guess')
    render(<DeniedPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Access denied')
    expect(screen.getByText('403')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('secret-guess')
    expect(screen.getByRole('link', { name: 'Back to the channels' })).toHaveAttribute('href', '/')
  })
})

describe('LockedPage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts the pause down and offers a retry only when it is over', () => {
    render(<LockedPage retryAfterSecs={65} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts')
    expect(screen.getByText('429')).toBeInTheDocument()
    expect(screen.getByText('Try again in 1:05')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByText('Try again in 1:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.queryByText(/Try again in/)).not.toBeInTheDocument()
    expect(screen.getByText(/The pause is over/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('stays honest when the relay did not say how long', () => {
    render(<LockedPage retryAfterSecs={null} />)
    expect(screen.getByText(/key checks are paused/)).toBeInTheDocument()
    expect(screen.queryByText(/Try again in/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the channels' })).toBeInTheDocument()
  })

  it('keeps the count right when the timer fires late', () => {
    render(<LockedPage retryAfterSecs={30} />)
    act(() => {
      vi.setSystemTime(Date.now() + 20_000)
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByText('Try again in 0:09')).toBeInTheDocument()
  })
})
