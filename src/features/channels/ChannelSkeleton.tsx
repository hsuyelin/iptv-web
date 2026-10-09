import { useI18n } from '../../i18n/locale'
import styles from './ChannelSkeleton.module.css'

const GROUPS = 2
const TILES = 6

/** Grey cards in the shape of the wall while the list loads, so the page does not jump. */
export function ChannelSkeleton({ layout }: { layout: 'rows' | 'list' }) {
  const { t } = useI18n()
  return (
    <section className={styles.wall} aria-busy="true" aria-label={t('app.loadingChannels')}>
      {Array.from({ length: GROUPS }, (_, group) => (
        <div key={group} className={styles.group} aria-hidden="true">
          <div className={styles.title} />
          <div className={layout === 'list' ? styles.list : styles.tiles}>
            {Array.from({ length: layout === 'list' ? 3 : TILES }, (_, tile) => (
              <div key={tile} className={layout === 'list' ? styles.line : styles.tile} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
