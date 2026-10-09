# iptv-web

React 19 + TypeScript web console for the `iptv-rs` relay: channel browser, live player and
relay health. It only presents; all data comes from the relay's HTTP routes.

- Languages: 简体中文, 繁體中文 and English; the first visit follows the browser, later visits the
  saved choice.
- Senior mode (长辈模式): larger type and controls, and one large list instead of swipeable rows.
- Paged channel list (24 per page, 10 in senior mode) instead of one very long screen.
- Floating player: when the main player scrolls out of view the same video lifts into a corner
  window (back-to-player and close buttons) and drops back when the player is visible again.
  It is one `<video>`, so the stream never plays twice.
- Dark, cinema-style theme with translucent glass layers; responsive from phones to wide screens.

Part of [iptv-vod](https://github.com/hsuyelin/iptv-vod), which holds build and deployment instructions.

```sh
npm ci
npm run dev    # proxies relay routes to http://127.0.0.1:8787 (VITE_DEV_RELAY)
just all       # lint, typecheck, test, build, names
just shots     # Playwright screenshots and layout checks (see justfile)
```

Build with `VITE_RELAY_URL=https://relay.example.com` to host the console apart from the
relay; leave it unset when both share an origin. Direct DOM access is allowed only in
`src/features/player/playback/`.
