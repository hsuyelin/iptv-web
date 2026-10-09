import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadMissingApis } from './polyfills'

describe('loadMissingApis', () => {
  // Taken per test: the mock server patches fetch only once it is listening.
  let saved = { fetch: window.fetch, AbortController: window.AbortController }
  beforeEach(() => {
    saved = { fetch: window.fetch, AbortController: window.AbortController }
  })
  afterEach(() => {
    window.fetch = saved.fetch
    window.AbortController = saved.AbortController
  })

  it('leaves a browser that has both alone', async () => {
    await loadMissingApis()
    expect(window.fetch).toBe(saved.fetch)
    expect(window.AbortController).toBe(saved.AbortController)
  })

  it('brings in fetch where it is missing (Safari before 10.1)', async () => {
    Reflect.deleteProperty(window, 'fetch')
    expect(typeof window.fetch).toBe('undefined')
    await loadMissingApis()
    expect(typeof window.fetch).toBe('function')
  })

  it('brings in AbortController where it is missing (Safari before 11.1)', async () => {
    Reflect.deleteProperty(window, 'AbortController')
    expect(typeof window.AbortController).toBe('undefined')
    await loadMissingApis()
    expect(typeof window.AbortController).toBe('function')
    const controller = new window.AbortController()
    controller.abort()
    expect(controller.signal.aborted).toBe(true)
  })
})
