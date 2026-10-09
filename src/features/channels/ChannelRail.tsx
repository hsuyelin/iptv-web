import { useId } from 'react'
import type { Channel } from '../../api/types'
import { groupChannels } from '../../lib/channels'
import { formatCount } from '../../lib/format'
import styles from './ChannelRail.module.css'

interface ChannelRailProps {
  channels: readonly Channel[]
  filter: string
  onFilterChange: (value: string) => void
  /** Group to show, or null for all groups. */
  group: string | null
  onGroupChange: (group: string | null) => void
}

/** The filter box and the list of groups. */
export function ChannelRail({
  channels,
  filter,
  onFilterChange,
  group,
  onGroupChange,
}: ChannelRailProps) {
  const filterId = useId()
  const groups = groupChannels(channels, '')

  return (
    <aside className={styles.rail} aria-label="Find a channel">
      <label htmlFor={filterId} className={styles.filterLabel}>
        Filter by name
      </label>
      <input
        id={filterId}
        type="search"
        className={styles.filter}
        value={filter}
        placeholder="Try “cctv”"
        autoComplete="off"
        onChange={(event) => onFilterChange(event.target.value)}
      />
      <nav aria-label="Groups">
        <ul className={styles.groups}>
          <li>
            <button
              type="button"
              className={styles.group}
              aria-pressed={group === null}
              onClick={() => onGroupChange(null)}
            >
              All channels
              <span className={styles.count}>{formatCount(channels.length)}</span>
            </button>
          </li>
          {groups.map((entry) => (
            <li key={entry.name}>
              <button
                type="button"
                className={styles.group}
                aria-pressed={group === entry.name}
                onClick={() => onGroupChange(entry.name)}
              >
                {entry.name}
                <span className={styles.count}>{formatCount(entry.channels.length)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
