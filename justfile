default:
    @just --list

install:
    npm ci

dev:
    npm run dev

lint:
    npm run lint

typecheck:
    npm run typecheck

test:
    npm test

# Static files in dist/.
build:
    npm run build

# No Service Locator vocabulary; `QueryClientProvider` is TanStack Query's own API name.
names:
    ! grep -RniE --include='*.ts' --include='*.tsx' \
        -e 'resolv[a-z_]*|provider|locator|registry|container' src | grep -v 'QueryClientProvider'

audit:
    npm audit --omit=dev

all: lint typecheck test build names

# Playwright layout check at phone, tablet and desktop sizes. Needs a relay serving the
# built console: `BASE_URL=http://127.0.0.1:8787 just shots`. Screenshots go to e2e/shots/.
shots:
    npx playwright install chromium
    npm run shots
