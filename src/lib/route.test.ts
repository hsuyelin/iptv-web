import { describe, expect, it } from 'vitest'
import { isUnknownPath, routeFromHash } from './route'

describe('routeFromHash', () => {
  it('knows the channels and the dashboard', () => {
    for (const hash of ['', '#', '#/']) expect(routeFromHash(hash)).toBe('channels')
    for (const hash of ['#/dashboard', '#/dashboard/x']) expect(routeFromHash(hash)).toBe('dashboard')
  })

  it('calls anything else a page that does not exist', () => {
    for (const hash of ['#/nope', '#nope', '#/dashboardx', '#/channels']) {
      expect(routeFromHash(hash)).toBe('notfound')
    }
  })
})

describe('isUnknownPath', () => {
  it('accepts the console address and one word, which may be a key', () => {
    for (const path of ['/', '', '//', '/index.html', '/some-key', '/some-key/']) {
      expect(isUnknownPath(path)).toBe(false)
    }
  })

  it('rejects deeper paths and file names', () => {
    for (const path of ['/a/b', '/a/b/', '/x.html', '/favicon.ico']) {
      expect(isUnknownPath(path)).toBe(true)
    }
  })
})
