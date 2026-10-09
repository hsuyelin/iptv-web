import '@fontsource-variable/inter'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createQueryClient } from './api/queries'
import { loadMissingApis } from './lib/polyfills'
import './theme/tokens.css'
import './theme/global.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('The page has no #root element')
}

// The page cannot ask the relay for anything before fetch and AbortController exist.
void loadMissingApis().then(() => {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
})
