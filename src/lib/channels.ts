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
