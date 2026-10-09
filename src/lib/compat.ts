/**
 * Which stream a device should be given.
 *
 * The relay's normal stream is 1080p High profile with B-frames. Older Apple devices play it
 * as a slideshow, or not at all, so the relay can also offer a lighter one (720p Main
 * profile, no B-frames, a keyframe at least every 2 seconds) at `?profile=compat`. A relay
 * that has no encoder ignores the request and serves the normal stream, so asking is safe.
 */

/** The first iOS and iPadOS version that is asked for the normal stream. */
export const FIRST_NORMAL_IOS = 16

/** `?compat=1` or `?compat=0` in the page address; anything else leaves the choice to the device. */
export function compatOverride(search: string): boolean | null {
  // By hand: URLSearchParams is missing before Safari 10.1, which is the point of all this.
  const value = /[?&]compat=([^&#]*)/.exec(search)?.[1]
  if (value === '1' || value === 'on') return true
  if (value === '0' || value === 'off') return false
  return null
}

/**
 * The iOS or iPadOS major version a browser reports, or null for anything else.
 *
 * iPhones and older iPads say so in the user agent ("CPU iPhone OS 15_4"). iPadOS 13 and
 * later pretend to be a Mac, and are told apart by their touch screen; their Safari version
 * is the best sign of the system version.
 */
export function iosMajor(userAgent: string, maxTouchPoints = 0): number | null {
  const phoneOrPad = /\b(?:iPhone|iPad|iPod|CPU)\b[^)]*?\bOS (\d+)[_.]/.exec(userAgent)
  if (phoneOrPad?.[1]) return Number(phoneOrPad[1])
  if (/\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1) {
    const safari = /\bVersion\/(\d+)/.exec(userAgent)
    if (safari?.[1]) return Number(safari[1])
  }
  return null
}

/** True when this device should be asked for the lighter stream. */
export function wantsCompat(userAgent: string, search: string, maxTouchPoints = 0): boolean {
  const chosen = compatOverride(search)
  if (chosen !== null) return chosen
  const major = iosMajor(userAgent, maxTouchPoints)
  return major !== null && major < FIRST_NORMAL_IOS
}

/** [`wantsCompat`] for the page the code is running in. */
export function compatWanted(): boolean {
  return wantsCompat(
    window.navigator.userAgent,
    window.location.search,
    window.navigator.maxTouchPoints,
  )
}
