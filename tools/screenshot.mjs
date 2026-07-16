/*
 * screenshot.mjs — a small capture harness for iterating on the UI.
 *
 * Boots a headless Chromium against the running dev/preview server and takes a
 * batch of shots across viewports and interaction states, plus a contact sheet
 * so you can eyeball everything at once.
 *
 * Usage:
 *   npm run preview -- --port 4173   # in one shell
 *   node tools/screenshot.mjs        # in another
 *
 * Options (env):
 *   URL=http://localhost:4173   base url
 *   OUT=./shots                 output directory
 *   ONLY=hero,upload            comma list of shot names to run (default: all)
 *
 * Playwright is resolved from the project if installed, otherwise from a global
 * install — so it needs no entry in package.json.
 */

import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

function loadPlaywright() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
  ]
  for (const c of candidates) {
    try {
      return require(c)
    } catch {
      /* try next */
    }
  }
  throw new Error('playwright not found — `npm i -D playwright` or install it globally')
}

const { chromium } = loadPlaywright()

const URL = process.env.URL ?? 'http://localhost:4173/'
const OUT = process.env.OUT ?? join(here, '..', 'shots')
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null

// Viewports we care about.
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1180, height: 800 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
}

// Scroll the whole page in steps so IntersectionObserver reveals fire, then
// return to the top. Without this a fullPage shot captures un-revealed content.
async function autoscroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const step = Math.round(window.innerHeight * 0.7)
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await sleep(220)
    }
    window.scrollTo(0, 0)
    await sleep(150)
  })
  await page.waitForTimeout(600)
}

// Scroll a section to the top of the viewport and capture just that frame.
const sectionShot = (selector) => async (page) => {
  await autoscroll(page) // reveal everything first
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (el) el.scrollIntoView({ block: 'start' })
  }, selector)
  await page.waitForTimeout(700)
}

// A shot is a page + a viewport + optional setup. fullPage grabs the whole
// scroll height; otherwise just the viewport. `after` runs page interactions.
const SHOTS = [
  { name: 'landing-desktop', view: 'desktop', fullPage: true, settle: 4200, scroll: true },
  { name: 'landing-laptop', view: 'laptop', fullPage: true, settle: 4200, scroll: true },
  { name: 'landing-tablet', view: 'tablet', fullPage: true, settle: 4200, scroll: true },
  { name: 'landing-mobile', view: 'mobile', fullPage: true, settle: 4200, scroll: true },
  { name: 'landing-hero-desktop', view: 'desktop', fullPage: false, settle: 4200 },
  { name: 'sec-how-desktop', view: 'desktop', fullPage: false, settle: 800, after: sectionShot('.how') },
  { name: 'sec-measures-desktop', view: 'desktop', fullPage: false, settle: 800, after: sectionShot('.measures') },
  { name: 'sec-scoring-desktop', view: 'desktop', fullPage: false, settle: 800, after: sectionShot('.scoring') },
  { name: 'sec-reference-desktop', view: 'desktop', fullPage: false, settle: 800, after: sectionShot('.reference') },
  { name: 'sec-cta-desktop', view: 'desktop', fullPage: false, settle: 800, after: sectionShot('.hole-cta') },
  {
    name: 'upload-empty-desktop',
    view: 'desktop',
    fullPage: false,
    settle: 800,
    after: async (page) => {
      await page.getByRole('button', { name: /upload a swing/i }).first().click()
      await page.waitForTimeout(700)
    },
  },
  {
    name: 'compare-desktop',
    view: 'desktop',
    fullPage: false,
    settle: 800,
    after: async (page) => {
      await page.getByRole('button', { name: /^compare$/i }).click()
      await page.waitForTimeout(600)
    },
  },
  {
    name: 'upload-empty-mobile',
    view: 'mobile',
    fullPage: true,
    settle: 800,
    after: async (page) => {
      await page.getByRole('button', { name: /upload a swing/i }).first().click()
      await page.waitForTimeout(700)
    },
  },
]

async function run() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME ||
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' ||
      undefined,
  })

  const done = []
  for (const shot of SHOTS) {
    if (ONLY && !ONLY.includes(shot.name)) continue
    const vp = VIEWPORTS[shot.view]
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(shot.settle ?? 1200)
    if (shot.scroll) await autoscroll(page)
    if (shot.after) await shot.after(page)
    const file = `${shot.name}.png`
    await page.screenshot({ path: join(OUT, file), fullPage: !!shot.fullPage })
    await ctx.close()
    done.push({ name: shot.name, file, view: shot.view })
    console.log('·', file)
  }

  await browser.close()
  writeContactSheet(done)
  console.log(`\n${done.length} shots → ${OUT}`)
  console.log(`contact sheet → ${join(OUT, 'index.html')}`)
}

// A simple contact sheet to scan every shot at once.
function writeContactSheet(shots) {
  const cards = shots
    .map(
      (s) => `
      <figure>
        <img src="./${s.file}" alt="${s.name}" loading="lazy" />
        <figcaption>${s.name} <span>${s.view}</span></figcaption>
      </figure>`,
    )
    .join('')
  const html = `<!doctype html><meta charset="utf-8">
<title>Contour — shots</title>
<style>
  body { margin:0; background:#16211c; color:#e7e9e0; font:14px/1.4 system-ui; padding:24px; }
  h1 { font-size:15px; letter-spacing:.1em; text-transform:uppercase; opacity:.7; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:20px; }
  figure { margin:0; }
  img { width:100%; display:block; border:1px solid #3a4640; border-radius:3px; background:#e7e9e0; }
  figcaption { padding-top:8px; font-family:ui-monospace,monospace; }
  figcaption span { opacity:.5; margin-left:8px; }
</style>
<h1>Contour — capture sheet · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</h1>
<div class="grid">${cards}</div>`
  writeFileSync(join(OUT, 'index.html'), html)
}

// List any stale shots the run didn't overwrite, as a heads-up.
try {
  run().then(() => {
    const files = readdirSync(OUT).filter((f) => f.endsWith('.png'))
    console.log(`(${files.length} png total in ${OUT})`)
  })
} catch (err) {
  console.error(err)
  process.exit(1)
}
