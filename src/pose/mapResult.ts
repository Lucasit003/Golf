import type { PoseFrame, Vec3 } from './types'

/*
 * Pure conversion from a MediaPipe result to our PoseFrame. Kept separate from
 * the extraction loop so it can be tested without a browser or a video: given a
 * result shape, it produces the right structure, or null when a pose is missing.
 *
 * `landmarks` (normalized image space) are carried for drawing; `world` (metric,
 * hip-centered) are what every measurement uses. Never collapse the two.
 */

type MpPoint = { x: number; y: number; z: number; visibility?: number }
export type MpResult = {
  landmarks?: MpPoint[][]
  worldLandmarks?: MpPoint[][]
}

const xyz = (p: MpPoint): Vec3 => ({ x: p.x, y: p.y, z: p.z })

/** Returns null when no pose was found in the frame — a valid, expected outcome. */
export function toPoseFrame(index: number, timeMs: number, result: MpResult): PoseFrame | null {
  const image = result.landmarks?.[0]
  const world = result.worldLandmarks?.[0]
  if (!image || !world || image.length === 0 || world.length === 0) return null

  return {
    index,
    timeMs,
    landmarks: image.map(xyz),
    world: world.map(xyz),
    visibility: image.map((p) => p.visibility ?? 0),
  }
}
