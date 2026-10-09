<h1 align="center">iptv-web</h1>
<h3 align="center">The web console for iptv-rs</h3>

---

<p align="center">
<img alt="iptv-web" src="branding/banner.svg" width="560"/>
<br/>
<br/>
<a href="https://github.com/hsuyelin/iptv-web/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/hsuyelin/iptv-web.svg"/></a>
<a href="https://github.com/hsuyelin/iptv-web/commits/main"><img alt="Last Commit" src="https://img.shields.io/github/last-commit/hsuyelin/iptv-web.svg"/></a>
<a href="http://t.me/iptvorganization"><img alt="Chat on Telegram" src="https://img.shields.io/badge/chat-telegram-26A5E4?logo=telegram&logoColor=white"/></a>
<br/>
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white"/>
<img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black"/>
<img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white"/>
<img alt="hls.js" src="https://img.shields.io/badge/hls.js-HLS-E5484D"/>
<img alt="English" src="https://img.shields.io/badge/lang-English-555"/>
<img alt="简体中文" src="https://img.shields.io/badge/lang-简体中文-555"/>
<img alt="繁體中文" src="https://img.shields.io/badge/lang-繁體中文-555"/>
</p>

---

iptv-web is a modern web console for the [iptv-rs](https://github.com/hsuyelin/iptv-rs) relay: a channel browser, a live player and a relay dashboard. It only presents. Every piece of data comes from the relay's HTTP routes.

The interface is available in English, Simplified Chinese and Traditional Chinese, adapts from phones to wide screens, and includes a senior mode with larger type and a list layout.

It is one half of [iptv-vod](https://github.com/hsuyelin/iptv-vod), which builds and deploys it together with the relay.

<strong>Want to get started?</strong><br/>
Follow the deployment guide in <a href="https://github.com/hsuyelin/iptv-vod#readme">iptv-vod</a>, or <a href="#running-the-console">run it from source</a>.<br/>

<strong>Something not working right?</strong><br/>
Open an <a href="https://github.com/hsuyelin/iptv-web/issues">Issue</a> on GitHub.<br/>

<strong>Want to contribute?</strong><br/>
Read <a href="#development">Development</a>, then open a pull request. Commits follow <a href="https://www.conventionalcommits.org">Conventional Commits</a>.<br/>

<strong>Questions or ideas?</strong><br/>
Join the community on <a href="http://t.me/iptvorganization">Telegram</a>.<br/>

---

## Development

### Prerequisites

- Node.js 20 or newer
- [just](https://github.com/casey/just)
- A running [iptv-rs](https://github.com/hsuyelin/iptv-rs) relay, by default on `http://127.0.0.1:8787`

### Cloning the Repository

```bash
git clone https://github.com/hsuyelin/iptv-web.git
cd iptv-web
npm ci
```

### Running the Console

```bash
npm run dev
```

The dev server proxies the relay routes to `VITE_DEV_RELAY` (default `http://127.0.0.1:8787`).

### Building

```bash
npm run build
```

Set `VITE_RELAY_URL=https://relay.example.com` to host the console apart from the relay. Leave it unset when both share an origin.

### Verifying Changes

```bash
just all      # lint, typecheck, test, build, names
just shots    # Playwright screenshots and layout checks
```

## Acknowledgements

Thanks to the community and the authors of the original relay project. Join the discussion in the Telegram group: <http://t.me/iptvorganization>.

Thanks also to the maintainers of React, Vite, TanStack Query, hls.js and the other open-source projects used here.
