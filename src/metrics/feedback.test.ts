import { describe, it, expect } from 'vitest'
import { swingFeedback } from './feedback'

describe('swingFeedback', () => {
  it('sorts in-range metrics into strengths and out-of-range into flaws', () => {
    const fb = swingFeedback({ tempo: 3.0, shoulderTurn: 60 })
    expect(fb.strengths.map((n) => n.id)).toContain('tempo')
    expect(fb.flaws.map((n) => n.id)).toContain('shoulderTurn')
  })

  it('orders flaws worst-first and gives a directional cue', () => {
    // shoulderTurn 40 (far below 85) is a worse miss than tempo 2.6 (just below 2.8)
    const fb = swingFeedback({ tempo: 2.6, shoulderTurn: 40 })
    expect(fb.flaws[0].id).toBe('shoulderTurn')
    expect(fb.flaws[0].note.length).toBeGreaterThan(0)
  })

  it('skips unmeasured metrics', () => {
    const fb = swingFeedback({ tempo: 3.0, xFactor: null })
    expect([...fb.strengths, ...fb.flaws].map((n) => n.id)).not.toContain('xFactor')
  })
})
