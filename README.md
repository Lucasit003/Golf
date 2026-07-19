# Setji's Swings

**▶︎ Open the app: https://golf-two-beta.vercel.app**

![CI](https://github.com/Lucasit003/Golf/actions/workflows/ci.yml/badge.svg)

Golf swing analysis in the browser. Film a swing, get it surveyed — measured
against tour benchmarks and drawn back over your own footage.

The analysis runs entirely on-device — your footage stays in the browser.
Sharing a swing to the community library is a separate, opt-in choice.

## Run it

```bash
npm install
npm run dev       # dev server
npm run build     # type-check + production build
npm test          # unit tests (Vitest)
```

Node 20+. The MediaPipe WASM runtime is copied out of the installed package into
`public/` automatically before dev/build; the pose model is committed under
`public/models/`.

## What's built

The visible product is the **M0 shell** plus the groundwork for measurement:

- **Landing** — the yardage-book design system, the self-drawing hand-trace, the
  sourced tour-benchmark set, an interactive in/close/off scoring demo, and
  scroll-driven motion.
- **Survey** — upload a swing, play it back, and study it with a measuring-stick
  scrub, frame-stepping, and ½/¼/0.1× slow motion.
- **Compare** — two clips side by side on one shared playhead, in slow motion.
  Both stay on the device (see the video-comparison rules in `DATA_AND_LEGAL`).
- **Foundation** — a tested pure vector/geometry library, the landmark enum, the
  core `PoseFrame`/`Swing`/`Metric` types, and the in/close/off comparison
  scoring, all with unit tests.
- **M1 plumbing (not yet validated)** — a MediaPipe `PoseLandmarker` wrapper and
  a frame-by-frame extraction loop, ready to run against real footage.

Not built yet: actual pose measurement of a real swing (M1's exit test), event
detection (M2), the metric set (M3), the reference overlay (M4). No swing is ever
faked — an empty readout is honest; a plausible one isn't.

## Layout

```
src/
  app/        shell, view switching
  pages/      landing
  capture/    upload + slow-mo, compare studio, scrub bar
  components/ hand-trace, topo field, flagstick, metric rows, scoring, ...
  design/     tokens.css, Button
  lib/        pure helpers — vec.ts (math), compare.ts (scoring)  [tested]
  pose/       landmark enum, types, landmarker + extraction loop, mapping [tested]
public/
  models/     pose_landmarker .task  (committed)
  mediapipe/  wasm runtime  (copied at build time, gitignored)
tools/        screenshot harness, artifact bundler, wasm copy
docs/         ROADMAP, ARCHITECTURE, DESIGN, SWING_SPEC, DATA_AND_LEGAL
.claude/skills/  swing biomechanics math, WHS handicap math
```

## The docs

- `CLAUDE.md` — how to work on this project. Read first.
- `docs/ROADMAP.md` — milestones, one at a time.
- `docs/ARCHITECTURE.md` — stack and structure.
- `docs/DESIGN.md` — the visual direction (every color and font).
- `docs/SWING_SPEC.md` — pose data, the metric catalog, event detection.
- `docs/DATA_AND_LEGAL.md` — where reference swings come from, and the rules for
  video comparison.

## Status

M0 shell is up, with the measurement foundation laid and tested. Next is **M1 —
pose extraction**: does the skeleton track a real body through the downswing? The
plumbing is in place; it needs real footage to find out.
