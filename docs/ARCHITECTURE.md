# Architecture

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite | Fast, no config, handles the WASM assets MediaPipe needs |
| UI | React + TypeScript | Types matter here — pose data is a deep nested structure and a wrong index is a silent bug |
| Pose | `@mediapipe/tasks-vision` | Runs in-browser, no server, no upload of user video anywhere |
| Styling | Plain CSS with custom properties | The design in `DESIGN.md` is specific. Utility frameworks push toward defaults. |
| State | React state + context | There is no backend. Do not add a state library. |
| Backend | None | Through M4, everything runs client-side. Video never leaves the device — that's a real privacy feature, say so in the UI. |

Node 20+.

## Scaffold

If the project doesn't exist yet:

```bash
npm create vite@latest . -- --template react-ts
npm install @mediapipe/tasks-vision
```

The pose model (`.task` file) goes in `public/models/`. Download it and commit it —
don't fetch from a CDN at runtime. A model that disappears mid-demo is a bad day.

## Structure

```
src/
  app/            routes, layout, top-level state
  design/         tokens.css, primitives (Button, Field, Readout)
  capture/        upload, video element, scrub bar
  pose/           mediapipe wrapper, extraction loop, types
  metrics/        event detection, angle math, benchmarks
  reference/      reference skeleton data + fitting (M4)
  lib/            pure helpers, no React
public/
  models/         pose_landmarker .task file
docs/
.claude/skills/
```

Rules:

- `pose/` and `metrics/` are **pure TypeScript**. No React imports. They take arrays and
  return arrays. This is what makes them testable, and they must be tested.
- `design/` owns every color and font. If a hex code appears anywhere else, that's a bug.
- `lib/` is for functions with no domain knowledge. Vector math lives here.

## Data flow

```
video file
   → HTMLVideoElement
   → frame walker (seek, wait, detect, repeat)
   → PoseFrame[]                  ← the core data structure, see SWING_SPEC.md
   → event detection → SwingEvents
   → metric functions → Metric[]
   → UI
```

`PoseFrame[]` is the spine of the app. Everything downstream is a pure function of it.
Get it right.

## Testing

Vitest. Test the pure modules, not the UI.

The important tests are **fixtures, not units**: save a real `PoseFrame[]` from one of
Lucas's swings to a JSON file, commit it, and assert that event detection finds the right
frames in it. When event detection breaks — and it will — that fixture is what tells you.

Add a fixture for every swing that breaks something.

## Performance

Extraction on a 240fps video is thousands of `detectForVideo` calls. This is slow and
that is fine — it's a one-time cost per upload with a progress bar. Do not optimize it
before it's correct.

Do not run detection on every frame of playback. Extract once, store, then render from
the stored array while scrubbing.

## Things not to do

- No CSS framework
- No state management library
- No backend, no accounts, no uploads (through M4)
- No component library — the design is too specific and you'll spend more time fighting
  it than writing it
