import { describe, it, expect } from 'vitest'
import { checkFraming } from './framing'
import type { PoseFrame, Swing } from './types'

// Build a frame where all 33 landmarks default to high visibility, with named
// overrides for specific indices.
function frame(overrides: Record<number, number> = {}): PoseFrame {
  const visibility = Array.from({ length: 33 }, (_, i) => overrides[i] ?? 0.9)
  return { index: 0, timeMs: 0, landmarks: [], world: [], visibility }
}

function swingOf(f: PoseFrame, count = 20): Swing {
  return { fps: 60, frames: Array.from({ length: count }, () => f), events: null }
}

const FEET = [27, 28, 31, 32]
const lowFeet = Object.fromEntries(FEET.map((i) => [i, 0.05]))

describe('checkFraming', () => {
  it('flags no pose when coverage is low', () => {
    expect(checkFraming(swingOf(frame()), 0.2)?.kind).toBe('no-pose')
  })

  it('flags no pose when almost no frames tracked', () => {
    expect(checkFraming(swingOf(frame(), 3), 0.9)?.kind).toBe('no-pose')
  })

  it('flags a cropped body when the feet drop out of frame', () => {
    const hint = checkFraming(swingOf(frame(lowFeet)), 0.9)
    expect(hint?.kind).toBe('cropped')
  })

  it('stays quiet on a well-framed, fully-tracked clip', () => {
    expect(checkFraming(swingOf(frame()), 0.95)).toBeNull()
  })

  it('does not guess the camera angle — a fully-visible clip is never flagged', () => {
    // Face landmarks read as ~fully visible from every angle (MediaPipe reports
    // occluded-but-present landmarks as visible), so a clip with everything in
    // view must not be second-guessed for its angle.
    const highFace = Object.fromEntries([0, 2, 5, 9, 10].map((i) => [i, 1]))
    expect(checkFraming(swingOf(frame(highFace)), 0.95)).toBeNull()
  })
})
