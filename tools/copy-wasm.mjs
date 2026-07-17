/*
 * Copy the MediaPipe WASM runtime out of the installed package and into
 * public/, so the app serves it from its own origin instead of a CDN. Runs
 * automatically before dev/build (see package.json predev/prebuild).
 *
 * The pose *model* is committed (it must never disappear mid-demo — see
 * ARCHITECTURE). The WASM is a reproducible build artifact of an npm dep, so
 * it's copied here and gitignored rather than committed.
 */
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const dest = join(here, '..', 'public', 'mediapipe', 'wasm')

if (!existsSync(src)) {
  console.error('MediaPipe wasm not found — run `npm install` first.')
  process.exit(1)
}

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`copied MediaPipe wasm → ${dest}`)
