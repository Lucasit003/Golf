---
name: handicap-rules
description: World Handicap System math — Score Differential, Handicap Index from best 8 of 20, the fewer-than-20-scores table, net double bogey, soft and hard caps, Course Handicap. Use when building handicap tracking, scoring, or any calculation involving a golfer's index. Also covers the licensing constraint on the term "Handicap Index."
---

# Handicap Rules (WHS)

Not needed until M5. Read `docs/DATA_AND_LEGAL.md` before writing any of this.

## The labeling constraint — read first

The World Handicap System is administered by the USGA and R&A. **"Handicap Index" is their
licensed term.** We cannot produce an official one without authorization.

We compute an **unofficial estimate** using the published formulas, labeled clearly and
unambiguously as unofficial and not valid for competition. Most independent apps do exactly
this. The label is not optional and not fine print.

Also: **the WHS gets revised.** These formulas were current as of the last revision this
file's author knew about, and revisions happen. Verify against the current USGA rules
before shipping anything. Don't assume this file is current.

## Score Differential

The unit everything is built from. Computed per round.

```
Score Differential = (113 / Slope Rating) × (Adjusted Gross Score − Course Rating − PCC)
```

- **113** is the Slope Rating of a course of standard difficulty. It's a constant, not a
  magic number — it's the denominator that makes slopes comparable.
- **Adjusted Gross Score** — gross score with per-hole maximums applied (see net double
  bogey below). Not the raw score.
- **Course Rating** — the expected score for a scratch golfer. A decimal, e.g. 71.4.
- **PCC** — Playing Conditions Calculation, an adjustment from −1 to +3 that the golf
  association computes from the day's scores. **An app cannot compute this.** Use 0 and
  note it as a source of divergence from an official index.

Round the differential to one decimal.

## Handicap Index

Average of the **lowest 8** Score Differentials from the **most recent 20** scores.

With fewer than 20 scores, use this table:

| Scores | Use |
| --- | --- |
| 3 | lowest 1, minus 2.0 |
| 4 | lowest 1, minus 1.0 |
| 5 | lowest 1 |
| 6 | average of lowest 2, minus 1.0 |
| 7–8 | average of lowest 2 |
| 9–11 | average of lowest 3 |
| 12–14 | average of lowest 4 |
| 15–16 | average of lowest 5 |
| 17–18 | average of lowest 6 |
| 19 | average of lowest 7 |
| 20 | average of lowest 8 |

Fewer than 3 scores: no index. Don't estimate one.

Round to one decimal. Maximum is 54.0.

**Test this table exhaustively.** It's the single most bug-prone thing in the whole
project — twelve branches, off-by-one risk at every boundary, and errors are invisible
because the output is always a plausible-looking number. Write a test per row.

## Adjusted Gross Score: net double bogey

Per-hole maximum for handicap purposes:

```
max hole score = par + 2 + handicap strokes the player receives on that hole
```

Handicap strokes come from the player's Course Handicap distributed across holes by stroke
index. A player with a Course Handicap of 18 on a par-4 with stroke index 5 gets one
stroke, so their max is 4 + 2 + 1 = 7.

Applies to every hole. A player who takes 9 on a hole where their max is 7 posts 7.

## Caps

Both measured against **Low Handicap Index** — the lowest index in the player's most recent
365 days. Track this; it's state, not a computation.

- **Soft cap**: once the new index would rise more than 3.0 above the Low HI, the excess
  above 3.0 is reduced by 50%.
- **Hard cap**: the index cannot rise more than 5.0 above the Low HI, period.

Caps only ever suppress increases. They never affect a decrease.

Worked example — Low HI 10.0, calculated index 15.0:
- Raw increase: 5.0
- First 3.0 passes through → 13.0
- Remaining 2.0 is halved → 1.0
- Soft-capped result: 14.0
- Hard cap ceiling is 15.0, so it doesn't bind here
- Final: **14.0**

## Course Handicap

Strokes received at a specific course and tee.

```
Course Handicap = Handicap Index × (Slope / 113) + (Course Rating − Par)
```

The `(Course Rating − Par)` term is what makes a course play harder than its slope alone
suggests. Round to the nearest whole number.

## Playing Handicap

```
Playing Handicap = Course Handicap × handicap allowance
```

Allowance depends on the format — singles match play, fourball, stroke play all differ.
Not needed unless we build competition formats. Don't implement it speculatively.

## Data model sketch

```ts
type Round = {
  date: string;              // ISO
  courseRating: number;
  slopeRating: number;
  par: number;
  adjustedGross: number;     // after net double bogey
  pcc: number;               // always 0 for us — we can't compute it
  differential: number;      // derived, cached
};

type Player = {
  rounds: Round[];           // most recent first
  lowIndex: number | null;   // lowest index in last 365 days — needed for caps
};
```

## Implementation order

1. Score Differential — trivial, do it first
2. The fewer-than-20 table — a test per row before the code
3. Net double bogey — needs Course Handicap, which needs an index, so there's a chicken-
   and-egg on the first round. Handle it explicitly rather than discovering it.
4. Caps — needs 365-day Low HI history
5. Course Handicap

## What we can't do

- **PCC.** Requires the association's view of every score posted that day at that course.
- **Peer review.** Real WHS has a human component. We don't have it.
- **Official status.** The output is an estimate. Say so, every time it's displayed.
