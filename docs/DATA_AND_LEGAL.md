# Data and Legal

Not lawyer advice. These are the project's operating rules — follow them, and get real
advice before anything ships commercially.

---

## The rule (updated — video comparison allowed, with rights)

**Default to joint coordinates. Use video only when you have the rights to it.**

This doc originally said "reference swings are stored as joint coordinates, never as
video." That's relaxed: **video comparisons are allowed** — but only in the ways that are
actually legal. Two things are true at once, and both matter:

- **Joint data stays the preferred form** for technical reasons that haven't changed (see
  below). It's what makes a reference reusable across camera angles and body sizes.
- **Video is allowed when the footage is yours or licensed** (see "Video comparison"). It
  is *not* allowed for footage you don't have rights to — and no edit to this file changes
  that, because that part is copyright and likeness law, not a project preference. Changing
  a rule in a repo doesn't change the law underneath it.

How the incumbents actually do this: GolfTEC, GEARS, TPI, and Sportsbox AI don't compare
you to a copyrighted broadcast clip of a named pro. They compare you to **data they own or
that isn't copyrightable** — their own captured motion data (GolfTEC's SwingTRU study
measured tens of thousands of golfers, tour pros included), statistical benchmark ranges
(facts, not copyrightable), or licensed footage. Own it, aggregate it, or license it —
never scrape it. That's the whole game, and it's a solid one.

Why joint data is still the default:

1. **Technical.** A skeleton can be rotated to the user's camera angle, rescaled to their
   body, and time-normalized. Video can't do any of that. A face-on clip is worthless
   against a down-the-line user video.
2. **Practical.** A swing is a few KB of joint data versus tens of MB of video.
3. **Legal, for third-party swings.** Measurements aren't the copyrighted work; frames are.
   Your own footage and licensed footage are fine as video. Scraped footage never is.

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

## Video comparison

Allowed. Three modes, in order of how clean the rights are:

1. **User-provided, side by side.** The user loads two clips they already have — their own
   swing plus their own reference (a lesson clip, a buddy's swing, a swing they filmed off
   a screen for personal use). We just play them together, synced, in slow motion. Both
   files stay on the device; we ship nothing. This is the dual-video compare studio, and it
   carries no rights exposure for us because we never host or distribute the footage.
2. **Licensed reference video.** Footage we've licensed — teaching pro, mini-tour player,
   stock — shown as a reference we're contractually allowed to display. Keep the license on
   file; store the `license` string with the asset (see the `Reference` type in
   `SWING_SPEC.md`, which now allows a `video` field alongside `world`).
3. **Our own captured video.** Anything Lucas films himself, with the subject's consent.
   We own it. This is the fastest clean source and the best data — start here.

What still isn't allowed, because a doc can't waive it:

- **No scraping YouTube / broadcast / social.** ToS breach, and the footage belongs to the
  channel or the tour. "Fine until you have users" is a trap — that's exactly when it stops
  being fine.
- **No redistributing frames** from any source, including licensed ones, unless the license
  explicitly covers redistribution.
- **No named-pro comparison** without a license covering *both* the footage and the
  player's likeness — two separate rights, two different parties. The user comparing their
  own clip of a pro on their own device (mode 1) is their business; us shipping that clip is
  not the same thing and needs the license.

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

Never leaves the device through M4. No uploads, no backend, no storage. This now covers
**both** clips in a side-by-side comparison — the user's swing and whatever reference they
load are handled entirely in the browser and are never transmitted. Say this plainly in the
UI — people are filming themselves and it matters to them, and "your footage stays here" is
a genuine feature, not a disclaimer.

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
