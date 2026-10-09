<p align="center">
<img alt="iptv-web" src="branding/banner.svg" width="560"/>
<br/>
<br/>
<a href="https://github.com/hsuyelin/iptv-web/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/hsuyelin/iptv-web.svg"/></a>
<a href="https://github.com/hsuyelin/iptv-web/commits/main"><img alt="Last Commit" src="https://img.shields.io/github/last-commit/hsuyelin/iptv-web.svg"/></a>
<a href="https://github.com/hsuyelin/iptv-web/actions/workflows/ci.yaml"><img alt="CI" src="https://github.com/hsuyelin/iptv-web/actions/workflows/ci.yaml/badge.svg"/></a>
<br/>
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white"/>
<img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black"/>
</p>

---

iptv-web is a web console for the [iptv-rs](https://github.com/hsuyelin/iptv-rs) relay: a channel browser, a live player and a relay dashboard, in English, Simplified Chinese and Traditional Chinese. It only presents; every piece of data comes from the relay's HTTP routes. It is one half of [iptv-vod](https://github.com/hsuyelin/iptv-vod), which ships it inside the relay.

---

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `VITE_RELAY_URL` | unset | Relay address when the console is hosted apart from it; leave unset when both share an origin |
| `VITE_DEV_RELAY` | `http://127.0.0.1:8787` | Relay that the development server proxies to |

Page address options:

| Option | Meaning |
|---|---|
| `?compat=1` | Ask the relay for its lighter stream (`?profile=compat`), whatever the device |
| `?compat=0` | Ask for the normal stream, even on a device that would get the lighter one |

Without either, iPhones and iPads older than iOS 16 get the lighter stream and everything else the normal one. A relay that has no encoder serves the normal stream either way.

## Acknowledgements

Thanks to the community and the authors of the original relay project. Join the discussion in the Telegram group: <http://t.me/iptvorganization>.

Thanks also to the maintainers of React, Vite, TanStack Query, hls.js and the other open-source projects used here.
