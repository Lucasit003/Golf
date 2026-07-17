import { describe, it, expect } from 'vitest'
import { toPoseFrame, type MpResult } from './mapResult'
import { estimateFps } from './extract'
import type { PoseFrame } from './types'

describe('toPoseFrame', () => {
  const result: MpResult = {
    landmarks: [[{ x: 0.1, y: 0.2, z: 0.3, visibility: 0.9 }, { x: 0.4, y: 0.5, z: 0.6 }]],
    worldLandmarks: [[{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }]],
  }

  it('maps image + world landmarks and visibility, with index and time', () => {
    const f = toPoseFrame(7, 233, result)!
    expect(f.index).toBe(7)
    expect(f.timeMs).toBe(233)
    expect(f.landmarks[0]).toEqual({ x: 0.1, y: 0.2, z: 0.3 })
    expect(f.world[1]).toEqual({ x: 4, y: 5, z: 6 })
  })

  it('defaults missing visibility to 0', () => {
    const f = toPoseFrame(0, 0, result)!
    expect(f.visibility).toEqual([0.9, 0])
  })

  it('returns null when no pose is present', () => {
    expect(toPoseFrame(0, 0, { landmarks: [], worldLandmarks: [] })).toBeNull()
    expect(toPoseFrame(0, 0, {})).toBeNull()
    expect(toPoseFrame(0, 0, { landmarks: [[]], worldLandmarks: [[]] })).toBeNull()
  })
})

describe('estimateFps', () => {
  const at = (times: number[]): PoseFrame[] =>
    times.map((t, i) => ({ index: i, timeMs: t, landmarks: [], world: [], visibility: [] }))

  it('returns 0 with fewer than two frames', () => {
    expect(estimateFps([])).toBe(0)
    expect(estimateFps(at([0]))).toBe(0)
  })

  it('reads ~30fps from ~33ms gaps', () => {
    expect(estimateFps(at([0, 33, 67, 100, 133]))).toBe(30)
  })

  it('reads 25fps from 40ms gaps', () => {
    expect(estimateFps(at([0, 40, 80, 120]))).toBe(25)
  })

  it('is robust to a single irregular gap (uses the median)', () => {
    // one long stall shouldn't drag the estimate off 30fps
    expect(estimateFps(at([0, 33, 66, 400, 433, 466]))).toBe(30)
  })
})
