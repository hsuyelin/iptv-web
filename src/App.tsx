import { useRef, useState } from 'react'
import { useAdmin, useChannels, useHealth, useHealthHistory } from './api/queries'
import type { Channel } from './api/types'
import { ChannelRail } from './features/channels/ChannelRail'
import { ChannelWall } from './features/channels/ChannelWall'
import { Dashboard } from './features/dashboard/Dashboard'
import type { EngineFactory } from './features/player/playback/engine'
import { Player } from './features/player/Player'
import { TopBar } from './features/shell/TopBar'
import { useI18n } from './i18n/locale'
import { useSenior } from './i18n/senior'
import { groupChannels } from './lib/channels'
import { useRoute } from './lib/route'
import stageArt from './assets/stage.svg'
import styles from './App.module.css'

/** Channels per page: a swipeable row layout fits more than the large one-column list. */
const PAGE_SIZE = 24
const SENIOR_PAGE_SIZE = 10

interface AppProps {
  /** Replaces the HLS engine; used by tests. */
  engineFactory?: EngineFactory
}

export function App({ engineFactory }: AppProps) {
  const { locale, t } = useI18n()
  const { senior } = useSenior()
  const channels = useChannels()
  const health = useHealth()
  const history = useHealthHistory()
  const requested = useRoute()
  const admin = useAdmin()
  // The dashboard is for administrators; anyone else asking for it gets the channels.
  const route = admin ? requested : 'channels'
  const [filter, setFilter] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [page, setPage] = useState(1)
  const wallTop = useRef<HTMLDivElement>(null)

  const unavailable = health.data?.unavailable ?? []
  const isUnavailable = selected !== null && unavailable.includes(selected.slug.toLowerCase())
  const pageSize = senior ? SENIOR_PAGE_SIZE : PAGE_SIZE
  const first = channels.data ? groupChannels(channels.data, '')[0]?.channels[0] : undefined

  return (
    <div
      className={styles.app}
      lang={locale}
      data-senior={senior}
      style={{ '--stage-art': `url("${stageArt}")` } as React.CSSProperties}
    >
      <title>{t('app.title')}</title>
      <TopBar
        health={health.data}
        failed={health.isError}
        lastSeenMs={health.dataUpdatedAt}
        route={route}
        admin={admin}
      />
      {route === 'dashboard' ? (
        <main className={styles.main}>
          <Dashboard
            health={health.data}
            failed={health.isError}
            lastSeenMs={health.dataUpdatedAt}
            history={history}
            channels={channels.data ?? []}
            now={health.dataUpdatedAt}
          />
        </main>
      ) : (
        <main className={styles.main}>
          <Player
            channel={selected}
            unavailable={isUnavailable}
            {...(first ? { onStart: () => setSelected(first) } : {})}
            onClose={() => setSelected(null)}
            {...(engineFactory ? { factory: engineFactory } : {})}
          />
          <div className={styles.content}>
            {channels.isPending && <p className={styles.note}>{t('app.loadingChannels')}</p>}
            {channels.isError && (
              <div className={styles.failure} role="alert">
                <p>{t('app.channelsFailed', { detail: channels.error.message })}</p>
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => void channels.refetch()}
                >
                  {t('app.tryAgain')}
                </button>
              </div>
          )}
          {channels.data && (
            <>
              <ChannelRail
                channels={channels.data}
                filter={filter}
                onFilterChange={(value) => {
                  setFilter(value)
                  setPage(1)
                }}
                group={group}
                onGroupChange={(value) => {
                  setGroup(value)
                  setPage(1)
                }}
              />
              <div ref={wallTop} className={styles.wallTop}>
                <ChannelWall
                  channels={channels.data}
                  filter={filter}
                  group={group}
                  selectedSlug={selected?.slug ?? null}
                  onSelect={setSelected}
                  onClear={() => {
                    setFilter('')
                    setGroup(null)
                    setPage(1)
                  }}
                  unavailable={unavailable}
                  layout={senior ? 'list' : 'rows'}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={(next) => {
                    setPage(next)
                    // Bring the top of the list back into view; the old page's end is off screen.
                    wallTop.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>
      )}
    </div>
  )
}
