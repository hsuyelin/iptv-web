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

iptv-web is a web console for the [iptv-rs](https://github.com/hsuyelin/iptv-rs) relay: a channel browser, a live player and a relay dashboard, in English, Simplified Chinese and Traditional Chinese. It only presents; every piece of data comes from the relay's HTTP routes. It is one half of [iptv-vod](https://github.com/hsuyelin/iptv-vod), which ships it inside the relay.

<strong>Want to get started?</strong><br/>
Run it with Docker or the binary as described in <a href="https://github.com/hsuyelin/iptv-vod#readme">iptv-vod</a>.<br/>

<strong>Something not working right?</strong><br/>
Open an <a href="https://github.com/hsuyelin/iptv-web/issues">Issue</a> on GitHub.<br/>

<strong>Questions or ideas?</strong><br/>
Join the community on <a href="http://t.me/iptvorganization">Telegram</a>.<br/>

---

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `VITE_RELAY_URL` | unset | Relay address when the console is hosted apart from it; leave unset when both share an origin |
| `VITE_DEV_RELAY` | `http://127.0.0.1:8787` | Relay that the development server proxies to |

## Acknowledgements

Thanks to the community and the authors of the original relay project. Join the discussion in the Telegram group: <http://t.me/iptvorganization>.

Thanks also to the maintainers of React, Vite, TanStack Query, hls.js and the other open-source projects used here.
