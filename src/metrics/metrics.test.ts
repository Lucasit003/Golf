import { describe, it, expect } from 'vitest'
import { radians, type Vec3 } from '../lib/vec'
import { Landmark } from '../pose/landmarks'
import {
  spineAngleDeg,
  kneeFlexDeg,
  shoulderTiltDeg,
  xFactorDeg,
  axialTurnDeg,
  headMovement,
  tempoRatio,
  compareState,
  toMetric,
  computeSwingMetrics,
} from './index'
import type { PoseFrame } from '../pose/types'

// Build a 33-length world array with specific joints set; the rest are origin.
function world(set: Partial<Record<Landmark, Vec3>>): Vec3[] {
  const arr: Vec3[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  for (const [k, v] of Object.entries(set)) arr[Number(k)] = v as Vec3
  return arr
}

describe('spineAngleDeg', () => {
  it('is 0° for a vertical spine', () => {
    const w = world({
      [Landmark.LEFT_SHOULDER]: { x: 0, y: 1, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 0, y: 1, z: 0 },
      [Landmark.LEFT_HIP]: { x: 0, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 0, y: 0, z: 0 },
    })
    expect(spineAngleDeg(w)).toBeCloseTo(0)
  })
  it('reads the tilt of a leaned spine', () => {
    const w = world({
      [Landmark.LEFT_SHOULDER]: { x: 0.3, y: 1, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 0.3, y: 1, z: 0 },
      [Landmark.LEFT_HIP]: { x: 0, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 0, y: 0, z: 0 },
    })
    expect(spineAngleDeg(w)).toBeCloseTo((Math.atan(0.3) * 180) / Math.PI, 4)
  })
})

describe('kneeFlexDeg', () => {
  it('is 0° for a straight leg', () => {
    const w = world({
      [Landmark.LEFT_HIP]: { x: 0, y: 2, z: 0 },
      [Landmark.LEFT_KNEE]: { x: 0, y: 1, z: 0 },
      [Landmark.LEFT_ANKLE]: { x: 0, y: 0, z: 0 },
    })
    expect(kneeFlexDeg(w, 'left')).toBeCloseTo(0)
  })
  it('is 90° for a right-angle bend', () => {
    const w = world({
      [Landmark.RIGHT_HIP]: { x: 0, y: 2, z: 0 },
      [Landmark.RIGHT_KNEE]: { x: 0, y: 1, z: 0 },
      [Landmark.RIGHT_ANKLE]: { x: 1, y: 1, z: 0 },
    })
    expect(kneeFlexDeg(w, 'right')).toBeCloseTo(90)
  })
})

describe('shoulderTiltDeg', () => {
  it('is 0° for a level shoulder line', () => {
    const w = world({
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 0, z: 0 },
    })
    expect(shoulderTiltDeg(w)).toBeCloseTo(0)
  })
  it('reads the tilt of a raised trail shoulder', () => {
    const w = world({
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 1, z: 0 },
    })
    // vec (2,1,0) vs its horizontal projection (2,0,0) → atan(1/2)
    expect(shoulderTiltDeg(w)).toBeCloseTo((Math.atan(0.5) * 180) / Math.PI, 4)
  })
})

describe('xFactorDeg', () => {
  // hips along x; shoulders rotated ±30° about vertical in the horizontal plane
  const rot = (sign: 1 | -1) =>
    world({
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
      [Landmark.LEFT_SHOULDER]: { x: -Math.cos(Math.PI / 6), y: 0, z: -sign * Math.sin(Math.PI / 6) },
      [Landmark.RIGHT_SHOULDER]: { x: Math.cos(Math.PI / 6), y: 0, z: sign * Math.sin(Math.PI / 6) },
    })

  it('reports the separation magnitude (30°)', () => {
    expect(Math.abs(xFactorDeg(rot(1)))).toBeCloseTo(30)
  })
  it('flips sign with the direction of turn', () => {
    expect(Math.sign(xFactorDeg(rot(1)))).toBe(-Math.sign(xFactorDeg(rot(-1))))
  })
  it('is 0° when shoulders and hips are aligned', () => {
    const w = world({
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 0, z: 0 },
    })
    expect(xFactorDeg(w)).toBeCloseTo(0)
  })
})

describe('axialTurnDeg', () => {
  // shoulder line along x at address; rotated 40° about vertical at "top"
  const flat = world({
    [Landmark.LEFT_SHOULDER]: { x: -1, y: 0, z: 0 },
    [Landmark.RIGHT_SHOULDER]: { x: 1, y: 0, z: 0 },
  })
  const turned = world({
    [Landmark.LEFT_SHOULDER]: { x: -Math.cos(radians(40)), y: 0, z: Math.sin(radians(40)) },
    [Landmark.RIGHT_SHOULDER]: { x: Math.cos(radians(40)), y: 0, z: -Math.sin(radians(40)) },
  })
  it('is 0° with no turn', () => {
    expect(axialTurnDeg(flat, flat, 'shoulders')).toBeCloseTo(0)
  })
  it('reads the turn magnitude between two frames', () => {
    expect(Math.abs(axialTurnDeg(flat, turned, 'shoulders'))).toBeCloseTo(40)
  })
})

describe('computeSwingMetrics', () => {
  const w = (set: Partial<Record<Landmark, Vec3>>): Vec3[] => world(set)
  const frame = (world: Vec3[]): PoseFrame => ({ index: 0, timeMs: 0, landmarks: [], world, visibility: [] })
  // address, top, impact frames with a vertical spine and a level base
  const frames: PoseFrame[] = [
    frame(w({
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 1, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 1, z: 0 },
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
    })),
    frame(w({
      // top: shoulders turned 45° about vertical
      [Landmark.LEFT_SHOULDER]: { x: -Math.cos(radians(45)), y: 1, z: Math.sin(radians(45)) },
      [Landmark.RIGHT_SHOULDER]: { x: Math.cos(radians(45)), y: 1, z: -Math.sin(radians(45)) },
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
    })),
    frame(w({
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 1, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 1, z: 0 },
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
    })),
  ]

  it('produces values at the event frames', () => {
    const m = computeSwingMetrics(frames, { address: 0, top: 1, impact: 2 })
    expect(m.shoulderTurn).toBeCloseTo(45)
    expect(m.shoulderTilt).toBeCloseTo(0)
    expect(m.spineAngle).toBeCloseTo(0) // vertical at both address and impact
  })

  it('returns nothing without events', () => {
    expect(computeSwingMetrics(frames, null)).toEqual({})
  })

  it('skips metrics whose event frame is out of range', () => {
    const m = computeSwingMetrics(frames, { address: 0, top: 99, impact: 2 })
    expect(m.shoulderTurn).toBeUndefined() // needs top
    expect(m.spineAngle).toBeCloseTo(0) // needs address + impact only
  })
})

describe('headMovement', () => {
  it('measures nose drift normalized by shoulder width', () => {
    const address = world({ [Landmark.NOSE]: { x: 0, y: 0, z: 0 } })
    const now = world({
      [Landmark.NOSE]: { x: 0.2, y: -0.1, z: 0 },
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 0, z: 0 }, // width 2
    })
    const m = headMovement(address, now)
    expect(m.lateral).toBeCloseTo(0.1)
    expect(m.vertical).toBeCloseTo(-0.05)
  })
})

describe('tempoRatio', () => {
  it('is backswing frames ÷ downswing frames', () => {
    expect(tempoRatio({ address: 0, top: 24, impact: 32 })).toBeCloseTo(3)
  })
  it('returns null for degenerate events', () => {
    expect(tempoRatio({ address: 0, top: 0, impact: 10 })).toBeNull() // no backswing
    expect(tempoRatio({ address: 0, top: 20, impact: 20 })).toBeNull() // no downswing
  })
})

describe('compareState + toMetric', () => {
  it('scores a value against its catalog band', () => {
    expect(compareState('tempo', 3.0)).toBe('in')
    expect(compareState('tempo', null)).toBeNull()
    expect(compareState('xFactor', 20)).toBe('far')
  })
  it('wraps a value with catalog metadata, keeping null first-class', () => {
    const m = toMetric('shoulderTilt', null)
    expect(m.value).toBeNull()
    expect(m.unit).toBe('°')
    expect(m.confidence).toBe('moderate')
    expect(m.benchmark).toEqual({ min: 33, max: 39, source: expect.any(String) })
  })
})
