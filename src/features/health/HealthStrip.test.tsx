import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RelayHealth } from '../../api/types'
import { HealthStrip } from './HealthStrip'

const health: RelayHealth = {
  channelCount: 62,
  reloadError: null,
  playlistRequests: 1200,
  segmentRequests: 5000,
  segmentsStreamed: 4990,
  segmentErrors: 0,
  segmentsRejected: 0,
  unavailable: [],
  upstreamCalls: 8,
  upstreamQueued: 0,
}

const base = { themeLabel: 'Use dark theme', onToggleTheme: () => undefined }

describe('HealthStrip', () => {
  it('shows the relay figures when it is online', () => {
    render(<HealthStrip health={health} failed={false} lastSeenMs={1} {...base} />)
    expect(screen.getByRole('status')).toHaveTextContent('Relay online')
    expect(screen.getByText('62')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
    expect(screen.getByText('4,990')).toBeInTheDocument()
  })

  it('says it is checking before the first answer', () => {
    render(<HealthStrip health={undefined} failed={false} lastSeenMs={0} {...base} />)
    expect(screen.getByRole('status')).toHaveTextContent('Checking the relay');
  })

  it('shows the offline state with the last success time and keeps the last figures', () => {
    render(<HealthStrip health={health} failed lastSeenMs={Date.UTC(2026, 9, 9, 3, 39, 17)} {...base} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Relay unreachable, last seen \d\d:\d\d:\d\d/)
    expect(screen.getByLabelText('Relay figures')).toHaveAttribute('data-stale', 'true')
    expect(screen.getByText('62')).toBeInTheDocument()
  })

  it('omits the last-seen time when the relay was never reached', () => {
    render(<HealthStrip health={undefined} failed lastSeenMs={0} {...base} />)
    expect(screen.getByRole('status')).toHaveTextContent(/^Relay unreachable$/)
  })

  it('flags segment errors and a broken channel file', () => {
    render(
      <HealthStrip
        health={{ ...health, segmentErrors: 3, reloadError: 'cannot parse' }}
        failed={false}
        lastSeenMs={1}
        {...base}
      />,
    )
    expect(screen.getByText('3').closest('div')).toHaveAttribute('data-warn', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/last good list/)
  })

  it('toggles the theme', async () => {
    const onToggle = vi.fn()
    render(<HealthStrip health={health} failed={false} lastSeenMs={1} {...base} onToggleTheme={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: 'Use dark theme' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
