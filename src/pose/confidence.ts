import type { PoseFrame, Swing } from './types'
import { POSE_JOINTS } from './skeleton'

/*
 * Tracking confidence — the mean visibility of the joints we measure. It's the
 * signal that actually decides whether a measurement is trustworthy, so we
 * surface it plainly (overall, and per-frame so weak stretches are visible)
 * rather than dressing up a bad extraction.
 */

/** Mean visibility of the measured joints in one frame (0–1). */
export function frameConfidence(frame: PoseFrame, joints: number[] = POSE_JOINTS): number {
  if (joints.length === 0) return 0
  let sum = 0
  for (const j of joints) sum += frame.visibility[j] ?? 0
  return sum / joints.length
}

/** Per-frame confidence across the swing. */
export function swingConfidences(swing: Swing, joints: number[] = POSE_JOINTS): number[] {
  return swing.frames.map((f) => frameConfidence(f, joints))
}

/** Mean confidence over the whole swing (0–1). */
export function overallConfidence(swing: Swing, joints: number[] = POSE_JOINTS): number {
  if (swing.frames.length === 0) return 0
  const per = swingConfidences(swing, joints)
  return per.reduce((a, b) => a + b, 0) / per.length
}
