import { describe, it, expect } from 'vitest'
import { frameAngles } from './annotate'
import type { PoseFrame } from './types'
import type { Vec3 } from '../lib/vec'
import { Landmark } from './landmarks'

function frameWith(set: Partial<Record<Landmark, Vec3>>): PoseFrame {
  const world: Vec3[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  for (const [k, v] of Object.entries(set)) world[Number(k)] = v as Vec3
  return { index: 0, timeMs: 0, landmarks: [], world, visibility: [] }
}

describe('frameAngles', () => {
  it('reads spine, knee flex and shoulder tilt off one frame', () => {
    const f = frameWith({
      // upright, level shoulders
      [Landmark.LEFT_SHOULDER]: { x: -1, y: 1, z: 0 },
      [Landmark.RIGHT_SHOULDER]: { x: 1, y: 1, z: 0 },
      [Landmark.LEFT_HIP]: { x: -1, y: 0, z: 0 },
      [Landmark.RIGHT_HIP]: { x: 1, y: 0, z: 0 },
      // straight left leg, right leg bent 90°
      [Landmark.LEFT_KNEE]: { x: -1, y: -1, z: 0 },
      [Landmark.LEFT_ANKLE]: { x: -1, y: -2, z: 0 },
      [Landmark.RIGHT_KNEE]: { x: 1, y: -1, z: 0 },
      [Landmark.RIGHT_ANKLE]: { x: 2, y: -1, z: 0 },
    })
    const a = frameAngles(f)
    expect(a.spine).toBeCloseTo(0)
    expect(a.shoulderTilt).toBeCloseTo(0)
    expect(a.leftKnee).toBeCloseTo(0) // straight
    expect(a.rightKnee).toBeCloseTo(90) // right-angle bend
  })
})
