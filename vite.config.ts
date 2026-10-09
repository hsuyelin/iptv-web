import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The console talks only to the relay's public routes. In development they are proxied
// to a locally running relay; in production the build is served by any static host (or
// by the relay itself through --web-dir) and can point elsewhere with VITE_RELAY_URL.
const relay = process.env['VITE_DEV_RELAY'] ?? 'http://127.0.0.1:8787'
const relayRoutes = ['/channels', '/health', '/live', '/segment', '/list.m3u']

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(relayRoutes.map((route) => [route, { target: relay }])),
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    env: { VITE_RELAY_URL: 'http://relay.test' },
  },
})
