# Design

## The direction: yardage book

Not a fitness app. Not a launch monitor. A **surveyor's yardage book**.

Tour caddies carry hand-drawn books of every green — pale paper, fine contour lines,
stamped numerals, arrows, distances written in the margin. They are dense, unglamorous,
and beautiful, and they exist to measure ground precisely.

That is exactly what this app does to a golf swing. We survey a body. The skeleton
overlay is already a contour drawing. Lean all the way in.

**The risk we're taking:** no photography. Anywhere. No stock golfers, no green grass, no
sunset fairways. The entire product is line work on paper. If it needs a photo to look
good, the drawing isn't good enough.

## Tokens

Every value below goes in `src/design/tokens.css` as a custom property. Nothing
hardcodes a hex or a font name anywhere else.

### Color

```css
--paper:      #E7E9E0;  /* survey paper — grey-green, never cream */
--paper-deep: #D5D9CC;  /* insets, panels, the video well */
--ink:        #16211C;  /* text, contour lines — green-black, never #000 */
--ink-soft:   #59645C;  /* labels, captions, axis marks */
--chalk:      #2547C8;  /* field-marking blue — the reference, the in-range state */
--flag:       #B8332A;  /* out-of-range, deviation, the user's line where it diverges */
```

Six values. That's the whole palette. If something needs a seventh color, it probably
needs a different layout instead.

Semantics are strict: **chalk = reference / correct, flag = deviation.** Never use either
one decoratively. When a number is inside the tour range it's chalk. Outside, it's flag.
That's the only reason color ever changes.

### Type

```css
--face-display: 'Archivo', sans-serif;      /* variable — use wdth 115–125, wght 600–700 */
--face-body:    'Public Sans', sans-serif;
--face-data:    'IBM Plex Mono', monospace;
```

- **Archivo, expanded and heavy** — stamped survey lettering. Headings only, used sparingly.
  Uppercase, tight tracking. The width axis is the whole point; don't ship it at default width.
- **Public Sans** — body. Plain, civic, gets out of the way.
- **IBM Plex Mono** — every number. Angles, frame indices, ratios, timestamps. If it's a
  measurement, it's mono. This is a hard rule and it's what makes the thing feel measured.

Scale — small and disciplined. This is a reference document, not a landing page:

```css
--t-display: clamp(2.5rem, 7vw, 4.5rem);
--t-title:   1.5rem;
--t-body:    1rem;
--t-label:   0.75rem;   /* uppercase, tracked +0.08em, --ink-soft */
--t-data:    1.125rem;
```

### Line

Contours are hairlines. `1px` at rest, `1.5px` for the active trace. Never thicker —
a heavy line stops reading as a drawing.

```css
--radius: 2px;   /* nearly square. This is paper, not a card. */
```

## Signature element: the hand trace

**The one thing people remember.**

Track the midpoint of the hands through the swing and draw it as a single continuous
contour line — the same way a yardage book draws a slope. A swing becomes one closed,
looping stroke. It's genuinely characteristic of the subject, it's derived from real
data, and no other swing app looks like it.

Uses:
- **Hero.** Before any upload, the trace of a reference swing draws itself, stroke by
  stroke, once. Not a loop — a single considered draw on load, then it rests. That's the
  page's thesis: this is what we do to a swing.
- **Result view.** User's trace in ink, reference trace in chalk, and the segments where
  they diverge beyond tolerance in flag.

Everything else on the page stays quiet so this lands.

## Layout

Asymmetric, like a book spread. Wide left column for the drawing, narrow right column for
the readouts — the margin where the caddie writes numbers.

```
┌──────────────────────────────────────┬──────────────┐
│                                      │  TEMPO       │
│                                      │  2.4 : 1     │
│         the drawing                  │  tour 2.8–3.2│
│         (video + skeleton + trace)   │              │
│                                      │  X-FACTOR    │
│                                      │  38°         │
│                                      │  tour 40–50  │
│                                      │              │
├──────────────────────────────────────┤              │
│  ├──────┼──────────┼──────────┤      │              │
│  addr   top       impact             │              │
│  scrub — events marked on the track  │              │
└──────────────────────────────────────┴──────────────┘
```

The scrub bar is a **measuring stick**, not a media player. Ticks. Frame numbers in mono.
Address, top, and impact marked on it as labeled stations. It should look like a ruler,
because that's what it is.

Stacks to one column on mobile: drawing, then scrub, then readouts.

## Motion

One orchestrated moment: the hero trace drawing itself on load. That's it.

No scroll reveals. No hover lifts. No fades between routes. A yardage book doesn't
animate — the single exception earns its place because it's the thesis.

Respect `prefers-reduced-motion`: show the completed trace, no draw.

## Numbers

Numerals are the design. Right-align them. Mono face. Fixed decimal places so they don't
jitter while scrubbing — `2.4:1`, never `2.40000001:1`.

Never round away a real difference. If tempo is 2.84 and the range starts at 2.8, show
2.84, not 2.8.

## Writing

Read the writing section of the `frontend-design` skill. Beyond that, for this app:

- **Golf is not explained.** The audience plays golf. "X-factor" needs no gloss.
- **The app is not a coach.** It measures and reports. It does not say "great swing!" or
  "let's work on that." It says `38°` and `tour 40–50`. The user draws the conclusion.
  This is the tone: an instrument, not a cheerleader.
- **Buttons say what happens.** "Upload a swing." "Measure." Not "Get started."
- **Empty state is an instruction, not a mood.** "Film down-the-line, tripod, 240fps.
  Full body in frame." — the empty state is where we teach the capture setup, because bad
  footage is the #1 cause of bad output.
- **Errors name the problem and the fix.** "Feet are cropped — we need the full body to
  measure spine angle. Re-film from further back." Never "Something went wrong."

## Quality floor

Non-negotiable, and don't announce it in the UI:

- Works down to 375px
- Visible keyboard focus, always — outline in `--chalk`
- `prefers-reduced-motion` honored
- Contrast: `--ink` on `--paper` is strong. Check `--ink-soft` before using it small.
- Video well never causes layout shift when a file loads
