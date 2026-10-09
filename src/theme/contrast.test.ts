import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8')

type Scheme = 'light' | 'dark'

/** Reads `--name: light-dark(#aaa, #bbb);` and `--name: #aaa;` declarations. */
function tokens(scheme: Scheme): Map<string, string> {
  const result = new Map<string, string>()
  for (const match of css.matchAll(/--([a-z-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi)) {
    result.set(match[1]!, (scheme === 'light' ? match[2] : match[3])!)
  }
  for (const match of css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (!result.has(match[1]!)) result.set(match[1]!, match[2]!)
  }
  return result
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

// Text pairs must reach WCAG AA for body text (4.5); non-text boundaries need 3.
const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'wall'],
  ['ink', 'panel'],
  ['ink', 'panel-raised'],
  ['ink-muted', 'wall'],
  ['ink-muted', 'panel'],
  ['ink-muted', 'panel-raised'],
  ['tally', 'panel'],
  ['signal', 'panel'],
  ['signal', 'wall'],
  ['caution', 'panel'],
  ['caution', 'wall'],
  ['caution', 'panel-raised'],
  ['on-tally', 'tally'],
  ['on-screen', 'screen'],
]
const BOUNDARY_PAIRS: Array<[string, string]> = [
  ['line-strong', 'panel'],
  ['line-strong', 'wall'],
  ['tally', 'wall'],
]

describe.each<Scheme>(['light', 'dark'])('%s scheme', (scheme) => {
  const map = tokens(scheme)
  const color = (name: string) => {
    const value = map.get(name)
    if (!value) throw new Error(`missing token --${name}`)
    return value
  }

  it.each(TEXT_PAIRS)('%s on %s reaches AA for text', (foreground, background) => {
    expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(BOUNDARY_PAIRS)('%s against %s reaches 3:1 for boundaries', (foreground, background) => {
    expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(3)
  })
})
