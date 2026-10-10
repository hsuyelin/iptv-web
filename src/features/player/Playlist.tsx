import { useEffect, useRef } from 'react'
import type { Channel } from '../../api/types'
import { CloseIcon } from '../../components/Icons'
import { LogoImage } from '../../components/LogoImage'
import { useI18n } from '../../i18n/locale'
import { groupChannels, OTHER_GROUP } from '../../lib/channels'
import styles from './Playlist.module.css'

interface PlaylistProps {
  id: string
  channels: readonly Channel[]
  currentSlug: string
  onSelect: (channel: Channel) => void
  onClose: () => void
}

/** A translucent sidebar over the screen that lists every channel and switches on a click. */
export function Playlist({ id, channels, currentSlug, onSelect, onClose }: PlaylistProps) {
  const { t } = useI18n()
  const current = useRef<HTMLButtonElement>(null)

  // Start with the channel on air in view, since the list can be long.
  useEffect(() => {
    current.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  return (
    <div className={styles.layer}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t('player.playlistClose')}
        onClick={onClose}
      />
      <aside
      id={id}
      className={styles.playlist}
      aria-label={t('player.playlist')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <header className={styles.head}>
        <h3 className={styles.title}>{t('player.playlist')}</h3>
        <button
          type="button"
          className={styles.close}
          aria-label={t('player.playlistClose')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>
      <div className={styles.body}>
        {groupChannels(channels).map((group) => (
          <section key={group.name} className={styles.group}>
            <h4 className={styles.groupName}>
              {group.name === OTHER_GROUP ? t('wall.other') : group.name}
            </h4>
            <ul className={styles.list}>
              {group.channels.map((channel) => {
                const onAir = channel.slug === currentSlug
                return (
                  <li key={channel.slug}>
                    <button
                      type="button"
                      ref={onAir ? current : undefined}
                      className={styles.item}
                      aria-current={onAir ? 'true' : undefined}
                      onClick={() => onSelect(channel)}
                    >
                      <span className={styles.logo}>
                        <LogoImage src={channel.logo} />
                      </span>
                      <span className={styles.name}>{channel.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      </aside>
    </div>
  )
}
