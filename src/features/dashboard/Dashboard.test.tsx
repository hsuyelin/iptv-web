import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { HealthSample, RelayHealth } from '../../api/types'
import { Dashboard, deltas } from './Dashboard'

const sample = (at: number, segmentsStreamed: number): HealthSample => ({
  at,
  segmentsStreamed,
  segmentErrors: 0,
})

const health: RelayHealth = {
  channelCount: 3,
  channelFile: '/c.yaml',
  startedAtMs: 0,
  reloadError: null,
  playlistRequests: 0,
  segmentRequests: 0,
  segmentsStreamed: 0,
  segmentErrors: 0,
  segmentsRejected: 0,
  unavailable: [],
  upstreamCalls: 0,
  upstreamQueued: 0,
}

describe('deltas', () => {
  it('counts the segments gained between readings and ignores a restart', () => {
    expect(deltas([])).toEqual([])
    expect(deltas([sample(1, 5)])).toEqual([])
    expect(deltas([sample(1, 5), sample(2, 9), sample(3, 9), sample(4, 2)])).toEqual([4, 0, 0])
  })
})

describe('Dashboard', () => {
  it('waits for the first reading', () => {
    render(
      <Dashboard health={undefined} failed={false} lastSeenMs={0} history={[]} channels={[]} now={0} />,
    )
    expect(screen.getByText('Waiting for the first reading…')).toBeInTheDocument()
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
  })

  it('draws the chart once there are two readings', () => {
    const history = [sample(1, 0), sample(2, 3), sample(3, 8)]
    render(
      <Dashboard health={health} failed={false} lastSeenMs={5} history={history} channels={[]} now={0} />,
    )
    expect(screen.getByRole('img', { name: 'Segments streamed' })).toBeInTheDocument()
    expect(screen.queryByText('Collecting readings…')).not.toBeInTheDocument()
  })
})
