import { useState } from 'react'
import { useAdmin, useChannels, useHealth, useHealthHistory } from './api/queries'
import type { Channel } from './api/types'
import { ChannelSkeleton } from './features/channels/ChannelSkeleton'
import { ChannelWall } from './features/channels/ChannelWall'
import { Dashboard } from './features/dashboard/Dashboard'
import type { EngineFactory } from './features/player/playback/engine'
import { Player, type StageStatus } from './features/player/Player'
import { TopBar } from './features/shell/TopBar'
import {
  DeniedPage,
  LockedPage,
  NotFoundPage,
  UnavailablePage,
} from './features/status/pages'
import { useI18n } from './i18n/locale'
import { useSenior } from './i18n/senior'
import { isUnknownPath, useRoute, type Route } from './lib/route'
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
  const isAdmin = admin.status === 'granted'
  // Until the relay has ruled on the key in the address, or when it refused it, nothing of
  // the console may start: no stream, no list.
  const waitingOnKey = admin.status === 'checking'
  const refused = admin.status === 'denied' || admin.status === 'locked'
  // The dashboard is for administrators; anyone else asking for it gets the channels.
  const route: Route = isAdmin && requested === 'dashboard' ? 'dashboard' : 'channels'
  const unknownPage = requested === 'notfound' || isUnknownPath(window.location.pathname)
  const [chosen, setChosen] = useState<Channel | null>(null)
  // Whether the page has already opened on a channel: closing the player must not undo it.
  const [opened, setOpened] = useState(false)

  const unavailable = health.data?.unavailable ?? []
  const first = waitingOnKey || refused ? undefined : channels.data?.[0]
  // The page opens on the first channel, once. It is then a plain choice, so a reload of the
  // list can neither swap the stream under the viewer nor restart it after it was closed.
  if (!opened && first) {
    setOpened(true)
    setChosen(first)
  }
  const selected = chosen
  const isUnavailable = selected !== null && unavailable.includes(selected.slug.toLowerCase())
  const loading = waitingOnKey || channels.isPending
  const stage: StageStatus = loading
    ? 'loading'
    : (channels.data?.length ?? 0) === 0
      ? 'none'
      : 'idle'

  const page = () => {
    if (admin.status === 'denied') return <DeniedPage />
    if (admin.status === 'locked') return <LockedPage retryAfterSecs={admin.retryAfterSecs} />
    if (unknownPage) return <NotFoundPage />
    if (route === 'dashboard') {
      return (
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
      )
    }
    // Nothing to list and the relay will not say why: the service is down, not just empty.
    if (channels.isError && !channels.data) {
      return (
        <UnavailablePage
          detail={channels.error.message}
          onRetry={() => void channels.refetch()}
        />
      )
    }
    return (
      <main className={styles.main}>
        <Player
          channel={selected}
          channels={channels.data ?? []}
          onSelect={setChosen}
          unavailable={isUnavailable}
          {...(first ? { onStart: () => setChosen(first) } : {})}
          status={stage}
          onRefresh={() => void channels.refetch()}
          onClose={() => setChosen(null)}
          {...(engineFactory ? { factory: engineFactory } : {})}
        />
        <div className={styles.content}>
          {loading && <ChannelSkeleton layout={senior ? 'list' : 'rows'} />}
          {!loading && channels.data && channels.data.length > 0 && (
            <ChannelWall
              channels={channels.data}
              selectedSlug={selected?.slug ?? null}
              onSelect={setChosen}
              unavailable={unavailable}
              layout={senior ? 'list' : 'rows'}
            />
          )}
        </div>
      </main>
    )
  }

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
        admin={isAdmin}
      />
      {page()}
    </div>
  )
}
