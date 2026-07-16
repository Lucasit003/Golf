/*
 * build-artifact.mjs — package the built app into ONE self-contained HTML file.
 *
 * Inlines the Vite CSS + JS bundles and embeds the web fonts as data URIs, so
 * the page has zero external dependencies and renders faithfully anywhere (and
 * inside a strict-CSP Artifact, which blocks font CDNs). Output is body content
 * only — no <html>/<head>/<body> — ready to hand to the Artifact tool.
 *
 * Run `npm run build` first, then `node tools/build-artifact.mjs <outfile>`.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'dist')
const out = process.argv[2] || join(here, '..', 'contour-artifact.html')

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@115..125,600..700&family=Public+Sans:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function embedFonts() {
  const res = await fetch(FONT_CSS_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`font css fetch failed: ${res.status}`)
  const css = await res.text()

  // Google returns one @font-face per unicode subset, each preceded by a
  // /* subset */ comment. Keep only the latin subsets to hold the size down.
  const blocks = css.split('/*').map((b) => '/*' + b)
  const kept = []
  for (const b of blocks) {
    if (!b.includes('@font-face')) continue
    if (!/\/\*\s*latin\s*\*\//.test(b)) continue // latin + latin-ext excluded → smallest
    kept.push(b)
  }

  let embedded = ''
  for (const block of kept) {
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)
    if (!urlMatch) continue
    const woff2 = await fetch(urlMatch[1], { headers: { 'User-Agent': UA } })
    const buf = Buffer.from(await woff2.arrayBuffer())
    const dataUri = `data:font/woff2;base64,${buf.toString('base64')}`
    embedded += block.replace(urlMatch[1], dataUri).trim() + '\n'
  }
  return embedded
}

function readAsset(ext) {
  const dir = join(dist, 'assets')
  const file = readdirSync(dir).find((f) => f.endsWith(ext))
  if (!file) throw new Error(`no ${ext} asset in dist/assets`)
  return readFileSync(join(dir, file), 'utf8')
}

async function main() {
  const fonts = await embedFonts()
  const css = readAsset('.css')
  const js = readAsset('.js')

  // Body content only. Fonts + app CSS in a <style>, the mount point, then the
  // bundled app as an inline module. No external requests at runtime.
  const html = `<style>
/* ── Embedded fonts (latin) ─────────────────────────── */
${fonts}
/* ── App styles ─────────────────────────────────────── */
${css}
</style>

<div id="root"></div>

<script type="module">
${js}
</script>`

  writeFileSync(out, html)
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0)
  console.log(`wrote ${out} (${kb} KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
