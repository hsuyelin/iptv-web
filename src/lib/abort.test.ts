import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { timedSignal } from './abort'

describe('timedSignal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aborts with a timeout error once the time is up, and not before', () => {
    const { signal } = timedSignal(4000)
    vi.advanceTimersByTime(3999)
    expect(signal.aborted).toBe(false)
    vi.advanceTimersByTime(1)
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toMatchObject({ name: 'TimeoutError' })
  })

  it('aborts when the signal it is joined to does, passing the reason on', () => {
    const parent = new AbortController()
    const { signal } = timedSignal(4000, parent.signal)
    expect(signal.aborted).toBe(false)
    parent.abort(new Error('left the page'))
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toMatchObject({ message: 'left the page' })
  })

  it('starts aborted when the signal it is joined to already is', () => {
    const parent = new AbortController()
    parent.abort()
    expect(timedSignal(4000, parent.signal).signal.aborted).toBe(true)
  })

  it('stops the timer and lets go of the other signal when done', () => {
    const parent = new AbortController()
    const { signal, done } = timedSignal(4000, parent.signal)
    done()
    vi.advanceTimersByTime(10_000)
    parent.abort()
    expect(signal.aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
