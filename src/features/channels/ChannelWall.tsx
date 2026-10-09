import { useRef } from 'react'
import type { Channel } from '../../api/types'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import { LogoImage } from '../../components/LogoImage'
import { groupChannels, OTHER_GROUP } from '../../lib/channels'
import styles from './ChannelWall.module.css'

interface ChannelWallProps {
  channels: readonly Channel[]
  selectedSlug: string | null
  onSelect: (channel: Channel) => void
  /** Slugs the relay is redirecting to its notice stream. */
  unavailable: readonly string[]
  /** `rows` swipes per group; `list` stacks every channel in one large column. */
  layout: 'rows' | 'list'
}

/** Every channel, one swipeable row per group, with the selected one marked. */
export function ChannelWall({
  channels,
  selectedSlug,
  onSelect,
  unavailable,
  layout,
}: ChannelWallProps) {
  const { t } = useI18n()
  return (
    <section className={styles.wall} aria-label={t('wall.label')}>
      {groupChannels(channels).map((entry) => {
        const props = {
          title: entry.name === OTHER_GROUP ? t('wall.other') : entry.name,
          channels: entry.channels,
          selectedSlug,
          unavailable,
          onSelect,
        }
        return layout === 'list' ? (
          <ListGroup key={entry.name} {...props} />
        ) : (
          <Row key={entry.name} {...props} />
        )
      })}
    </section>
  )
}

interface RowProps {
  title: string
  channels: readonly Channel[]
  selectedSlug: string | null
  unavailable: readonly string[]
  onSelect: (channel: Channel) => void
}

function Row({ title, channels, selectedSlug, unavailable, onSelect }: RowProps) {
  const { t } = useI18n()
  const track = useRef<HTMLUListElement>(null)
  const scroll = (direction: 1 | -1) => {
    const element = track.current
    if (!element) return
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <div className={styles.row}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.scroller}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.back}`}
          aria-label={t('wall.scrollBack', { group: title })}
          onClick={() => scroll(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <ul className={styles.tiles} ref={track}>
          {channels.map((channel) => (
            <li key={channel.slug} className={styles.item}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={channel.slug === selectedSlug}
                data-unavailable={unavailable.includes(channel.slug.toLowerCase())}
                onClick={() => onSelect(channel)}
              >
                <span className={styles.logo}>
                  <LogoImage src={channel.logo} />
                </span>
                <span className={styles.name}>{channel.name}</span>
                <span className={styles.marker} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${styles.arrow} ${styles.forward}`}
          aria-label={t('wall.scrollForward', { group: title })}
          onClick={() => scroll(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}

/** Senior mode: one large, plainly labelled line per channel. */
function ListGroup({ title, channels, selectedSlug, unavailable, onSelect }: RowProps) {
  return (
    <div className={styles.group}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {channels.map((channel) => (
          <li key={channel.slug}>
            <button
              type="button"
              className={styles.line}
              aria-pressed={channel.slug === selectedSlug}
              data-unavailable={unavailable.includes(channel.slug.toLowerCase())}
              onClick={() => onSelect(channel)}
            >
              <span className={styles.lineLogo}>
                <LogoImage src={channel.logo} />
              </span>
              <span className={styles.lineName}>{channel.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
