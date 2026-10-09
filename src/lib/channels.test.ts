import { describe, expect, it } from 'vitest'
import type { Channel } from '../api/types'
import { groupChannels, OTHER_GROUP } from './channels'

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

describe('groupChannels', () => {
  it('keeps first-seen group order and puts ungrouped channels under Other', () => {
    const groups = groupChannels(channels)
    expect(groups.map((g) => g.name)).toEqual(['央视', '卫视', OTHER_GROUP])
    expect(groups[0]?.channels.map((c) => c.slug)).toEqual(['cctv1', 'cctv2'])
  })

  it('keeps every channel exactly once', () => {
    const slugs = groupChannels(channels).flatMap((g) => g.channels.map((c) => c.slug))
    expect(slugs).toEqual(['cctv1', 'cctv2', 'shandongws', 'misc'])
  })

  it('has no groups for no channels', () => {
    expect(groupChannels([])).toEqual([])
  })
})
