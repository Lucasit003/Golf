import { describe, it, expect } from 'vitest'
import type { PoseFrame, Vec3 } from '../pose/types'
import { Landmark } from '../pose/landmarks'
import { detectEvents, handSpeeds } from './events'

// A frame whose hand midpoint sits at height y (both wrists at the same point).
function frameAt(index: number, y: number): PoseFrame {
  const world: Vec3[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  world[Landmark.LEFT_WRIST] = { x: 0, y, z: 0 }
  world[Landmark.RIGHT_WRIST] = { x: 0, y, z: 0 }
  return { index, timeMs: index * 10, landmarks: world, world, visibility: [] }
}

// A clean synthetic swing: still (0–4), backswing up (5–14, top at 14),
// downswing back to the ball (15–22, impact at 22), follow-through (23–29).
function syntheticSwing(sign = 1): PoseFrame[] {
  const ys: number[] = []
  for (let i = 0; i < 5; i++) ys.push(0) // address
  for (let i = 1; i <= 10; i++) ys.push(i) // backswing → 10 at frame 14
  for (let i = 1; i <= 8; i++) ys.push(10 - (10 / 8) * i) // downswing → 0 at frame 22
  for (let i = 1; i <= 7; i++) ys.push(i) // follow-through
  return ys.map((y, i) => frameAt(i, sign * y))
}

describe('handSpeeds', () => {
  it('is zero while still and positive once moving', () => {
    const s = handSpeeds(syntheticSwing())
    expect(s[0]).toBe(0)
    expect(s.slice(1, 5).every((v) => v === 0)).toBe(true) // frames 1–4 still
    expect(s[5]).toBeGreaterThan(0) // motion has begun
  })
})

describe('detectEvents', () => {
  it('finds address, top, and impact on a clean swing', () => {
    expect(detectEvents(syntheticSwing())).toEqual({ address: 4, top: 14, impact: 22 })
  })

  it('is invariant to the vertical direction of the backswing', () => {
    // hands going the other way vertically must not flip the detected frames
    expect(detectEvents(syntheticSwing(-1))).toEqual({ address: 4, top: 14, impact: 22 })
  })

  it('always returns events in order', () => {
    const e = detectEvents(syntheticSwing())!
    expect(e.address).toBeLessThan(e.top)
    expect(e.top).toBeLessThan(e.impact)
  })

  it('returns null for too-short or motionless clips', () => {
    expect(detectEvents([])).toBeNull()
    expect(detectEvents(Array.from({ length: 20 }, (_, i) => frameAt(i, 0)))).toBeNull()
  })

  it('is not fooled by a single-frame jitter spike after the top', () => {
    // A real top around frame 18, then a lone noisy frame at 26 (mid-downswing)
    // that pokes just above it. Reading the raw vertical extreme would call 26
    // the top and collapse the downswing to a couple of frames (the 47:1 tempo
    // bug at high sample rates); smoothing the top search must ignore the spike.
    const ys: number[] = []
    for (let i = 0; i < 5; i++) ys.push(0) // still 0–4
    for (let i = 1; i <= 13; i++) ys.push((10 / 13) * i) // backswing 5–17 → 10
    ys.push(10, 10) // plateau 18–19 (true top ~18)
    for (let i = 1; i <= 18; i++) ys.push(10 - (10 / 18) * i) // downswing 20–37 → 0
    for (let i = 1; i <= 5; i++) ys.push(i) // follow-through 38–42
    ys[26] = 11 // the jitter spike, above the real top

    const e = detectEvents(ys.map((y, i) => frameAt(i, y)))!
    expect(e).not.toBeNull()
    expect(e.top).toBeLessThan(24) // the real top, not the spike at 26
    expect(e.impact - e.top).toBeGreaterThan(4) // downswing didn't collapse
    expect(e.address).toBeLessThan(e.top)
  })
})
