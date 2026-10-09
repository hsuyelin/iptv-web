import { describe, expect, it } from 'vitest'
import type { Channel } from '../api/types'
import {
  groupChannels,
  groupNames,
  matchesFilter,
  OTHER_GROUP,
  pageGroups,
  pageWindow,
} from './channels'

const channel = (slug: string, name: string, group: string): Channel => ({
  slug,
  name,
  logo: '',
  group,
})

const channels = [
  channel('cctv1', 'CCTV-1 综合', '央视'),
  channel('cctv2', 'CCTV-2 财经', '央视'),
  channel('shandongws', '山东卫视', '卫视'),
  channel('misc', 'Misc', ''),
]

describe('matchesFilter', () => {
  it('matches the name or the slug, ignoring case and surrounding spaces', () => {
    expect(matchesFilter(channels[0]!, ' CCTV ')).toBe(true)
    expect(matchesFilter(channels[0]!, '综合')).toBe(true)
    expect(matchesFilter(channels[2]!, 'shandong')).toBe(true)
    expect(matchesFilter(channels[2]!, 'cctv')).toBe(false)
  })

  it('matches everything for an empty filter', () => {
    expect(matchesFilter(channels[3]!, '')).toBe(true)
    expect(matchesFilter(channels[3]!, '   ')).toBe(true)
  })
})

describe('groupChannels', () => {
  it('keeps first-seen group order and puts ungrouped channels under Other', () => {
    const groups = groupChannels(channels, '')
    expect(groups.map((g) => g.name)).toEqual(['央视', '卫视', OTHER_GROUP])
    expect(groups[0]?.channels.map((c) => c.slug)).toEqual(['cctv1', 'cctv2'])
  })

  it('drops groups that the filter empties', () => {
    const groups = groupChannels(channels, 'cctv')
    expect(groups.map((g) => g.name)).toEqual(['央视'])
    expect(groupChannels(channels, 'zzz')).toEqual([])
  })

  it('lists group names regardless of the filter', () => {
    expect(groupNames(channels)).toEqual(['央视', '卫视', OTHER_GROUP])
    expect(groupNames([])).toEqual([])
  })
})

describe('pageGroups', () => {
  const many = groupChannels(
    [
      ...Array.from({ length: 5 }, (_, i) => channel(`a${i}`, `A${i}`, 'A')),
      ...Array.from({ length: 4 }, (_, i) => channel(`b${i}`, `B${i}`, 'B')),
    ],
    '',
  )
  const slugs = (groups: { channels: readonly Channel[] }[]) =>
    groups.flatMap((g) => g.channels.map((c) => c.slug))

  it('cuts the channels in display order and repeats a split group heading', () => {
    const first = pageGroups(many, 1, 3)
    expect(first.pageCount).toBe(3)
    expect(first.total).toBe(9)
    expect(first.groups.map((g) => g.name)).toEqual(['A'])
    expect(slugs(first.groups)).toEqual(['a0', 'a1', 'a2'])

    const second = pageGroups(many, 2, 3)
    expect(second.groups.map((g) => g.name)).toEqual(['A', 'B'])
    expect(slugs(second.groups)).toEqual(['a3', 'a4', 'b0'])

    const third = pageGroups(many, 3, 3)
    expect(slugs(third.groups)).toEqual(['b1', 'b2', 'b3'])
  })

  it('covers every channel exactly once across the pages', () => {
    const all = [1, 2, 3].flatMap((n) => slugs(pageGroups(many, n, 3).groups))
    expect(all).toHaveLength(9)
    expect(new Set(all).size).toBe(9)
  })

  it('clamps the page and copes with no channels', () => {
    expect(pageGroups(many, 99, 4).page).toBe(3)
    expect(pageGroups(many, 0, 4).page).toBe(1)
    expect(pageGroups(many, Number.NaN, 4).page).toBe(1)
    const none = pageGroups([], 1, 4)
    expect(none).toEqual({ groups: [], page: 1, pageCount: 1, total: 0 })
  })
})

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3])
    expect(pageWindow(1, 1)).toEqual([1])
  })

  it('keeps the ends and a window around the current page, marking gaps', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10])
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10])
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, null, 10])
  })
})
