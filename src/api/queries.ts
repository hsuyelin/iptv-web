import { QueryClient, useQuery } from '@tanstack/react-query'
import { fetchChannels, fetchHealth } from './client'
import type { HealthSample } from './types'

export const HEALTH_INTERVAL_MS = 5000
/** How many readings the dashboard chart keeps. */
export const HISTORY_LENGTH = 30

const HISTORY_KEY = ['health-history'] as const

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  })
}

/** The channel list. It changes rarely, so it is kept fresh for five minutes. */
export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: ({ signal }) => fetchChannels(signal),
    staleTime: 5 * 60_000,
  })
}

/**
 * Relay health, refreshed every five seconds while the tab is visible. TanStack Query
 * pauses the interval while the tab is hidden because background refetching is off.
 */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal, client }) => {
      const health = await fetchHealth(signal)
      const sample: HealthSample = {
        at: Date.now(),
        segmentsStreamed: health.segmentsStreamed,
        segmentErrors: health.segmentErrors,
      }
      client.setQueryData<HealthSample[]>(HISTORY_KEY, (previous = []) =>
        [...previous, sample].slice(-HISTORY_LENGTH),
      )
      return health
    },
    refetchInterval: HEALTH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: 0,
  })
}

/** The most recent health readings, oldest first; filled in by `useHealth`. */
export function useHealthHistory(): readonly HealthSample[] {
  const history = useQuery<HealthSample[]>({
    queryKey: HISTORY_KEY,
    queryFn: () => [],
    enabled: false,
    initialData: [],
    staleTime: Infinity,
  })
  return history.data
}
