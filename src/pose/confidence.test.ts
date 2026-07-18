import { describe, it, expect } from 'vitest'
import type { PoseFrame, Vec3 } from './types'
import { LANDMARK_COUNT } from './landmarks'
import { frameConfidence, swingConfidences, overallConfidence } from './confidence'

function frame(vis: number): PoseFrame {
  const world: Vec3[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0 }))
  return {
    index: 0,
    timeMs: 0,
    landmarks: world,
    world,
    visibility: Array.from({ length: LANDMARK_COUNT }, () => vis),
  }
}

describe('confidence', () => {
  it('averages joint visibility per frame', () => {
    expect(frameConfidence(frame(0.8))).toBeCloseTo(0.8)
    expect(frameConfidence(frame(0))).toBe(0)
  })

  it('reports per-frame and overall', () => {
    const swing = { fps: 30, events: null, frames: [frame(1), frame(0.5), frame(0)] }
    expect(swingConfidences(swing)).toEqual([1, 0.5, 0])
    expect(overallConfidence(swing)).toBeCloseTo(0.5)
  })

  it('is 0 for an empty swing', () => {
    expect(overallConfidence({ fps: 0, events: null, frames: [] })).toBe(0)
  })
})
