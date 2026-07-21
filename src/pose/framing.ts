import type { Swing } from './types'

/*
 * A soft "does this look right?" check on a tracked clip. It never blocks — it
 * nudges when the video clearly isn't what the selected angle expects, so a
 * face-on clip in the down-the-line slot (or a clip with no golfer, or feet out
 * of frame) gets caught before anyone reads a number off it.
 *
 * The angle read is deliberately coarse and only fires when confident: a golfer
 * filmed FROM BEHIND (down-the-line) has their face turned away, so the face
 * landmarks are barely visible; a golfer filmed from the FRONT (face-on) shows a
 * clear face. We warn only at the extremes and stay quiet in between — better to
 * miss an odd angle than to nag a correct one.
 */

export type CameraAngle = 'down_the_line' | 'face_on'

export type FramingHint = {
  kind: 'no-pose' | 'cropped' | 'wrong-angle'
  message: string
  /** When the angle looks wrong, the angle this clip probably belongs to. */
  suggest?: CameraAngle
}

// Face: nose, both eyes, both mouth corners — the "facing the camera" tell.
const FACE = [0, 2, 5, 9, 10]
// Feet: ankles + toes — the "whole body in frame" tell.
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
 * Coarse framing check. `coverage` is the fraction of frames a pose was found in
 * (from extraction). Returns the single most-important hint, or null when the
 * clip looks fine for the selected angle.
 */
export function checkFraming(swing: Swing, angle: CameraAngle, coverage: number): FramingHint | null {
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

  const face = meanVisibility(swing, FACE)
  if (angle === 'down_the_line' && face > 0.6) {
    return {
      kind: 'wrong-angle',
      suggest: 'face_on',
      message:
        'This looks like a face-on video — your face is toward the camera. Down-the-line is filmed from behind you, on the target line.',
    }
  }
  if (angle === 'face_on' && face < 0.25) {
    return {
      kind: 'wrong-angle',
      suggest: 'down_the_line',
      message:
        'This looks like a down-the-line video — filmed from behind. Face-on is filmed from the front, square to your chest.',
    }
  }

  return null
}
