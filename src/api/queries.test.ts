import { describe, expect, it } from 'vitest'
import { adminCandidate } from './queries'

describe('adminCandidate', () => {
  it('takes a single-word path as the key', () => {
    expect(adminCandidate('/abc123_DEF-xyz')).toBe('abc123_DEF-xyz')
    expect(adminCandidate('/abc123/')).toBe('abc123')
    expect(adminCandidate('//abc123')).toBe('abc123')
  })

  it('finds no key in the plain address, deep paths or file names', () => {
    expect(adminCandidate('/')).toBeNull()
    expect(adminCandidate('')).toBeNull()
    expect(adminCandidate('/a/b')).toBeNull()
    expect(adminCandidate('/index.html')).toBeNull()
    expect(adminCandidate('/assets/app.js')).toBeNull()
  })

  it('decodes the path and survives a broken escape', () => {
    expect(adminCandidate('/caf%C3%A9')).toBe('café')
    expect(adminCandidate('/%E0%A4%A')).toBeNull()
  })
})
