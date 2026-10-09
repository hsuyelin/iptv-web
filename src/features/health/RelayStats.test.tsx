import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RelayHealth } from '../../api/types'
import { RelayStats } from './RelayStats'
import { TopBar } from '../shell/TopBar'

const health: RelayHealth = {
  channelCount: 1234,
  channelFile: '/app/channels.yaml',
  startedAtMs: 1000,
  reloadError: null,
  playlistRequests: 5,
  segmentRequests: 9,
  segmentsStreamed: 8,
  segmentErrors: 2,
  segmentsRejected: 0,
  unavailable: [],
  upstreamCalls: 7,
  upstreamQueued: 0,
}

describe('RelayStats', () => {
  it('shows nothing before the first response', () => {
    const view = render(<RelayStats health={undefined} stale={false} />)
    expect(view.baseElement.firstElementChild).toBeEmptyDOMElement()
  })

  it('formats the figures and flags segment errors', () => {
    render(<RelayStats health={health} stale={false} />)
    expect(screen.getByText('Channels').nextSibling).toHaveTextContent('1,234')
    expect(screen.getByText('Segment errors').parentElement).toHaveAttribute('data-warn', 'true')
    expect(screen.getByText('Playlists served').parentElement).toHaveAttribute('data-warn', 'false')
  })

  it('warns when the channel file is broken', () => {
    render(<RelayStats health={{ ...health, reloadError: 'bad yaml' }} stale={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent('last good list')
  })

  it('dims figures that may be out of date', () => {
    render(<RelayStats health={health} stale />)
    expect(screen.getByLabelText('Relay figures')).toHaveAttribute('data-stale', 'true')
  })
})

describe('TopBar status', () => {
  it('reports checking, online and unreachable states', () => {
    const { rerender } = render(<TopBar health={undefined} failed={false} lastSeenMs={0} route="channels" />)
    expect(screen.getByRole('status')).toHaveTextContent('Checking the relay…')
    rerender(<TopBar health={health} failed={false} lastSeenMs={1} route="channels" />)
    expect(screen.getByRole('status')).toHaveTextContent('Relay online')
    rerender(<TopBar health={undefined} failed lastSeenMs={0} route="channels" />)
    expect(screen.getByRole('status')).toHaveTextContent('Relay unreachable')
    rerender(<TopBar health={health} failed lastSeenMs={Date.UTC(2026, 0, 1, 12, 34, 56)} route="channels" />)
    expect(screen.getByRole('status')).toHaveTextContent(/Relay unreachable, last seen/)
  })
})
