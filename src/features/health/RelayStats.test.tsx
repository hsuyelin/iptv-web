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
    const { rerender } = render(<TopBar health={undefined} failed={false} lastSeenMs={0} route="channels" admin={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Checking')
    rerender(<TopBar health={health} failed={false} lastSeenMs={1} route="channels" admin={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Online')
    rerender(<TopBar health={undefined} failed lastSeenMs={0} route="channels" admin={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Offline')
    rerender(<TopBar health={health} failed lastSeenMs={Date.UTC(2026, 0, 1, 12, 34, 56)} route="channels" admin={false} />)
    // One word and a dot on screen; the full sentence is the accessible name.
    expect(screen.getByRole('status')).toHaveTextContent(/^Offline$/)
    expect(screen.getByRole('status')).toHaveAccessibleName(/Offline, last seen \d\d:\d\d:\d\d/)
  })

  it('shows the page tabs only in administrator mode, without moving anything else', () => {
    const standard = render(<TopBar health={health} failed={false} lastSeenMs={1} route="channels" admin={false} />)
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Channels' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    // The brand, the status and the controls are still there.
    expect(screen.getByRole('heading', { name: 'IPTV' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Senior mode' })).toBeInTheDocument()
    standard.unmount()

    render(<TopBar health={health} failed={false} lastSeenMs={1} route="dashboard" admin />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Channels' })).not.toHaveAttribute('aria-current')
  })
})
