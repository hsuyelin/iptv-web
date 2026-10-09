/**
 * Brings in what the oldest supported browsers lack and the app calls directly. Newer
 * language features (Promise, Map, Array.includes, ...) are added by the legacy build; these
 * two are whole APIs, so they are loaded only when missing and cost nothing elsewhere.
 *
 *   fetch            Safari before 10.1
 *   AbortController  Safari before 11.1 (12.2 in practice)
 */
export async function loadMissingApis(): Promise<void> {
  if (typeof window.fetch !== 'function') {
    await import('whatwg-fetch')
  }
  if (typeof window.AbortController !== 'function') {
    // The patching build also teaches `fetch` to honour a signal.
    await import('abortcontroller-polyfill/dist/polyfill-patch-fetch')
  }
}
