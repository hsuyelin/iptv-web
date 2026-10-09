import type { Channel } from '../api/types'

export const OTHER_GROUP = 'Other'

export interface ChannelGroup {
  readonly name: string
  readonly channels: readonly Channel[]
}

/** True when the channel's name or slug contains `filter`, ignoring case. */
export function matchesFilter(channel: Channel, filter: string): boolean {
  const needle = filter.trim().toLowerCase()
  if (needle === '') return true
  return (
    channel.name.toLowerCase().includes(needle) || channel.slug.toLowerCase().includes(needle)
  )
}

/**
 * Groups channels that match `filter`, keeping the order in which groups first appear.
 * Groups left without a channel are omitted.
 */
export function groupChannels(channels: readonly Channel[], filter: string): ChannelGroup[] {
  const groups = new Map<string, Channel[]>()
  for (const channel of channels) {
    if (!matchesFilter(channel, filter)) continue
    const name = channel.group === '' ? OTHER_GROUP : channel.group
    const members = groups.get(name)
    if (members) members.push(channel)
    else groups.set(name, [channel])
  }
  return [...groups].map(([name, members]) => ({ name, channels: members }))
}

/** Group names in first-seen order, regardless of any filter. */
export function groupNames(channels: readonly Channel[]): string[] {
  return groupChannels(channels, '').map((group) => group.name)
}

export interface ChannelPage {
  /** The groups on this page; a group that continues on the next page is cut short. */
  readonly groups: ChannelGroup[]
  /** The page shown, clamped to the range that exists (1-based). */
  readonly page: number
  readonly pageCount: number
  readonly total: number
}

/**
 * Cuts the grouped channels into pages of `size` channels, in display order, and returns
 * page `page` (clamped). A group split across pages keeps its heading on each of them.
 */
export function pageGroups(groups: readonly ChannelGroup[], page: number, size: number): ChannelPage {
  const total = groups.reduce((sum, group) => sum + group.channels.length, 0)
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, size)))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount)
  const start = (current - 1) * size
  const end = start + size

  const shown: ChannelGroup[] = []
  let seen = 0
  for (const group of groups) {
    const from = Math.max(start - seen, 0)
    const to = Math.min(end - seen, group.channels.length)
    if (to > from) shown.push({ name: group.name, channels: group.channels.slice(from, to) })
    seen += group.channels.length
    if (seen >= end) break
  }
  return { groups: shown, page: current, pageCount, total }
}

/** Page numbers to show: the first, the last and a window around `page`, with gaps as null. */
export function pageWindow(page: number, pageCount: number, around = 1): Array<number | null> {
  const wanted = new Set<number>([1, pageCount])
  for (let n = page - around; n <= page + around; n += 1) {
    if (n >= 1 && n <= pageCount) wanted.add(n)
  }
  const sorted = [...wanted].sort((a, b) => a - b)
  const result: Array<number | null> = []
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && n - previous > 1) result.push(null)
    result.push(n)
  })
  return result
}
