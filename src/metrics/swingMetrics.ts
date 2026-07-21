/*
 * Turn a tracked swing into measured values, keyed by benchmark id, at the frames
 * the events point to. Every value is an ESTIMATE from single-camera pose — the
 * catalog's per-metric confidence (good / moderate / low) is how honest each one
 * is, and the UI shows that badge. A value is only produced when the frames it
 * needs exist; anything degenerate stays absent rather than guessed.
 *
 * Which event each metric is read at follows the benchmarks' own labels:
 *   spine angle   — change from address to impact (posture held?)
 *   shoulder turn — address → top
 *   hip turn      — address → top
 *   x-factor      — at top
 *   shoulder tilt — at top
 *   hip rotation  — address → impact (hips open to the target)
 *   knee flex     — at top, lead = the more-flexed knee (≈33° vs ≈24° in a
 *                   normal swing), which sidesteps guessing handedness.
 */
import type { PoseFrame, SwingEvents } from '../pose/types'
import type { BenchmarkId } from './benchmarks'
import {
  spineAngleDeg,
  shoulderTiltDeg,
  xFactorDeg,
  kneeFlexDeg,
  axialTurnDeg,
} from './geometry'

export type SwingMeasures = Partial<Record<BenchmarkId, number>>

const worldAt = (frames: PoseFrame[], i: number): PoseFrame['world'] | null =>
  i >= 0 && i < frames.length ? frames[i].world : null

export function computeSwingMetrics(frames: PoseFrame[], events: SwingEvents | null): SwingMeasures {
  const out: SwingMeasures = {}
  if (!events || frames.length === 0) return out

  const addr = worldAt(frames, events.address)
  const top = worldAt(frames, events.top)
  const imp = worldAt(frames, events.impact)

  if (addr && imp) {
    // Posture: how much the spine angle drifts from its address value by impact.
    out.spineAngle = spineAngleDeg(imp) - spineAngleDeg(addr)
    out.hipRotationImpact = Math.abs(axialTurnDeg(addr, imp, 'hips'))
  }
  if (addr && top) {
    out.shoulderTurn = Math.abs(axialTurnDeg(addr, top, 'shoulders'))
    out.hipTurn = Math.abs(axialTurnDeg(addr, top, 'hips'))
  }
  if (top) {
    out.xFactor = Math.abs(xFactorDeg(top))
    out.shoulderTilt = shoulderTiltDeg(top)
    const left = kneeFlexDeg(top, 'left')
    const right = kneeFlexDeg(top, 'right')
    out.leadKneeFlex = Math.max(left, right)
    out.trailKneeFlex = Math.min(left, right)
  }

  return out
}
