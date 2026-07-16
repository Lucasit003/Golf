# Contour

Golf swing analysis in the browser. A user films their swing, we extract pose data,
measure it, and compare it against tour biomechanical benchmarks — with a reference
skeleton overlaid on their own video.

Working name. Change it if something better shows up.

---

## Read these before you write code

| File | When |
| --- | --- |
| `docs/ROADMAP.md` | Every session. Tells you what milestone we're in. **Do not build ahead of it.** |
| `docs/ARCHITECTURE.md` | Any structural or dependency decision. |
| `docs/DESIGN.md` | Any UI work. Every color and font comes from here. |
| `docs/SWING_SPEC.md` | Any pose, metric, or event-detection work. |
| `docs/DATA_AND_LEGAL.md` | Any time reference swing data is involved. Non-negotiable. |

Skills in `.claude/skills/` load automatically when relevant. `swing-metrics` has the
biomechanics math. `handicap-rules` has WHS math (not needed until Milestone 5).

---

## The prime directive

**Build the current milestone. Nothing else.**

This project has three products hiding inside it (swing analysis, GPS rangefinder,
handicap tracking). Scope creep kills it. If you notice something the app will need
later, write it in `docs/ROADMAP.md` under "Parked" and move on. Do not build it.

If a request seems to jump milestones, say so before writing code.

---

## Working agreements

**Ask before adding a dependency.** The stack in `ARCHITECTURE.md` is deliberate and
small. `@mediapipe/tasks-vision` is the one heavy thing we've agreed to.

**No mock pose data, ever.** If pose extraction isn't working, we need to know. A
fake skeleton that always looks right is worse than a broken one. Same for metrics —
never fall back to a plausible-looking number. Show the failure.

**Numbers need provenance.** Any biomechanical benchmark in the code needs a source
comment. If you can't source it, don't hardcode it — put it in
`docs/SWING_SPEC.md` under "Unverified" and flag it to Lucas.

**Real content only.** No lorem ipsum, no placeholder swing named "John Doe." Use
Lucas's actual test footage and actual measured numbers. Placeholder content hides
design problems until they're expensive.

**Small commits, honest messages.** One concern per commit.

**Screenshot your UI work.** If the environment supports it, look at what you built
before saying it's done.

---

## Voice

Lucas is 18, lifts, plays basketball, is building this partly as a business. He knows
golf. He does not need golf explained to him. He is learning software — explain
technical decisions, don't explain the sport.

Copy in the app: plain verbs, sentence case, no marketing voice. "Upload a swing," not
"Begin your journey to a better swing." See the writing section of `docs/DESIGN.md`.

---

## Known traps

**Frame rate lies.** Phone slo-mo is often interpolated. A 240fps file may contain
invented frames. Always read the real frame rate off the file; never assume.

**Camera angle destroys everything.** 2D landmarks are meaningless across different
camera positions. Use `worldLandmarks` (metric, hip-centered) for all angle math.
Use 2D `landmarks` only for drawing on screen.

**Monotonic timestamps.** MediaPipe VIDEO mode throws if timestamps go backward. Seeking
a `<video>` element is async and lands on the *nearest* frame, not the exact one. This
will bite you.

**Not every swing is analyzable.** Bad lighting, cropped feet, moving camera. Detect
and reject rather than producing garbage numbers with confidence.

---

## Setup

```bash
npm install
npm run dev
```

Node 20+. See `docs/ARCHITECTURE.md` if the project isn't scaffolded yet.
