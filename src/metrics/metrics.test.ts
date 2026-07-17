import { describe, it, expect } from 'vitest'
import type { Vec3 } from '../lib/vec'
import { Landmark } from '../pose/landmarks'
import {
  spineAngleDeg,
  kneeFlexDeg,
  shoulderTiltDeg,
  xFactorDeg,
  headMovement,
  tempoRatio,
  compareState,
  toMetric,
} from './index'

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
