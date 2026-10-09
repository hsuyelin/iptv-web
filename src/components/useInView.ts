import { useEffect, useState, type RefObject } from 'react'

interface Options {
  /** Share of the element that must be on screen to count as in view. */
  threshold?: number
  /** Shrinks the viewport, e.g. to ignore the strip under a sticky bar. */
  rootMargin?: string
}

/**
 * Whether `ref`'s element is on screen. Starts as `true`, so nothing floats or hides
 * before the first measurement, and stays `true` where IntersectionObserver is missing.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { threshold = 0.25, rootMargin = '0px' }: Options = {},
): boolean {
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries[entries.length - 1]
        if (latest) setInView(latest.isIntersecting && latest.intersectionRatio >= threshold)
      },
      { threshold: [0, threshold], rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, threshold, rootMargin])

  return inView
}
