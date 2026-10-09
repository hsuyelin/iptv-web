import { useRef } from 'react'
import type { Channel } from '../../api/types'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import { groupChannels, OTHER_GROUP } from '../../lib/channels'
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
  /** `rows` swipes per group; `list` stacks every channel in one large column. */
  layout: 'rows' | 'list'
}

/** The channels as one swipeable row per group, with the selected one marked on air. */
export function ChannelWall({
  channels,
  filter,
  group,
  selectedSlug,
  onSelect,
  onClear,
  unavailable,
  layout,
}: ChannelWallProps) {
  const { t } = useI18n()
  const visible = groupChannels(channels, filter).filter(
    (entry) => group === null || entry.name === group,
  )
  if (visible.length === 0) {
    return (
      <section className={styles.wall} aria-label={t('wall.label')}>
        <div className={styles.none}>
          <p>{t('wall.none', { filter })}</p>
          <button type="button" className={styles.clear} onClick={onClear}>
            {t('wall.clear')}
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className={styles.wall} aria-label={t('wall.label')}>
      {visible.map((entry) => {
        const props = {
          title: entry.name === OTHER_GROUP ? t('find.other') : entry.name,
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
                  {channel.logo !== '' && (
                    <img src={channel.logo} alt="" loading="lazy" decoding="async" />
                  )}
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
  const { t } = useI18n()
  return (
    <div className={styles.group}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {channels.map((channel) => {
          const onAir = channel.slug === selectedSlug
          return (
            <li key={channel.slug}>
              <button
                type="button"
                className={styles.line}
                aria-pressed={onAir}
                data-unavailable={unavailable.includes(channel.slug.toLowerCase())}
                onClick={() => onSelect(channel)}
              >
                <span className={styles.lineLogo}>
                  {channel.logo !== '' && (
                    <img src={channel.logo} alt="" loading="lazy" decoding="async" />
                  )}
                </span>
                <span className={styles.lineName}>{channel.name}</span>
                {onAir && <span className={styles.lineState}>{t('player.playing')}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
