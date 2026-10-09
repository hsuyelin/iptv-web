import type { Channel } from '../../api/types'
import { groupChannels } from '../../lib/channels'
import styles from './ChannelWall.module.css'

interface ChannelWallProps {
  channels: readonly Channel[]
  filter: string
  /** Group to show, or null for all groups. */
  group: string | null
  selectedSlug: string | null
  onSelect: (channel: Channel) => void
  /** Clears the filter and the group choice. */
  onClear: () => void
  /** Slugs the relay is redirecting to its notice stream. */
  unavailable: readonly string[]
}

/** The channels as a wall of tiles, grouped, with the selected one marked on air. */
export function ChannelWall({
  channels,
  filter,
  group,
  selectedSlug,
  onSelect,
  onClear,
  unavailable,
}: ChannelWallProps) {
  const visible = groupChannels(channels, filter).filter(
    (entry) => group === null || entry.name === group,
  )

  if (visible.length === 0) {
    return (
      <section className={styles.wall} aria-label="Channels">
        <div className={styles.none}>
          <p>No channel matches “{filter}”.</p>
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear filter
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.wall} aria-label="Channels">
      {visible.map((entry) => (
        <div key={entry.name}>
          <h2 className={styles.sectionTitle}>{entry.name}</h2>
          <ul className={styles.tiles}>
            {entry.channels.map((channel) => (
              <li key={channel.slug}>
                <button
                  type="button"
                  className={styles.tile}
                  aria-pressed={channel.slug === selectedSlug}
                  data-unavailable={unavailable.includes(channel.slug.toLowerCase())}
                  onClick={() => onSelect(channel)}
                >
                  <span className={styles.marker} aria-hidden="true" />
                  <span className={styles.logo}>
                    {channel.logo !== '' && (
                      <img src={channel.logo} alt="" loading="lazy" decoding="async" />
                    )}
                  </span>
                  <span className={styles.name}>{channel.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
