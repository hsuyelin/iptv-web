// Layout check with Playwright: screenshots at phone, tablet and desktop sizes, plus two
// automatic checks per shot: no horizontal page overflow, and every control on screen is
// the topmost element at its own centre (so nothing is covered by something else).
//
//   BASE_URL=http://127.0.0.1:8787 node e2e/screenshots.mjs [outDir]
//   ADMIN_KEY=<key the relay was started with> enables the administrator-mode scenarios.
//   ONLY='phone.*/floating' limits the run to matching viewport/scenario names.
//
// The URL must serve the built console together with a running relay.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
const out = process.argv[2] ?? 'e2e/shots'
const adminKey = process.env.ADMIN_KEY ?? ''
mkdirSync(out, { recursive: true })

const viewports = [
  { name: 'phone-small', width: 360, height: 740, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet-portrait', width: 820, height: 1180, mobile: true },
  { name: 'tablet-landscape', width: 1180, height: 820, mobile: true },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktop-short', width: 1280, height: 600 },
  { name: 'wide', width: 1920, height: 1080 },
]

const scenarios = [
  { name: 'empty', locale: 'en', senior: false, play: false },
  { name: 'playing', locale: 'zh-CN', senior: false, play: true },
  { name: 'tc', locale: 'zh-TW', senior: false, play: false },
  { name: 'senior', locale: 'zh-CN', senior: true, play: true, full: false },
  { name: 'dashboard', locale: 'en', senior: false, play: false, hash: '#/dashboard', wait: 11000 },
  { name: 'dashboard-senior', locale: 'zh-CN', senior: true, play: false, hash: '#/dashboard', full: false },
  { name: 'menu', locale: 'zh-TW', senior: false, play: false, menu: true, full: false },
  { name: 'broken-images', locale: 'en', senior: false, play: false, blockImages: true, full: false },
  // Standard visit (the plain address): no page tabs, controls at the right.
  // Administrator visit (the key in the path): tabs appear, nothing else moves.
  { name: 'admin', locale: 'en', senior: false, play: false, admin: true, full: false },
  { name: 'admin-dashboard', locale: 'zh-CN', senior: false, play: false, admin: true, hash: '#/dashboard' },
  { name: 'wrong-key', locale: 'en', senior: false, play: false, path: '/not-the-key-0000000000', full: false, only: ['phone'] },
  { name: 'page2', locale: 'en', senior: false, play: false, nextPage: true },
  { name: 'senior-page2', locale: 'zh-TW', senior: true, play: false, nextPage: true, full: false },
  // Playing, then scrolled until the player is out of view: the video floats.
  { name: 'floating', locale: 'en', senior: false, play: true, float: true, full: false },
  { name: 'floating-bottom', locale: 'zh-CN', senior: false, play: true, float: 'bottom', full: false },
]

/** Runs in the page: returns problems found in the current layout. */
function audit(allowFloatingOverlap) {
  const problems = []
  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth + 1) {
    problems.push(`page scrolls sideways: ${root.scrollWidth} > ${root.clientWidth}`)
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return (
      r.width > 0 &&
      r.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      // Row arrows fade in on hover; while invisible they cannot be obscured.
      style.opacity !== '0'
    )
  }
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  for (const el of document.querySelectorAll('header button, header [role="status"], input, main > section video')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.left < -0.5 || r.right > root.clientWidth + 0.5) {
      problems.push(`outside the viewport: ${describe(el)} ${Math.round(r.left)}..${Math.round(r.right)}`)
    }
  }
  // Controls that are on screen must be reachable at their centre.
  for (const el of document.querySelectorAll('header button, input[type="search"], aside button, section button')) {
    if (!visible(el) || inScroller(el)) continue
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > innerHeight) continue
    // Content scrolling under the sticky bar is normal, not an obscured control.
    const bar = document.querySelector('header')?.getBoundingClientRect()
    if (bar && r.top + r.height / 2 < bar.bottom && !el.closest('header')) continue
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)
    const top = document.elementFromPoint(x, y)
    // While the player floats it lies over whatever scrolls beneath it, by design. The
    // check at the end of the page keeps it strict: there, nothing may be under the window.
    if (allowFloatingOverlap && top?.closest('[data-floating="true"]')) continue
    if (top && top !== el && !el.contains(top) && !top.contains(el)) {
      problems.push(`covered: ${describe(el)} by ${describe(top)}`)
    }
  }
  // Text must not spill out of its own box.
  for (const el of document.querySelectorAll('h1, h2, p, dt, dd, button')) {
    if (!visible(el)) continue
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'visible') {
      problems.push(`text overflows: ${describe(el)}`)
    }
  }
  return problems

  function describe(el) {
    const label = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 24) || ''
    return `<${el.tagName.toLowerCase()}> ${label}`
  }
}

const standardMetrics = new Map()

/** Runs in the page: where the bar's parts are. */
function headerMetrics() {
  const header = document.querySelector('header')
  const box = (el) => el.getBoundingClientRect()
  const buttons = [...header.querySelectorAll('button')]
  const last = buttons[buttons.length - 1]
  return {
    height: Math.round(box(header).height),
    brandLeft: Math.round(box(header.querySelector('h1')).left),
    controlsRight: Math.round(box(last).right),
    tabs: header.querySelectorAll('nav a').length,
  }
}

/** Runs in the page while the video should be floating. */
function floatingChecks() {
  const problems = []
  const videos = [...document.querySelectorAll('video')]
  if (videos.length !== 1) problems.push(`expected one video, found ${videos.length}`)
  const playing = videos.filter((video) => !video.paused && !video.ended).length
  if (playing > 1) problems.push(`${playing} videos playing at once`)
  const floating = document.querySelector('[data-floating="true"]')
  if (!floating) {
    // Tall screens may not scroll far enough to hide the player; then staying put is right.
    const slot = document.querySelector('[data-floating="false"]')?.parentElement
    if (slot) {
      const r = slot.getBoundingClientRect()
      const shown = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 72))
      if (shown / r.height >= 0.25) return problems
    }
    return [...problems, 'no floating window while the player is out of view']
  }
  const r = floating.getBoundingClientRect()
  if (r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) {
    problems.push(`floating window outside the viewport: ${JSON.stringify(r)}`)
  }
  if (r.width > innerWidth * 0.7 + 1 && innerWidth > 600) problems.push('floating window too wide')
  if (floating.querySelectorAll('button').length < 2) problems.push('floating controls missing')
  for (const button of floating.querySelectorAll('button')) {
    const b = button.getBoundingClientRect()
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    if (top !== button && !button.contains(top)) problems.push('a floating control is covered')
  }
  return problems
}

const browser = await chromium.launch()
let failures = 0
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null
for (const viewport of viewports) {
  for (const scenario of scenarios) {
    if (only && !only.test(`${viewport.name}/${scenario.name}`)) continue
    if (scenario.admin && adminKey === '') continue
    if (scenario.only && !scenario.only.includes(viewport.name)) continue
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.mobile === true && viewport.width < 900,
      hasTouch: viewport.mobile === true,
      locale: scenario.locale,
    })
    await context.addInitScript(
      ([senior]) => {
        if (senior) localStorage.setItem('iptv-web-senior', 'on')
      },
      [scenario.senior],
    )
    const page = await context.newPage()
    if (scenario.blockImages) await page.route(/\.(png|jpg|jpeg|webp|gif)(\?.*)?$/, (route) => route.abort())
    const path = scenario.admin ? `/${adminKey}` : (scenario.path ?? '')
    await page.goto(base + path + (scenario.hash ?? ''), { waitUntil: 'networkidle' })
    await page.waitForSelector(
      scenario.hash ? 'main h2' : 'section[aria-label] button, [role="alert"]',
      { timeout: 15000 },
    )
    if (scenario.admin) await page.waitForSelector('header nav', { timeout: 15000 })
    if (scenario.wait) await page.waitForTimeout(scenario.wait)
    if (scenario.menu) {
      await page.locator('header button[aria-haspopup="menu"]').click()
      await page.waitForTimeout(300)
    }
    if (scenario.play) {
      await page.locator('section[aria-label] button[aria-pressed]').first().click()
      await page.waitForTimeout(6000)
    }
    if (scenario.nextPage) {
      await page.locator('nav:has(ol) button').last().click()
      await page.waitForTimeout(700)
    }
    if (!scenario.float) await page.evaluate(() => window.scrollTo(0, 0))
    const extra = []
    const metrics = await page.evaluate(headerMetrics)
    const tabsShown = metrics.tabs > 0
    if (scenario.admin && !tabsShown) extra.push('administrator mode shows no tabs')
    if (!scenario.admin && tabsShown) extra.push('a standard visit shows page tabs')
    if (scenario.name === 'empty') standardMetrics.set(viewport.name, metrics)
    if (scenario.name === 'admin') {
      const standard = standardMetrics.get(viewport.name)
      if (standard) {
        // The controls must sit where they sit without tabs; on wide screens the bar
        // must not grow either. (On phones the tabs take their own row, by design.)
        if (Math.abs(standard.controlsRight - metrics.controlsRight) > 1) {
          extra.push(`controls moved: ${standard.controlsRight} -> ${metrics.controlsRight}`)
        }
        if (Math.abs(standard.brandLeft - metrics.brandLeft) > 1) {
          extra.push(`brand moved: ${standard.brandLeft} -> ${metrics.brandLeft}`)
        }
        if (viewport.width > 640 && Math.abs(standard.height - metrics.height) > 1) {
          extra.push(`bar height changed: ${standard.height} -> ${metrics.height}`)
        }
      }
    }
    if (scenario.menu) {
      const box = await page.locator('[role="menu"]').boundingBox()
      if (!box || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width) {
        extra.push(`language menu outside the viewport: ${JSON.stringify(box)}`)
      }
      const items = await page.locator('[role="menuitemradio"]').count()
      if (items !== 3) extra.push(`expected 3 languages, found ${items}`)
    }
    if (scenario.blockImages) {
      // Pictures still waiting to load lazily are fine; one that failed must be swapped out.
      const state = await page.evaluate(() => ({
        placeholders: document.querySelectorAll('svg[data-placeholder]').length,
        brokenShown: [...document.querySelectorAll('img')].filter(
          (img) => img.complete && img.naturalWidth === 0,
        ).length,
      }))
      if (state.placeholders === 0 || state.brokenShown > 0) {
        extra.push(`broken pictures were not replaced: ${JSON.stringify(state)}`)
      }
    }
    if (scenario.float) {
      await page.evaluate((bottom) => {
        window.scrollTo(0, bottom ? document.documentElement.scrollHeight : innerHeight * 1.3)
      }, scenario.float === 'bottom')
      await page.waitForTimeout(900)
      if (scenario.float === 'bottom') {
        // The window adds room at the end of the page; scroll to the real end again.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await page.waitForTimeout(500)
      }
      extra.push(...(await page.evaluate(floatingChecks)))
      if (scenario.float === true) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(600)
        const back = await page.evaluate(() => ({
          floating: document.querySelectorAll('[data-floating="true"]').length,
          videos: document.querySelectorAll('video').length,
        }))
        if (back.floating !== 0 || back.videos !== 1) {
          extra.push(`back at the top: ${JSON.stringify(back)}`)
        }
        await page.evaluate(() => window.scrollTo(0, innerHeight * 1.3))
        await page.waitForTimeout(600)
      }
    }
    await page.waitForTimeout(400)
    const problems = [...(await page.evaluate(audit, scenario.float === true)), ...extra]
    const file = join(out, `${viewport.name}-${scenario.name}.png`)
    await page.screenshot({ path: file, fullPage: scenario.full !== false })
    console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} ${viewport.name}/${scenario.name}`)
    for (const problem of problems) console.log(`       ${problem}`)
    failures += problems.length
    await context.close()
  }
}
await browser.close()
process.exit(failures === 0 ? 0 : 1)
