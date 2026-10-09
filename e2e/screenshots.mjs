// Layout check with Playwright: screenshots at phone, tablet and desktop sizes, plus two
// automatic checks per shot: no horizontal page overflow, and every control on screen is
// the topmost element at its own centre (so nothing is covered by something else).
//
//   BASE_URL=http://127.0.0.1:8787 node e2e/screenshots.mjs [outDir]
//
// The URL must serve the built console together with a running relay.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
const out = process.argv[2] ?? 'e2e/shots'
mkdirSync(out, { recursive: true })

const viewports = [
  { name: 'phone-small', width: 360, height: 740, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet-portrait', width: 820, height: 1180, mobile: true },
  { name: 'tablet-landscape', width: 1180, height: 820, mobile: true },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
]

const scenarios = [
  { name: 'empty', locale: 'en', senior: false, play: false },
  { name: 'playing', locale: 'zh-CN', senior: false, play: true },
  { name: 'tc', locale: 'zh-TW', senior: false, play: false },
  { name: 'senior', locale: 'zh-CN', senior: true, play: true, full: false },
]

/** Runs in the page: returns problems found in the current layout. */
function audit() {
  const problems = []
  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth + 1) {
    problems.push(`page scrolls sideways: ${root.scrollWidth} > ${root.clientWidth}`)
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return (
      r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
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
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)
    const top = document.elementFromPoint(x, y)
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

const browser = await chromium.launch()
let failures = 0
for (const viewport of viewports) {
  for (const scenario of scenarios) {
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
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.waitForSelector('section[aria-label] button, [role="alert"]', { timeout: 15000 })
    if (scenario.play) {
      await page.locator('section[aria-label] button[aria-pressed]').first().click()
      await page.waitForTimeout(6000)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    const problems = await page.evaluate(audit)
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
