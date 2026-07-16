# Data and Legal

Not lawyer advice. These are the project's operating rules — follow them, and get real
advice before anything ships commercially.

---

## The one rule

**Reference swings are stored as joint coordinates. Never as video.**

Extract pose data, discard the footage, keep the numbers. This is the architectural
decision the whole product rests on, and it's load-bearing for three separate reasons:

1. **Legal.** Measurements aren't the copyrighted work. Frames are.
2. **Technical.** A skeleton can be rotated to the user's camera angle, rescaled to their
   body, and time-normalized. Video can't do any of that. A face-on clip is worthless
   against a down-the-line user video.
3. **Practical.** A swing is a few KB of joint data versus tens of MB of video.

The legal reason is the one people notice. The technical reason is the one that actually
makes the product good.

## Where reference swings can come from

In order of how fast Lucas can actually get them:

| Source | Reality |
| --- | --- |
| **Local teaching pro** | Free, this week, and we control camera position and frame rate. Best data quality by a wide margin. Start here. |
| **Instructor channels** | Small businesses, reachable by email, licensing for a credit or small fee is a normal conversation. |
| **Mini-tour / college players** | Korn Ferry, Epson, D1. Great swings, no agent, no media rights tangle. Often a few hundred dollars or just credit. More relevant to our users than tour swings anyway. |
| **Stock footage** | Getty, Shutterstock, Pond5. Clean rights, purchasable today. Mediocre frame rates, non-standard angles. |
| **PGA Tour / agencies** | Five figures and up, slow, won't take the meeting without a product. Later, as a marketing asset. |

**The name attached to a swing has no technical value.** A well-filmed scratch player at a
known camera position produces better reference data than a Rory clip at an unknown angle.
The name is marketing, and it's purchasable later once there's traction.

## What we don't do

- **No scraping YouTube.** It breaches the ToS, and the footage belongs to the channel or
  the tour. "Fine until you have users" is a trap, because that's exactly when it stops
  being fine.
- **No redistributing frames** from any source, including licensed ones, unless the
  license explicitly covers it.
- **No named-pro comparison** without a license covering both the footage and the player's
  likeness. Those are two separate rights held by two different parties.

## Benchmarks vs. references

Two different things:

- **Benchmark** — a published range from biomechanics research. "Tour tempo 2.8–3.2:1."
  Facts, not copyrightable. Cite the source. This is what M3 compares against.
- **Reference** — a specific swing's joint data, rendered as the ghost skeleton. Needs a
  license. This is M4.

**Benchmarks get us most of the value with none of the legal exposure.** "You're at 2.4:1,
tour range is 2.8–3.2" is more actionable to a user than a side-by-side with Rory. M4 is a
visualization upgrade, not the substance. Sequence accordingly.

## User video

Never leaves the device through M4. No uploads, no backend, no storage. Say this plainly
in the UI — people are filming themselves and it matters to them.

If a backend ever gets added, this becomes a privacy policy question and a real one. Don't
add one casually.

## Handicaps (M5)

The World Handicap System is administered by the USGA and R&A, and "Handicap Index" is
their licensed term. **We cannot compute or display an official Handicap Index without
authorization.**

What's fine: computing an unofficial estimate using published WHS formulas, labeled
clearly and unambiguously as unofficial. Most independent apps do exactly this.

What's not: calling it a Handicap Index, implying it's official, or implying it's usable
for competition.

The math is in `.claude/skills/handicap-rules`. The labeling is not optional.

## Course data (M6)

Hole and green coordinates for a rangefinder are a licensed dataset or a mapping project.
There is no free path. Don't start M6 without an answer to where the data comes from.
