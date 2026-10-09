import { useState } from 'react'
import { useChannels, useHealth } from './api/queries'
import type { Channel } from './api/types'
import { ChannelRail } from './features/channels/ChannelRail'
import { ChannelWall } from './features/channels/ChannelWall'
import { HealthStrip } from './features/health/HealthStrip'
import type { EngineFactory } from './features/player/playback/engine'
import { Player } from './features/player/Player'
import { useTheme } from './theme/useTheme'
import styles from './App.module.css'

interface AppProps {
  /** Replaces the HLS engine; used by tests. */
  engineFactory?: EngineFactory
}

export function App({ engineFactory }: AppProps) {
  const channels = useChannels()
  const health = useHealth()
  const { theme, toggle } = useTheme()
  const [filter, setFilter] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [selected, setSelected] = useState<Channel | null>(null)

  const unavailable = health.data?.unavailable ?? []
  const isUnavailable = selected !== null && unavailable.includes(selected.slug.toLowerCase())

  return (
    <div className={styles.app} style={{ colorScheme: theme }}>
      <HealthStrip
        health={health.data}
        failed={health.isError}
        lastSeenMs={health.dataUpdatedAt}
        themeLabel={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
        onToggleTheme={toggle}
      />
      <main className={styles.main}>
        <div className={styles.player}>
          <Player
            channel={selected}
            unavailable={isUnavailable}
            {...(engineFactory ? { factory: engineFactory } : {})}
          />
        </div>
        {channels.isPending && <p className={styles.note}>Loading channels…</p>}
        {channels.isError && (
          <div className={styles.failure} role="alert">
            <p>Cannot load the channel list. {channels.error.message}</p>
            <button type="button" className={styles.retry} onClick={() => void channels.refetch()}>
              Try again
            </button>
          </div>
        )}
        {channels.data && (
          <>
            <div className={styles.rail}>
              <ChannelRail
                channels={channels.data}
                filter={filter}
                onFilterChange={setFilter}
                group={group}
                onGroupChange={setGroup}
              />
            </div>
            <div className={styles.wall}>
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
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
