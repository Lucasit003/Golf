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

const FACE = [0, 2, 5, 9, 10]
const FEET = [27, 28, 31, 32]
const lowFace = Object.fromEntries(FACE.map((i) => [i, 0.05]))
const highFace = Object.fromEntries(FACE.map((i) => [i, 0.95]))
const lowFeet = Object.fromEntries(FEET.map((i) => [i, 0.05]))

describe('checkFraming', () => {
  it('flags no pose when coverage is low', () => {
    expect(checkFraming(swingOf(frame()), 'down_the_line', 0.2)?.kind).toBe('no-pose')
  })

  it('flags no pose when almost no frames tracked', () => {
    expect(checkFraming(swingOf(frame(), 3), 'face_on', 0.9)?.kind).toBe('no-pose')
  })

  it('flags a cropped body when the feet drop out of frame', () => {
    // face hidden (so it's a valid DTL face-wise) but feet not visible
    const hint = checkFraming(swingOf(frame({ ...lowFace, ...lowFeet })), 'down_the_line', 0.9)
    expect(hint?.kind).toBe('cropped')
  })

  it('nudges when a face-on clip sits in the down-the-line slot', () => {
    const hint = checkFraming(swingOf(frame(highFace)), 'down_the_line', 0.9)
    expect(hint?.kind).toBe('wrong-angle')
    expect(hint?.suggest).toBe('face_on')
  })

  it('nudges when a down-the-line clip sits in the face-on slot', () => {
    const hint = checkFraming(swingOf(frame(lowFace)), 'face_on', 0.9)
    expect(hint?.kind).toBe('wrong-angle')
    expect(hint?.suggest).toBe('down_the_line')
  })

  it('stays quiet on a correct down-the-line clip (face hidden)', () => {
    expect(checkFraming(swingOf(frame(lowFace)), 'down_the_line', 0.9)).toBeNull()
  })

  it('stays quiet on a correct face-on clip (face visible)', () => {
    expect(checkFraming(swingOf(frame(highFace)), 'face_on', 0.9)).toBeNull()
  })

  it('stays quiet in the ambiguous middle rather than nagging', () => {
    const midFace = Object.fromEntries(FACE.map((i) => [i, 0.4]))
    expect(checkFraming(swingOf(frame(midFace)), 'down_the_line', 0.9)).toBeNull()
    expect(checkFraming(swingOf(frame(midFace)), 'face_on', 0.9)).toBeNull()
  })
})
