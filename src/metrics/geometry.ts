/*
 * Swing-angle geometry. Pure functions of a single frame's `world` landmarks
 * (metric, hip-centered). No React, no side effects — the layer M3 is built on,
 * and the reason it can be tested without a swing on file.
 *
 * Coordinate convention (assumed, TO BE CONFIRMED against real MediaPipe data in
 * M1): a right-handed frame with VERTICAL = +y. Angle magnitudes (spine, tilt,
 * knee flex) are invariant to a y-axis flip; only the SIGN of x-factor depends
 * on the axis direction, so that sign is the thing to verify on Lucas's footage.
 * Getting it backwards inverts x-factor quietly — that's what the tests guard.
 */
import type { Vec3 } from '../lib/vec'
import {
  sub,
  midpoint,
  angleBetween,
  signedAngle,
  projectOntoPlane,
  degrees,
} from '../lib/vec'
import { Landmark } from '../pose/landmarks'

export const VERTICAL: Vec3 = { x: 0, y: 1, z: 0 }

const at = (world: Vec3[], i: Landmark): Vec3 => world[i]

/**
 * Spine angle from vertical, in degrees. Spine = shoulder midpoint − hip
 * midpoint. Vertical-dominant, so it's one of the more robust measurements.
 */
export function spineAngleDeg(world: Vec3[]): number {
  const shoulderMid = midpoint(at(world, Landmark.LEFT_SHOULDER), at(world, Landmark.RIGHT_SHOULDER))
  const hipMid = midpoint(at(world, Landmark.LEFT_HIP), at(world, Landmark.RIGHT_HIP))
  return degrees(angleBetween(sub(shoulderMid, hipMid), VERTICAL))
}

/**
 * Knee flex (the bend in the leg) in degrees: 0 = straight, larger = more bent.
 * `leg` is the subject's own left/right.
 */
export function kneeFlexDeg(world: Vec3[], leg: 'left' | 'right'): number {
  const [hip, knee, ankle] =
    leg === 'left'
      ? [Landmark.LEFT_HIP, Landmark.LEFT_KNEE, Landmark.LEFT_ANKLE]
      : [Landmark.RIGHT_HIP, Landmark.RIGHT_KNEE, Landmark.RIGHT_ANKLE]
  const thigh = sub(at(world, hip), at(world, knee))
  const shank = sub(at(world, ankle), at(world, knee))
  return 180 - degrees(angleBetween(thigh, shank))
}

/**
 * Shoulder tilt: how far the shoulder line rises out of the horizontal plane, in
 * degrees (0 = level, 90 = vertical). Frontal-plane, so more robust than the
 * axial rotations.
 */
export function shoulderTiltDeg(world: Vec3[]): number {
  const shoulderVec = sub(at(world, Landmark.RIGHT_SHOULDER), at(world, Landmark.LEFT_SHOULDER))
  const horizontal = projectOntoPlane(shoulderVec, VERTICAL)
  return degrees(angleBetween(shoulderVec, horizontal))
}

/**
 * X-factor: signed hip→shoulder separation in the horizontal plane, in degrees.
 * Positive means the shoulders are turned further than the hips about vertical.
 *
 * Depends on the z (depth) component, which is the weak point of single-camera
 * pose — treat the magnitude as low-confidence until z is validated, and treat
 * the sign as unverified until checked on real footage.
 */
export function xFactorDeg(world: Vec3[]): number {
  const shoulderVec = sub(at(world, Landmark.RIGHT_SHOULDER), at(world, Landmark.LEFT_SHOULDER))
  const hipVec = sub(at(world, Landmark.RIGHT_HIP), at(world, Landmark.LEFT_HIP))
  const s = projectOntoPlane(shoulderVec, VERTICAL)
  const h = projectOntoPlane(hipVec, VERTICAL)
  return degrees(signedAngle(h, s, VERTICAL))
}

/**
 * Axial turn of a body line (shoulders or hips) about vertical, between two
 * frames, in signed degrees. Address→top gives shoulder/hip turn; address→impact
 * gives how far the hips have opened. The magnitude is the turn; the sign is the
 * direction and depends on which way the golfer faces the camera — so callers
 * that just want "how much" should take the absolute value.
 *
 * Like x-factor this leans on the horizontal (depth-bearing) plane, so it's the
 * weak spot of single-camera pose. Report it, but low-confidence.
 */
export function axialTurnDeg(fromWorld: Vec3[], toWorld: Vec3[], joint: 'shoulders' | 'hips'): number {
  const [l, r] =
    joint === 'shoulders'
      ? [Landmark.LEFT_SHOULDER, Landmark.RIGHT_SHOULDER]
      : [Landmark.LEFT_HIP, Landmark.RIGHT_HIP]
  const from = projectOntoPlane(sub(at(fromWorld, r), at(fromWorld, l)), VERTICAL)
  const to = projectOntoPlane(sub(at(toWorld, r), at(toWorld, l)), VERTICAL)
  return degrees(signedAngle(from, to, VERTICAL))
}

/**
 * Head movement from an address frame, normalized by shoulder width so it's
 * comparable across body sizes. Lateral and vertical reported separately — they
 * mean different things, and some drift is normal in a tour swing.
 */
export function headMovement(addressWorld: Vec3[], nowWorld: Vec3[]): { lateral: number; vertical: number } {
  const width =
    Math.abs(
      at(nowWorld, Landmark.RIGHT_SHOULDER).x - at(nowWorld, Landmark.LEFT_SHOULDER).x,
    ) || 1
  const a = at(addressWorld, Landmark.NOSE)
  const n = at(nowWorld, Landmark.NOSE)
  return { lateral: (n.x - a.x) / width, vertical: (n.y - a.y) / width }
}
