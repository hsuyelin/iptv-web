import { QueryClient, useQuery } from '@tanstack/react-query'
import { fetchChannels, fetchHealth } from './client'

export const HEALTH_INTERVAL_MS = 5000

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
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: HEALTH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: 0,
  })
}
