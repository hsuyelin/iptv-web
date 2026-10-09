import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformSync } from '@babel/core'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/**
 * The legacy plugin builds its polyfill chunk in a separate step whose bundler wraps every
 * core-js module in an arrow function. iOS 9 cannot parse arrow functions, and a polyfill
 * file that does not parse takes the whole legacy build down with it. Lower that one file
 * to ES5 once the bundle is written.
 */
function es5PolyfillChunk(): Plugin {
  let outDir = 'dist'
  return {
    name: 'iptv:es5-polyfill-chunk',
    apply: 'build',
    configResolved: (config) => {
      outDir = join(config.root, config.build.outDir)
    },
    closeBundle: () => {
      const assets = join(outDir, 'assets')
      for (const name of readdirSync(assets).filter((file) => /^polyfills-legacy.*\.js$/.test(file))) {
        const path = join(assets, name)
        const lowered = transformSync(readFileSync(path, 'utf8'), {
          babelrc: false,
          configFile: false,
          sourceType: 'script',
          compact: true,
          comments: false,
          presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]],
        })
        if (!lowered?.code) throw new Error(`Could not lower ${name} to ES5`)
        writeFileSync(path, lowered.code)
      }
    },
  }
}

// The console talks only to the relay's public routes. In development they are proxied
// to a locally running relay; in production the build is served by any static host (or
// by the relay itself through --web-dir) and can point elsewhere with VITE_RELAY_URL.
const relay = process.env['VITE_DEV_RELAY'] ?? 'http://127.0.0.1:8787'
const relayRoutes = ['/channels', '/health', '/live', '/segment', '/list.m3u', '/admin']

export default defineConfig({
  plugins: [
    react(),
    // A second, ES5 build of the console with the polyfills it needs, for browsers without
    // modules (iOS 9 and 10.0 and older). Newer browsers never download it.
    // `ie >= 11` makes Babel lower everything to plain ES5 (the plugin's own default): iOS 9
    // runs most of ES2015, but not arrow functions, and "most" is not a promise to rely on.
    legacy({ targets: ['ie >= 11', 'ios >= 9'] }),
    es5PolyfillChunk(),
  ],
  server: {
    proxy: Object.fromEntries(relayRoutes.map((route) => [route, { target: relay }])),
  },
  build: {
    sourcemap: false,
    // No `target` here: the legacy plugin sets the modern bundle's own, from `modernTargets`.
    // terser, not the default oxc: oxc rewrites the legacy (ES5) chunks back into template
    // literals and arrow functions, which iOS 9 cannot parse.
    minify: 'terser',
    // Keep the vendor prefixes iOS 9 needs (-webkit-sticky, -webkit-backdrop-filter) next to
    // the standard forms: the default CSS target is a modern Safari, which makes the
    // minifier drop the prefixes (and, with Safari 9 alone, the standard forms).
    cssTarget: ['safari9', 'chrome90', 'firefox100', 'edge90'],
    // hls.js (about 570 kB, 640 kB for old browsers) is already a chunk of its own, fetched only
    // when a channel is first played and never on iOS 9, which plays HLS itself. Nothing
    // loads at start-up because of it, so the 500 kB warning has nothing to say here.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      // Most of the build is the legacy bundle's Babel pass and terser, by design: say nothing.
      checks: { pluginTimings: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    env: { VITE_RELAY_URL: 'http://relay.test' },
  },
})
