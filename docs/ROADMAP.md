# Roadmap

One milestone at a time. A milestone is done when its exit test passes — not when the
code looks finished.

**Current milestone: M0**

---

## M0 — The shell

Build the site. No golf math yet.

- Vite + React + TypeScript project
- Design system from `docs/DESIGN.md` implemented as CSS custom properties
- Landing page: what this is, one clear action
- Upload screen: file picker, video plays back in a `<video>` element, scrub bar
- Responsive to mobile, keyboard focus visible, reduced motion respected

**Exit test:** Lucas can open it on his phone, pick a swing video from his camera roll,
and scrub through it. It looks like something he'd want to show someone.

**Not in M0:** pose detection, any number, any comparison.

---

## M1 — Pose extraction

The whole product is dead if this doesn't work. Find out now.

- `@mediapipe/tasks-vision` `PoseLandmarker`, VIDEO mode
- Walk the uploaded video frame by frame, collect landmarks + worldLandmarks per frame
- Draw the 2D skeleton on a canvas over the video
- Scrubbing moves the skeleton with the video
- Store the full pose sequence in memory as a typed structure (see `SWING_SPEC.md`)
- Show a confidence readout — where is tracking failing?

**Exit test:** Lucas films himself down-the-line at 240fps on a tripod, uploads it, and
the skeleton tracks his body accurately through the whole swing — including the
downswing, where it's hardest.

**If it fails here:** the whole product design changes. Stop and reassess before
building anything else.

---

## M2 — Tempo

The first real number. Forces us to solve event detection, which everything downstream
needs.

- Detect three events: address, top of backswing, impact
- Compute backswing frames ÷ downswing frames
- Show the ratio against the tour range
- Let the user scrub to each detected event and see if it's right

**Exit test:** across 10 of Lucas's swings, the detected top-of-backswing is within
2 frames of where he'd mark it by eye. Manually verify. Don't trust the algorithm
because it returned a plausible number.

**This is the hard one.** Event detection is where swing apps quietly fail. Budget more
time than feels reasonable.

---

## M3 — The metric set

- X-factor (hip–shoulder separation) at top
- Hip rotation at impact
- Spine angle, address vs. impact
- Head movement from address
- Each shown against a sourced benchmark range, with in-range / out-of-range state

See `.claude/skills/swing-metrics` for the math.

**Exit test:** numbers are stable across repeat uploads of the same video, and Lucas
can explain what each one means without reading a tooltip.

---

## M4 — The reference skeleton

The thing that makes this different from every other swing app.

- Ingest reference pose sequences (joint data only — see `docs/DATA_AND_LEGAL.md`)
- Time-normalize reference to the user's swing (address → impact mapped 0–1)
- Scale reference to the user's limb lengths
- Rotate to the user's camera angle
- Render ghosted over the user's video

**Exit test:** the ghost sits on Lucas's body, not next to it, and the divergence at the
top of the backswing is visibly obvious.

---

## M5 — Handicap tracking

Separate product. Only start once M0–M4 actually ship.

See `.claude/skills/handicap-rules`. Read the legal section first — you cannot call it a
"Handicap Index" without USGA/R&A authorization.

---

## M6 — Rangefinder

Separate product. Needs a licensed course dataset (hole and green coordinates). Do not
start until there's a real answer on where that data comes from.

---

## Parked

Things we noticed but are not building. Add to this list instead of building ahead.

- Club selection recommendations
- Shot dispersion tracking
- Multi-angle capture (face-on + down-the-line together)
- Native app wrapper
- Accounts / cloud storage — M0–M4 are entirely local, no backend
