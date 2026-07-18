import { describe, it, expect } from 'vitest'
import { swingToJSON } from './exportSwing'
import type { Swing } from './types'

const swing: Swing = {
  fps: 240,
  events: { address: 4, top: 14, impact: 22 },
  frames: [
    { index: 0, timeMs: 0, landmarks: [{ x: 0.1, y: 0.2, z: 0 }], world: [{ x: 1, y: 2, z: 3 }], visibility: [0.9] },
  ],
}

describe('swingToJSON', () => {
  it('produces a versioned, stable payload', () => {
    const json = JSON.parse(swingToJSON(swing, () => '2026-01-01T00:00:00.000Z'))
    expect(json.format).toBe('contour.swing')
    expect(json.version).toBe(1)
    expect(json.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(json.fps).toBe(240)
    expect(json.frameCount).toBe(1)
    expect(json.events).toEqual({ address: 4, top: 14, impact: 22 })
    expect(json.frames[0].world[0]).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('round-trips the frames losslessly', () => {
    const json = JSON.parse(swingToJSON(swing))
    expect(json.frames).toEqual(swing.frames)
  })
})
