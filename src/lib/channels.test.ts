import { describe, expect, it } from 'vitest'
import type { Channel } from '../api/types'
import { groupChannels, groupNames, matchesFilter, OTHER_GROUP } from './channels'

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
