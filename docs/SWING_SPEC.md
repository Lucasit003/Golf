# Swing Spec

The technical contract for pose data. The math for individual metrics lives in the
`swing-metrics` skill — this file defines the structures, the pipeline, and the parts we
haven't figured out yet.

## Capture requirements

Bad footage is the main cause of bad output. Enforce these in the UI, don't hope for them.

- **Down-the-line**: camera behind the player, on the target line, at hand height
- **Tripod**. Any camera movement corrupts everything.
- **240fps** if the phone supports it. 120 is workable. 60 is marginal. 30 is not enough —
  a tour downswing is roughly a quarter of a second, so 30fps gives you about 7 frames of
  it, which is not enough to measure sequencing.
- **Full body in frame**, including feet, with headroom at the top of the backswing
- Same spot every session, or the data isn't comparable

**Frame rate is a lie until you check it.** Phone "slo-mo" is often interpolated — frames
that were invented by the encoder, not captured. Read the real rate off the file and show
it to the user. If we're measuring interpolated frames we're measuring the encoder.

## MediaPipe

`@mediapipe/tasks-vision`, `PoseLandmarker`, `runningMode: 'VIDEO'`, `numPoses: 1`.

Two outputs per frame, and **the distinction is the whole ballgame**:

- **`landmarks`** — normalized 0–1 image coordinates. Use for **drawing only**.
- **`worldLandmarks`** — metric coordinates in meters, origin at the hip midpoint. Use for
  **every angle and every measurement**. This is roughly camera-independent, which is what
  makes cross-camera comparison possible at all.

Never compute an angle from `landmarks`. It will look right and be wrong.

### Landmark indices

The ones we actually use:

```
 0  nose
11  left shoulder      12  right shoulder
13  left elbow         14  right elbow
15  left wrist         16  right wrist
23  left hip           24  right hip
25  left knee          26  right knee
27  left ankle         28  right ankle
29  left heel          30  right heel
31  left foot index    32  right foot index
```

33 total, BlazePose GHUM topology. Put these in a named enum in `pose/landmarks.ts` —
never write a bare `[11]` in metric code.

**Left/right are the subject's own**, mirrored from the camera's view. Getting this
backwards inverts X-factor sign and the bug is quiet. Write a test.

## Core structure

```ts
type Vec3 = { x: number; y: number; z: number };

type PoseFrame = {
  index: number;              // frame number, 0-based
  timeMs: number;             // presentation timestamp
  landmarks: Vec3[];          // 33, normalized image space — DRAW ONLY
  world: Vec3[];              // 33, meters, hip-centered — MEASURE WITH THIS
  visibility: number[];       // 33, 0–1 per landmark
};

type Swing = {
  fps: number;                // real, read from file — not assumed
  frames: PoseFrame[];
  events: SwingEvents | null;
};

type SwingEvents = {
  address: number;            // frame indices
  top: number;
  impact: number;
};
```

`PoseFrame[]` is the spine of the app. Everything downstream is a pure function of it.

## Extraction loop

Seek the video, wait for the seek to land, detect, repeat.

Two traps that will cost you an afternoon each:

1. **Timestamps must strictly increase.** VIDEO mode throws otherwise. If a seek lands on
   a frame you already processed, you'll feed a duplicate timestamp and it dies.
2. **Seeking is async and imprecise.** `video.currentTime = t` lands on the nearest
   *keyframe-decodable* frame, not exactly `t`. Await the `seeked` event, then read back
   `video.currentTime` and use the actual value — don't assume you got what you asked for.

If this proves too flaky, the fallback is decoding via `WebCodecs` / `VideoDecoder`, which
gives exact frames but is a lot more work. Try the simple way first.

Show a progress bar. Thousands of frames is slow and that's acceptable — it's a one-time
cost per upload.

## Event detection

**This is the hard part of the entire project.** Everything downstream depends on three
frame indices being right. Swing apps quietly fail here and then confidently report
garbage.

Starting hypotheses — treat as unproven, validate against Lucas's real swings:

- **Address**: last frame of stillness before motion starts. Look for hand-midpoint
  velocity staying under a threshold for a sustained window, then rising.
- **Top of backswing**: hand-midpoint velocity reaches a local minimum *and* the vertical
  direction of hand travel reverses. The reversal is the more reliable signal; velocity
  alone can dip mid-backswing.
- **Impact**: hands return near their address position with velocity at or near maximum.
  Position alone is ambiguous (the hands pass through a similar place on the way back);
  the combination is what disambiguates.

Every one of these needs verification frame-by-frame against swings Lucas marks by hand.
**Do not trust a plausible number.** The M2 exit test exists for this reason.

Let the user correct a detected event by scrubbing to it. Save the correction as a test
fixture — corrections are the most valuable data this app generates.

## Normalization

Before comparing anyone to anyone:

- **Time**: map address → impact onto 0–1. A slow swing and a fast swing become
  comparable, and tempo is measured separately anyway.
- **Size**: scale by a stable skeletal reference. Shoulder-to-hip distance in
  `worldLandmarks` is the current candidate. Not height — height varies with posture
  through the swing.
- **Orientation**: rotate so the hip line is a consistent reference direction.

## Metric catalog

The full set of swing aspects we compare against tour benchmarks, and — just as
important — **which ones a single down-the-line video can actually produce.** Organized by
measurability, because the honest answer to "can you measure X?" differs between tempo and
ball compression, and the UI must never blur that line.

Every benchmark below carries a source. Ranges are regions with real variance, not specs —
render them as ranges with a caveat, never as false precision (`tour 40–50°`, not `45.0°`).
Confidence is `good` / `moderate` / `low`, and it is a first-class part of the output (see
the `Metric` type in the `swing-metrics` skill). Landmark indices refer to the enum in the
Core structure section.

### The organizing model

Modern 3D systems (TPI / AMM) describe each of two body segments — **pelvis** and
**thorax** — by six degrees of freedom: three translations (**sway** lateral, **thrust**
toward/away from the ball, **lift** vertical) and three rotations (**turn** axial,
**side bend** lateral, **forward bend** flexion). **X-factor** is the axial-turn difference
between the two segments. That's the vocabulary; the tiers below say what we can recover
from one camera.
Source: TPI 3D / Advanced Motion Measurement 6-DOF pelvis–thorax model.

### Tier 1 — reliable from down-the-line pose

Vertical-dominant or time-based quantities. Pose estimation handles the vertical axis and
frame timing well, so these are the trustworthy core.

| Aspect | What it is | Derivation | Tour benchmark | Conf. | Source |
| --- | --- | --- | --- | --- | --- |
| **Tempo** | backswing : downswing time | `(top−address)/(impact−top)` frames | ≈ **3 : 1** (2.8–3.2) | good | Tour Tempo, Novosel — 21 back / 7 down @30fps |
| **Lead knee flex** | front-knee bend through swing | angle hip 23/24 – knee 25/26 – ankle 27/28 | addr **18±12°**, top **33±8°**, impact **~25°** | moderate | Golf Swing Biomechanics systematic review, *Sports* 2022, 10(6):91 |
| **Trail knee flex** | back-knee bend through swing | same, trail leg | addr **17±9°**, top **24±8°**, impact **~22°** | moderate | *Sports* 2022, 10(6):91 |
| **Spine / forward bend** | trunk flexion from vertical | angle of shoulderMid−hipMid vs vertical, at address & impact; report the delta | small change; some extension into impact is normal | moderate | 2D/3D trunk kinematics, *J Appl Biomech* 2016;32(1):23 |
| **Shoulder tilt** | trunk lateral tilt (frontal) | tilt of shoulder line 11–12 from horizontal | top **~36°**, impact **~39°** up (pros) vs ~29°/~27° (high-hcp) | moderate | GolfTEC "Swing by Numbers," *Golf Digest* |
| **Head movement** | drift of head from address | displacement of nose 0 vs address, ÷ shoulder width; lateral & vertical separately | some drift is normal — no "keep still" spec | low | head-movement note, `swing-metrics` |

### Tier 2 — measurable but depth-limited (say so in the UI)

These need axial rotation in the horizontal plane, which depends on `worldLandmarks` z —
the weak point of every single-camera system. 2D and 3D X-factor diverge by **~16°** purely
from projecting trunk flex/side-bend onto one plane. Ship these only with a low-confidence
label and the depth caveat, or behind a "needs 3D" gate. **Validate z on real swings before
trusting any of them** (see Unverified).

| Aspect | What it is | Tour benchmark | Conf. | Source |
| --- | --- | --- | --- | --- |
| **Shoulder turn** | thorax axial rotation at top | ≈ **85–95°** (commonly cited ~90°) | low | elite rotational benchmarks, Chu/Sell/Lephart, *J Sports Sci* (PMID 21844613) |
| **Hip / pelvis turn** | pelvis axial rotation at top | ≈ **45°** | low | same |
| **X-factor** | shoulder−hip axial separation at top | ≈ **40–50°** (high variance) | low | same; caveat *J Appl Biomech* 2016 (2D≠3D by ~16°) |
| **Hip rotation at impact** | pelvis open to target line at impact | ≈ **35–45°** open (pros ~36°+ vs ~20° amateurs) | low | GolfTEC, *Golf Digest* |
| **Side bend at impact** | trunk lateral flexion at impact | trail-side bend present for a RH golfer (left-side bend added into impact) | low | *J Appl Biomech* 2016;32(1):23 |

The kinematic **sequence** itself — pelvis → thorax → arm → club, peaking proximal-to-distal
— is the highest-value rotational signal, and is more about *order* than absolute degrees.
Pros peak in that order with low variability; amateurs fire the arms early. If z is too noisy
for absolute X-factor, the *timing* of the rotation peaks may still be recoverable and worth
more. Source: rotational-biomechanics / kinematic-sequence literature (TPI, Cheetham).

### Tier 3 — not measurable from body video (needs other instruments)

Real aspects of the swing that a down-the-line camera of the *body* cannot produce. List
them honestly as out of scope, and name what each would require — never imply we measure them.

| Aspect | Why not from pose | Needs |
| --- | --- | --- |
| **Compression / attack angle / dynamic loft / spin loft / smash factor** | Club-and-ball impact quantities, not body positions. "Compression" ≈ low spin loft. | Launch monitor (TrackMan). Ref: driver dynamic loft ~12.8°, 6-iron ~20.2°, smash >1.48 — TrackMan |
| **Weight / pressure distribution** | Pressure (how you press into the ground) ≠ visible weight; not recoverable from pose. Tour ≈ 75–90% on lead foot at impact. | Force / pressure plate (BodiTrak, force plates) |
| **Lead-wrist flexion / extension (cup vs bow)** | The pose model gives a wrist *point*, not hand orientation — flat vs cupped needs the back of the hand. Flat-to-slightly-flexed at top/impact is the strong pattern. | Hand-landmark tracking or wrist sensor (HackMotion) |
| **Clubface / shaft plane / club path** | We track the body, not the club. | Club tracking or launch monitor |

## Reference data

Joint data is still the preferred form for a reference — it's what lets us rotate to the
user's camera, rescale to their body, and time-normalize. But **video references are now
allowed when the rights are clean** (licensed or our own footage); see the updated
`docs/DATA_AND_LEGAL.md`. When a reference carries video, it carries its license with it.

```ts
type Reference = {
  id: string;
  source: string;             // where it came from. Required. No exceptions.
  license: string;            // how we're allowed to use it. Required.
  fps: number;
  world: Vec3[][];            // frames × 33, already time-normalized 0–1
  video?: {                   // optional — only when rights are cleared
    url: string;              // local/bundled asset; never a hotlink to someone else's host
    rights: 'owned' | 'licensed';
  };
};
```

A reference without `source` and `license` populated does not enter the repo. A reference
with a `video` field and `rights: 'licensed'` does not enter the repo without the license
on file. Enforce both in a test if you have to.

**User-provided comparison video is different** — it's never a `Reference`, never stored,
never committed. The dual-video compare studio loads two clips the user already has, plays
them together on the device, and keeps nothing. That path has no rights exposure for us.

## Unverified

Anything here is a guess. Do not hardcode it into the app until it's sourced or measured.

- Velocity thresholds for address detection — no basis yet, needs tuning against real data
- Whether shoulder-to-hip distance is stable enough for scaling — verify it doesn't drift
  through the swing before relying on it
- Whether `worldLandmarks` z-depth is accurate enough for X-factor at all. This is the
  biggest open question in the project. Monocular depth is the weak point of every
  single-camera pose system. If z is too noisy, X-factor may need a different approach —
  or may not be measurable from one camera.
- Minimum usable frame rate — 60fps is asserted as "marginal" above, but nobody's tested it
- Whether MediaPipe knee/ankle landmarks are stable enough for knee-flex angles to be
  trustworthy at impact, when the trail foot is rolling and partly occluded
- Shoulder-tilt and side-bend benchmarks come from mixed methods (GolfTEC 3D, research
  mocap). Confirm the definition matches what we compute before shipping a range
- Side-bend-at-impact benchmark has no clean single figure yet — the *J Appl Biomech* 2016
  numbers describe a 2D-vs-3D method difference, not a tour absolute. Find a tour absolute
  before putting a number in the UI
- Tier-2 rotational benchmarks (shoulder turn, hip turn, X-factor, hip-at-impact) all
  inherit the monocular-z problem. None ships as a confident number until z is validated
