import type { PoseFrame, SwingEvents, Vec3 } from '../pose/types'
import { Landmark } from '../pose/landmarks'
import { midpoint, sub, length } from '../lib/vec'

/*
 * Event detection — finding address, top, and impact in a PoseFrame[].
 *
 * ⚠️  This is the hard part of the whole project, and this is a FIRST PASS. The
 * heuristics below are the starting hypotheses from SWING_SPEC, not a validated
 * algorithm. They pass on clean synthetic swings (see the tests) but MUST be
 * checked frame-by-frame against Lucas's real swings before anything trusts the
 * numbers. Do not treat a plausible result as correct. The M2 exit test exists
 * for exactly this reason, and user corrections become fixtures.
 *
 * All signals come from the hand midpoint (wrist midpoint) in `world`:
 *   - address: the last still frame before motion begins
 *   - top:     the vertical extreme at the end of the backswing (velocity
 *              reverses) — SWING_SPEC calls the reversal the more reliable signal
 *   - impact:  after the top, the hands return nearest to the address position
 */

const handMid = (f: PoseFrame): Vec3 =>
  midpoint(f.world[Landmark.LEFT_WRIST], f.world[Landmark.RIGHT_WRIST])

/** Hand-midpoint speed per frame (distance from the previous frame). */
export function handSpeeds(frames: PoseFrame[]): number[] {
  const pos = frames.map(handMid)
  return pos.map((p, i) => (i === 0 ? 0 : length(sub(p, pos[i - 1]))))
}

export function detectEvents(frames: PoseFrame[]): SwingEvents | null {
  const n = frames.length
  if (n < 6) return null

  const pos = frames.map(handMid)
  const speed = handSpeeds(frames)
  const maxSpeed = Math.max(...speed)
  if (maxSpeed === 0) return null // nothing moved — not an analyzable clip

  // Address: the frame before speed first crosses a low fraction of the peak.
  const moveThreshold = maxSpeed * 0.08
  let address = 0
  for (let i = 1; i < n; i++) {
    if (speed[i] > moveThreshold) {
      address = i - 1
      break
    }
  }

  // Which way do the hands travel vertically during the backswing? Sample the
  // first few frames of motion so a single noisy frame can't set the direction.
  const vy = pos.map((p) => p.y)
  const k = Math.min(5, n - 1 - address)
  if (k < 1) return null
  let backDir = 0
  for (let i = address + 1; i <= address + k; i++) backDir += vy[i] - vy[address]
  const dir = backDir >= 0 ? 1 : -1

  // Top: the vertical extreme in the backswing direction. Restrict the search to
  // roughly the first two-thirds after address — the top sits at the end of the
  // backswing, well before the follow-through's own vertical extreme.
  const searchEnd = address + Math.max(2, Math.floor((n - 1 - address) * 0.7))
  let top = address + 1
  let bestRise = -Infinity
  for (let i = address + 1; i <= searchEnd; i++) {
    const rise = dir * (vy[i] - vy[address])
    if (rise > bestRise) {
      bestRise = rise
      top = i
    }
  }

  // Impact: after the top, the frame where the hands are nearest the address
  // position — the downswing returns them to the ball.
  let impact = top + 1
  let nearest = Infinity
  for (let i = top + 1; i < n; i++) {
    const d = length(sub(pos[i], pos[address]))
    if (d < nearest) {
      nearest = d
      impact = i
    }
  }

  if (!(address < top && top < impact)) return null
  return { address, top, impact }
}
