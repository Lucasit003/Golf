---
name: swing-metrics
description: Golf swing biomechanics math — tempo, X-factor (hip-shoulder separation), shoulder/hip turn, spine and forward bend, shoulder tilt, side bend, lead/trail knee flexion, hip rotation at impact, head movement, and the kinematic sequence. Use when computing any swing measurement from pose data, defining benchmark ranges, or working on event detection. Covers the vector math, the landmark indices each metric needs, which benchmarks are verified vs. assumed, and which swing aspects (compression/attack angle, weight/pressure, wrist cup) can't come from body video at all.
---

# Swing Metrics

Math for turning `PoseFrame[]` into measurements. Structures and pipeline are in
`docs/SWING_SPEC.md` — read that first.

## Two rules

**1. Measure with `world`, draw with `landmarks`.** `worldLandmarks` are metric, in
meters, origin at the hip midpoint. `landmarks` are normalized image coordinates and are
meaningless for angles — a person standing further from the camera produces different
values for the same posture. Every angle in this file uses `world`.

**2. Never emit a number you can't stand behind.** If landmark visibility is low, if the
event frames are uncertain, if a required joint is out of frame — return `null` and say
why. A wrong number that looks right is the worst possible output. There is no fallback
value. There is no "reasonable default."

## Benchmarks: what's actually known

Be honest about this. Each benchmark gets a source comment in code or it doesn't ship.

The full, sourced catalog — every aspect and which tier it falls in — lives in
`docs/SWING_SPEC.md` under **Metric catalog**. That's the canonical list; this table is the
short version with the confidence call for the ones we compute from pose.

| Metric | Commonly cited range | Confidence |
| --- | --- | --- |
| Tempo (back:down) | ~3:1 (2.8–3.2) | **Good.** Widely replicated. Tour Tempo (Novosel): 21 frames back / 7 down at 30fps across many tour swings. |
| Lead knee flex | addr ~18°, top ~33°, impact ~25° | **Moderate.** Systematic review with SDs (*Sports* 2022, 10(6):91). Vertical-plane angle, so pose handles it — verify landmark stability at impact. |
| Trail knee flex | addr ~17°, top ~24°, impact ~22° | **Moderate.** Same source. |
| Spine / forward bend, addr→impact | small change; some extension normal | **Moderate.** Vertical-dominant, more robust than the rotations. No crisp tour absolute yet. |
| Shoulder tilt (frontal) | top ~36°, impact ~39° up | **Moderate.** GolfTEC "Swing by Numbers." Confirm their definition matches ours. |
| X-factor at top | ~40–50° | **Low.** Cited constantly, but methodology varies (definition, plane, 3D vs video), and 2D≠3D by ~16°. Depends on noisy z. Rough region, not a spec. |
| Shoulder turn / hip turn at top | ~90° / ~45° | **Low.** Axial rotation — same z problem. |
| Hip rotation at impact | ~35–45° open | **Low.** Same problem. |
| Side bend at impact | present, no clean tour figure | **Low.** Don't ship a number until sourced. |
| Head movement | some lateral drift is normal | **Low.** "Keep your head still" is folk wisdom mocap doesn't support. |

**Tiering (see SWING_SPEC):** vertical/timing metrics (tempo, knees, spine, tilt) are
Tier 1 — trustworthy. Axial rotations (X-factor, turns, hip-at-impact, side bend) are
Tier 2 — real but depth-limited; ship low-confidence or gate behind 3D. Club/ball and
pressure metrics (compression/attack angle, weight distribution, wrist cup/bow) are
**Tier 3 — not measurable from body video at all.** Never surface a Tier-3 aspect as
something we measure; name the instrument it needs.

**Do not invent precision.** If the literature says "roughly 40 to 50 degrees with high
variance," the UI says a range and a caveat, not `45.0°`.

**Before shipping any benchmark**, find the actual paper or source. Titleist Performance
Institute, AMM 3D, and sports biomechanics journals are the places to look. Put the
citation in a comment next to the constant. Anything unsourced goes in the "Unverified"
section of `docs/SWING_SPEC.md` and gets flagged to Lucas.

## Tempo

The most reliable metric we have. Pure frame counting — no depth, no 3D, no noise
sensitivity. That's why it's M2.

```ts
tempo = (top - address) / (impact - top)   // frames, from SwingEvents
```

Accuracy is entirely a function of event detection. A tempo number is only as good as the
three frame indices behind it, and those are the hard part.

Report as a ratio to one decimal: `2.4 : 1`.

## X-factor (hip–shoulder separation)

Angle between the shoulder line and the hip line, measured in the horizontal plane.

```
shoulderVec = world[12] - world[11]      // right shoulder − left shoulder
hipVec      = world[24] - world[23]      // right hip − left hip

// project both onto the horizontal plane (drop the vertical component),
// normalize, then take the signed angle between them
```

Sign matters — it tells you which way the separation runs. Getting left/right backwards
inverts it silently. Test this.

**The open question:** this depends on z-depth, and monocular depth estimation is the weak
point of every single-camera pose system. `worldLandmarks` z may be too noisy for a
trustworthy X-factor.

**Find out before building the UI for it.** Take one of Lucas's swings, plot z for
landmarks 11/12/23/24 across all frames, and look at it. If it's jittery garbage, X-factor
from one camera isn't real and we should say so rather than shipping a noisy number with a
confident label. This is a real possible outcome — plan for it.

## Hip rotation at impact

Angle of the hip line relative to the target line, at the impact frame.

Requires knowing the target line. From a down-the-line camera it's approximately the
camera's forward axis, but "approximately" is doing work there. A better approach is to
derive it from the foot line at address (`world[31]`/`world[32]` vs `world[27]`/`world[28]`)
and carry it forward as the reference.

Same z-depth dependency as X-factor. Same verification needed.

## Spine angle

Angle of the spine from vertical. Spine vector = shoulder midpoint − hip midpoint.

```
shoulderMid = (world[11] + world[12]) / 2
hipMid      = (world[23] + world[24]) / 2
spine       = shoulderMid - hipMid
```

Report at address and at impact, and report the delta. The delta is the interesting part.

More robust than X-factor — it's dominated by the vertical component, which is the axis
pose estimation handles best.

## Head movement

Displacement of landmark `0` (nose) from its address position, tracked through the swing.

Report lateral and vertical separately — they mean different things. Normalize by shoulder
width so it's comparable across body sizes.

Caveat honestly: some head movement is normal and present in tour swings. Don't imply
otherwise.

## Knee flexion

Interior angle at the knee — the bend in the leg — for each side, at address, top, and
impact.

```
// lead leg (indices are the subject's own left/right; pick the target-side leg)
thigh = world[hip] - world[knee]      // 23/24 − 25/26
shank = world[ankle] - world[knee]    // 27/28 − 25/26
flex  = 180° - angleBetween(thigh, shank)   // 0 = straight leg
```

This is a **Tier-1** metric: it lives mostly in the vertical/sagittal plane, which pose
handles well. The catch is the impact frame — the trail foot is rolling and the ankle can
be occluded or blurred at speed. Gate on `visibility` for 25/26/27/28 and return `null`
when the trail ankle drops out rather than reporting a jittery number.
Benchmarks (with SDs) in `docs/SWING_SPEC.md`; source is the *Sports* 2022 systematic review.

## Shoulder tilt (frontal)

Lateral tilt of the shoulder line — distinct from shoulder *turn* (axial). This is the
frontal-plane angle of the shoulder segment, at the top and at impact.

```
shoulderVec = world[12] - world[11]
// angle of shoulderVec from horizontal in the frontal (vertical) plane
tilt = angle between shoulderVec and the horizontal axis
```

Tier-1-ish: it's a vertical-plane angle, so more robust than the rotations. But confirm the
benchmark definition matches ours before shipping a range — GolfTEC's "tilt" is a 3D-system
convention and may not be the same axis. Pair it with **side bend** (trunk lateral flexion),
which is the same idea for the spine rather than the shoulder line.

## Vector helpers

These belong in `src/lib/vec.ts` — pure, no domain knowledge, easy to test:

```ts
sub(a, b)              // a − b
add(a, b)
scale(v, k)
dot(a, b)
cross(a, b)
length(v)
normalize(v)
angleBetween(a, b)     // unsigned, radians
signedAngle(a, b, n)   // signed about normal n — needed for X-factor
projectOntoPlane(v, n)
midpoint(a, b)
degrees(rad)
```

Test these first. Everything else is built on them, and a sign error here surfaces as a
mysterious biomechanics bug three layers up.

## Metric output

```ts
type Metric = {
  id: string;
  label: string;
  value: number | null;          // null when not measurable — this is a valid outcome
  unit: string;
  benchmark: { min: number; max: number; source: string } | null;
  confidence: 'good' | 'low';    // low → say why in the UI
  note?: string;                 // why it's null, or why confidence is low
};
```

`null` and `'low'` are first-class results. The UI must handle them as normally as it
handles a clean number — an instrument that admits uncertainty is more trustworthy than
one that doesn't.
