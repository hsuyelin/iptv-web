import { useState } from 'react'
import { useChannels, useHealth } from './api/queries'
import type { Channel } from './api/types'
import { ChannelRail } from './features/channels/ChannelRail'
import { ChannelWall } from './features/channels/ChannelWall'
import { RelayStats } from './features/health/RelayStats'
import type { EngineFactory } from './features/player/playback/engine'
import { Player } from './features/player/Player'
import { TopBar } from './features/shell/TopBar'
import { useI18n } from './i18n/locale'
import { useSenior } from './i18n/senior'
import { groupChannels } from './lib/channels'
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
  const [filter, setFilter] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [selected, setSelected] = useState<Channel | null>(null)

  const unavailable = health.data?.unavailable ?? []
  const isUnavailable = selected !== null && unavailable.includes(selected.slug.toLowerCase())
  const first = channels.data ? groupChannels(channels.data, '')[0]?.channels[0] : undefined

  return (
    <div
      className={styles.app}
      lang={locale}
      data-senior={senior}
      style={{ '--stage-art': `url("${stageArt}")` } as React.CSSProperties}
    >
      <title>{t('app.title')}</title>
      <TopBar health={health.data} failed={health.isError} lastSeenMs={health.dataUpdatedAt} />
      <main className={styles.main}>
        <Player
          channel={selected}
          unavailable={isUnavailable}
          {...(first ? { onStart: () => setSelected(first) } : {})}
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
                onFilterChange={setFilter}
                group={group}
                onGroupChange={setGroup}
              />
              <ChannelWall
                channels={channels.data}
                filter={filter}
                group={group}
                selectedSlug={selected?.slug ?? null}
                onSelect={setSelected}
                onClear={() => {
                  setFilter('')
                  setGroup(null)
                }}
                unavailable={unavailable}
                layout={senior ? 'list' : 'rows'}
              />
            </>
          )}
          <RelayStats health={health.data} stale={health.isError} />
        </div>
      </main>
    </div>
  )
}
