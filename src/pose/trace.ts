import type { PoseFrame } from './types'
import type { Pt } from './skeleton'
import { Landmark } from './landmarks'

/*
 * The signature hand trace, derived from real pose data. Tracks the midpoint of
 * the hands through the swing in normalized image space (for drawing over the
 * video) and returns the polyline. This is what replaces the hand-authored hero
 * path once M1 produces real frames — same shape language, real subject.
 *
 * Uses 2D `landmarks` (screen space), not `world`, because it's drawn on screen.
 */

const handMid2D = (f: PoseFrame): Pt => {
  const l = f.landmarks[Landmark.LEFT_WRIST]
  const r = f.landmarks[Landmark.RIGHT_WRIST]
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 }
}

const handVisible = (f: PoseFrame, min: number) =>
  (f.visibility[Landmark.LEFT_WRIST] ?? 1) >= min &&
  (f.visibility[Landmark.RIGHT_WRIST] ?? 1) >= min

/**
 * Hand-midpoint polyline across `frames` (optionally just the slice [from, to]).
 * Frames where a wrist drops below `minVisibility` are skipped, so the trace
 * doesn't jump to a guessed position — a gap is honest.
 */
export function handTracePoints(
  frames: PoseFrame[],
  opts: { from?: number; to?: number; minVisibility?: number } = {},
): Pt[] {
  const from = Math.max(0, opts.from ?? 0)
  const to = Math.min(frames.length - 1, opts.to ?? frames.length - 1)
  const min = opts.minVisibility ?? 0.5
  const pts: Pt[] = []
  for (let i = from; i <= to; i++) {
    if (handVisible(frames[i], min)) pts.push(handMid2D(frames[i]))
  }
  return pts
}

/** An SVG path string ("M x y L x y …") for a set of points. */
export function pointsToPath(pts: Pt[], decimals = 2): string {
  if (pts.length === 0) return ''
  const n = (v: number) => v.toFixed(decimals)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${n(p.x)} ${n(p.y)}`).join(' ')
}
