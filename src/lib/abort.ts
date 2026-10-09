export interface TimedSignal {
  /** Aborts when `parent` does or when `ms` have passed, whichever comes first. */
  readonly signal: AbortSignal
  /** Stops the timer and the link to `parent`; call it once the request is over. */
  readonly done: () => void
}

/**
 * A signal that aborts after `ms`, optionally together with another signal.
 *
 * This stands in for `AbortSignal.timeout` and `AbortSignal.any`, which older phones lack
 * (Safari before 16 and 17.4): there the call throws, and the console would report a relay
 * that is perfectly well as unreachable.
 */
export function timedSignal(ms: number, parent?: AbortSignal): TimedSignal {
  const controller = new AbortController()
  const abortFor = parent === undefined ? undefined : () => controller.abort(parent.reason)
  const timer = setTimeout(() => {
    // `new DOMException(...)` throws in old Safari; a plain error carries the same name.
    const timeout = new Error('The request timed out')
    timeout.name = 'TimeoutError'
    controller.abort(timeout)
  }, ms)
  if (parent && abortFor) {
    if (parent.aborted) abortFor()
    else parent.addEventListener('abort', abortFor, { once: true })
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer)
      if (parent && abortFor) parent.removeEventListener('abort', abortFor)
    },
  }
}
