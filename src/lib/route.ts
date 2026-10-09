import { useCallback, useSyncExternalStore } from 'react'

export type Route = 'channels' | 'dashboard'

/** Hash routes, so any static host can serve the console without rewrite rules. */
export const ROUTE_HASH: Record<Route, string> = {
  channels: '#/',
  dashboard: '#/dashboard',
}

/** A page of the console, or an address that matches none of them. */
export type View = Route | 'notfound'

export function routeFromHash(hash: string): View {
  if (hash === '' || hash === '#' || hash === ROUTE_HASH.channels) return 'channels'
  if (hash === ROUTE_HASH.dashboard || hash.startsWith('#/dashboard/')) return 'dashboard'
  return 'notfound'
}

/**
 * True for a path that is neither the console's address nor an administrator key: a deeper
 * path (`/a/b`) or a file name (`/x.html`). One word (`/<key>`) is never unknown here; the
 * relay decides what it means.
 */
export function isUnknownPath(pathname: string): boolean {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '')
  if (trimmed === '' || trimmed === 'index.html') return false
  return trimmed.includes('/') || trimmed.includes('.')
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

/** The page being shown, following the address bar's hash. */
export function useRoute(): View {
  return useSyncExternalStore(
    subscribe,
    () => routeFromHash(window.location.hash),
    (): View => 'channels',
  )
}

/** Moves to a page; the change is announced through `hashchange`. */
export function useNavigate(): (route: Route) => void {
  return useCallback((route: Route) => {
    window.location.hash = ROUTE_HASH[route]
  }, [])
}
