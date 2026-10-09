import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  // A request without a handler fails the page with a bare "fetch failed". Say which one.
  server.events.on('request:unhandled', ({ request }) => {
    try {
      console.error(`[test] no request handler for ${request.method} ${request.url}`)
    } catch {
      // Looking must never change what happens to the request.
    }
  })
})
afterEach(async () => {
  cleanup()
  // Unmounting aborts the page's requests. Let them finish with the handlers they started
  // with before the handlers change, so one test's leftovers cannot reach the next one.
  await new Promise((done) => setTimeout(done, 0))
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
  server.resetHandlers()
})
afterAll(() => server.close())

// jsdom has no matchMedia; the theme hook only needs a static answer.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
}

/**
 * jsdom has no IntersectionObserver. This stand-in records observers so a test can say
 * whether an element is on screen: `setInView(element, false)`.
 */
type Entry = { target: Element; isIntersecting: boolean; intersectionRatio: number }
const observers = new Set<{ callback: (entries: Entry[]) => void; targets: Set<Element> }>()

class FakeIntersectionObserver {
  private readonly record: { callback: (entries: Entry[]) => void; targets: Set<Element> }
  constructor(callback: (entries: Entry[]) => void) {
    this.record = { callback, targets: new Set() }
    observers.add(this.record)
  }
  observe(target: Element) {
    this.record.targets.add(target)
  }
  unobserve(target: Element) {
    this.record.targets.delete(target)
  }
  disconnect() {
    observers.delete(this.record)
  }
  takeRecords() {
    return []
  }
}
;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  FakeIntersectionObserver

export function setInView(target: Element, inView: boolean): void {
  for (const record of observers) {
    if (record.targets.has(target)) {
      record.callback([
        { target, isIntersecting: inView, intersectionRatio: inView ? 1 : 0 },
      ])
    }
  }
}
