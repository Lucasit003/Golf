import { describe, it, expect } from 'vitest'
import type { PoseFrame, Vec3 } from './types'
import { Landmark, LANDMARK_COUNT } from './landmarks'
import {
  drawSkeleton,
  POSE_CONNECTIONS,
  POSE_JOINTS,
  DEFAULT_SKELETON_STYLE,
  type Ctx2D,
} from './skeleton'
import { handTracePoints, pointsToPath } from './trace'

function stubCtx() {
  const calls = { clearRect: 0, beginPath: 0, moveTo: 0, lineTo: 0, stroke: 0, arc: 0, fill: 0 }
  const ctx: Ctx2D & { _c: typeof calls } = {
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    lineCap: '',
    lineJoin: '',
    clearRect: () => void calls.clearRect++,
    beginPath: () => void calls.beginPath++,
    moveTo: () => void calls.moveTo++,
    lineTo: () => void calls.lineTo++,
    stroke: () => void calls.stroke++,
    arc: () => void calls.arc++,
    fill: () => void calls.fill++,
    _c: calls,
  }
  return ctx
}

// 33 landmarks all at a visible position, full visibility.
function fullLandmarks(): { lm: { x: number; y: number }[]; vis: number[] } {
  const lm = Array.from({ length: LANDMARK_COUNT }, (_, i) => ({ x: (i % 5) / 5, y: (i % 7) / 7 }))
  const vis = Array.from({ length: LANDMARK_COUNT }, () => 1)
  return { lm, vis }
}

describe('POSE_CONNECTIONS / POSE_JOINTS', () => {
  it('reference only valid landmark indices', () => {
    for (const [a, b] of POSE_CONNECTIONS) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(LANDMARK_COUNT)
    }
    for (const j of POSE_JOINTS) expect(j).toBeLessThan(LANDMARK_COUNT)
  })
})

describe('drawSkeleton', () => {
  it('clears then draws every bone when all landmarks are visible', () => {
    const ctx = stubCtx()
    const { lm, vis } = fullLandmarks()
    const drawn = drawSkeleton(ctx, lm, vis, 640, 480)
    expect(ctx._c.clearRect).toBe(1)
    expect(drawn).toBe(POSE_CONNECTIONS.length)
    expect(ctx._c.stroke).toBe(POSE_CONNECTIONS.length)
    expect(ctx._c.arc).toBe(POSE_JOINTS.length) // one dot per visible joint
  })

  it('skips bones whose endpoint is below the visibility threshold', () => {
    const ctx = stubCtx()
    const { lm, vis } = fullLandmarks()
    vis[Landmark.LEFT_WRIST] = 0.1 // below default 0.5
    const drawn = drawSkeleton(ctx, lm, vis, 640, 480)
    // one bone touches LEFT_WRIST (elbow→wrist), so one fewer than the full set
    expect(drawn).toBe(POSE_CONNECTIONS.length - 1)
  })

  it('handles empty landmarks without throwing', () => {
    const ctx = stubCtx()
    expect(drawSkeleton(ctx, [], [], 100, 100)).toBe(0)
    expect(ctx._c.clearRect).toBe(1)
  })

  it('uses the default style constants', () => {
    expect(DEFAULT_SKELETON_STYLE.minVisibility).toBeGreaterThan(0)
  })
})

// ── trace ──────────────────────────────────────────────────

function frame(index: number, wristY: number, vis = 1): PoseFrame {
  const landmarks: Vec3[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0 }))
  landmarks[Landmark.LEFT_WRIST] = { x: 0.4, y: wristY, z: 0 }
  landmarks[Landmark.RIGHT_WRIST] = { x: 0.6, y: wristY, z: 0 }
  const visibility = Array.from({ length: LANDMARK_COUNT }, () => 1)
  visibility[Landmark.LEFT_WRIST] = vis
  visibility[Landmark.RIGHT_WRIST] = vis
  return { index, timeMs: index * 10, landmarks, world: landmarks, visibility }
}

describe('handTracePoints', () => {
  it('returns the hand-midpoint per frame', () => {
    const pts = handTracePoints([frame(0, 0.2), frame(1, 0.4)])
    expect(pts).toEqual([
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.4 },
    ])
  })

  it('skips frames where a wrist is not visible enough', () => {
    const pts = handTracePoints([frame(0, 0.2), frame(1, 0.4, 0.1), frame(2, 0.6)])
    expect(pts).toHaveLength(2)
    expect(pts.map((p) => p.y)).toEqual([0.2, 0.6])
  })

  it('respects a from/to slice', () => {
    const frames = [frame(0, 0.1), frame(1, 0.2), frame(2, 0.3), frame(3, 0.4)]
    expect(handTracePoints(frames, { from: 1, to: 2 })).toHaveLength(2)
  })
})

describe('pointsToPath', () => {
  it('builds an SVG path, M then L', () => {
    expect(pointsToPath([{ x: 1, y: 2 }, { x: 3, y: 4 }], 0)).toBe('M 1 2 L 3 4')
  })
  it('is empty for no points', () => {
    expect(pointsToPath([])).toBe('')
  })
})
