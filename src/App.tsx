import { useState } from 'react'
import { useAdmin, useChannels, useHealth, useHealthHistory } from './api/queries'
import type { Channel } from './api/types'
import { ChannelWall } from './features/channels/ChannelWall'
import { Dashboard } from './features/dashboard/Dashboard'
import type { EngineFactory } from './features/player/playback/engine'
import { Player } from './features/player/Player'
import { TopBar } from './features/shell/TopBar'
import { useI18n } from './i18n/locale'
import { useSenior } from './i18n/senior'
import { useRoute } from './lib/route'
import stageArt from './assets/stage.svg'
import styles from './App.module.css'

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
  const [selected, setSelected] = useState<Channel | null>(null)

  const unavailable = health.data?.unavailable ?? []
  const isUnavailable = selected !== null && unavailable.includes(selected.slug.toLowerCase())
  const first = channels.data?.[0]

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
            channels={channels.data ?? []}
            onSelect={setSelected}
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
            <ChannelWall
              channels={channels.data}
              selectedSlug={selected?.slug ?? null}
              onSelect={setSelected}
              unavailable={unavailable}
              layout={senior ? 'list' : 'rows'}
            />
          )}
        </div>
      </main>
      )}
    </div>
  )
}
