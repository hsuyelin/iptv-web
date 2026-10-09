import { useId } from 'react'
import type { Channel } from '../../api/types'
import { SearchIcon } from '../../components/Icons'
import { useI18n } from '../../i18n/locale'
import { groupChannels, OTHER_GROUP } from '../../lib/channels'
import styles from './ChannelRail.module.css'

interface ChannelRailProps {
  channels: readonly Channel[]
  filter: string
  onFilterChange: (value: string) => void
  /** Group to show, or null for all groups. */
  group: string | null
  onGroupChange: (group: string | null) => void
}

/** The filter box and the group chips. */
export function ChannelRail({
  channels,
  filter,
  onFilterChange,
  group,
  onGroupChange,
}: ChannelRailProps) {
  const { t, formatNumber } = useI18n()
  const filterId = useId()
  const groups = groupChannels(channels, '')
  return (
    <aside className={styles.rail} aria-label={t('find.region')}>
      <div className={styles.search}>
        <span className={styles.icon}>
          <SearchIcon />
        </span>
        <label htmlFor={filterId} className={styles.filterLabel}>
          {t('find.label')}
        </label>
        <input
          id={filterId}
          type="search"
          className={styles.filter}
          value={filter}
          placeholder={t('find.placeholder')}
          autoComplete="off"
          onChange={(event) => onFilterChange(event.target.value)}
        />
      </div>
      <nav className={styles.nav} aria-label={t('find.groups')}>
        <ul className={styles.groups}>
          <li>
            <button
              type="button"
              className={styles.group}
              aria-pressed={group === null}
              onClick={() => onGroupChange(null)}
            >
              {t('find.all')}
              <span className={styles.count}>{formatNumber(channels.length)}</span>
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
                {entry.name === OTHER_GROUP ? t('find.other') : entry.name}
                <span className={styles.count}>{formatNumber(entry.channels.length)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
