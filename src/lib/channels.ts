import type { Channel } from '../api/types'

export const OTHER_GROUP = 'Other'

export interface ChannelGroup {
  readonly name: string
  readonly channels: readonly Channel[]
}

/** Groups the channels, keeping the order in which groups and channels first appear. */
export function groupChannels(channels: readonly Channel[]): ChannelGroup[] {
  const groups = new Map<string, Channel[]>()
  for (const channel of channels) {
    const name = channel.group === '' ? OTHER_GROUP : channel.group
    const members = groups.get(name)
    if (members) members.push(channel)
    else groups.set(name, [channel])
  }
  return [...groups].map(([name, members]) => ({ name, channels: members }))
}
