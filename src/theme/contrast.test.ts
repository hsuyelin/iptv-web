import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8')

/** Reads `--name: #rrggbb;` declarations. */
function tokens(): Map<string, string> {
  const result = new Map<string, string>()
  for (const match of css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    result.set(match[1]!, match[2]!)
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

const map = tokens()
const color = (name: string) => {
  const value = map.get(name)
  if (!value) throw new Error(`missing token --${name}`)
  return value
}

// Text pairs must reach WCAG AA for body text (4.5); non-text boundaries need 3.
const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink-muted', 'bg'],
  ['ink-muted', 'surface'],
  ['accent-text', 'bg'],
  ['caution', 'bg'],
  ['ok', 'bg'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['on-screen', 'screen'],
]
const BOUNDARY_PAIRS: Array<[string, string]> = [['line-strong', 'bg']]

describe('dark palette', () => {
  it.each(TEXT_PAIRS)('%s on %s reaches AA for text', (foreground, background) => {
    expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(BOUNDARY_PAIRS)('%s against %s reaches 3:1 for boundaries', (foreground, background) => {
    expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(3)
  })

  it('keeps the accent calm: no channel is saturated past 70%', () => {
    const hex = color('accent')
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
      number,
      number,
      number,
    ]
    const max = Math.max(r, g, b)
    const saturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    expect(saturation).toBeLessThanOrEqual(0.7)
  })
})
