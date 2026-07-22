import type { Swing } from './types'

/*
 * A soft "does this clip look usable?" check on a tracked swing. It never blocks
 * — it nudges when the video clearly isn't a full-body golfer, so a clip with no
 * person (or one with the feet cropped out) gets caught before anyone reads a
 * number off it.
 *
 * What this DELIBERATELY no longer does: guess the camera angle (down-the-line vs
 * face-on). We tried, and measured it against real clips — MediaPipe reports the
 * face landmarks at ~100% visibility even when the golfer is filmed from directly
 * behind, and shoulder/hip/foot geometry averaged over a swing (or even at
 * address) doesn't separate the two angles either, because a real "down the line"
 * is often shot from behind-and-to-the-side. A check that can't tell the
 * difference would cry wolf on correctly-placed clips, which is worse than no
 * check. If angle detection ever returns it needs a signal that actually carries
 * the information (a second camera, or an explicit user confirmation).
 */

export type FramingHint = {
  kind: 'no-pose' | 'cropped'
  message: string
}

// Feet: ankles + toes — the "whole body in frame" tell. Unlike the face,
// visibility here does drop when a joint leaves the frame entirely.
const FEET = [27, 28, 31, 32]

function meanVisibility(swing: Swing, joints: number[]): number {
  let sum = 0
  let n = 0
  for (const f of swing.frames) {
    for (const j of joints) {
      sum += f.visibility[j] ?? 0
      n += 1
    }
  }
  return n === 0 ? 0 : sum / n
}

/**
 * Coarse framing check. `coverage` is the fraction of sampled frames a pose was
 * found in (from extraction). Returns the single most-important hint, or null
 * when the clip looks fine.
 */
export function checkFraming(swing: Swing, coverage: number): FramingHint | null {
  if (coverage < 0.4 || swing.frames.length < 5) {
    return {
      kind: 'no-pose',
      message:
        'We couldn’t track a full body through this clip. Make sure a golfer is fully in frame, well lit, and fills most of the height.',
    }
  }

  if (meanVisibility(swing, FEET) < 0.4) {
    return {
      kind: 'cropped',
      message:
        'Your feet drop out of frame during the swing. Stand back so your whole body — feet to hands — stays in view the whole time.',
    }
  }

  return null
}
