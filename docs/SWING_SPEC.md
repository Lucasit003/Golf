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

## Reference data

Reference swings are **joint data only**. Never video. See `docs/DATA_AND_LEGAL.md` —
this is a legal constraint, not a preference.

```ts
type Reference = {
  id: string;
  source: string;             // where it came from. Required. No exceptions.
  license: string;            // how we're allowed to use it. Required.
  fps: number;
  world: Vec3[][];            // frames × 33, already time-normalized 0–1
};
```

A reference without `source` and `license` populated does not enter the repo. Enforce it
in a test if you have to.

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
