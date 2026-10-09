import { useCallback, useSyncExternalStore } from 'react'

export type Route = 'channels' | 'dashboard'

/** Hash routes, so any static host can serve the console without rewrite rules. */
export const ROUTE_HASH: Record<Route, string> = {
  channels: '#/',
  dashboard: '#/dashboard',
}

export function routeFromHash(hash: string): Route {
  return hash === ROUTE_HASH.dashboard || hash.startsWith('#/dashboard/') ? 'dashboard' : 'channels'
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

/** The page being shown, following the address bar's hash. */
export function useRoute(): Route {
  return useSyncExternalStore(
    subscribe,
    () => routeFromHash(window.location.hash),
    (): Route => 'channels',
  )
}

/** Moves to a page; the change is announced through `hashchange`. */
export function useNavigate(): (route: Route) => void {
  return useCallback((route: Route) => {
    window.location.hash = ROUTE_HASH[route]
  }, [])
}
