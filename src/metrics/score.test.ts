import { describe, it, expect } from 'vitest'
import { scoreMetric, swingScore, scoreLabel } from './score'

describe('scoreMetric', () => {
  it('gives full marks anywhere inside the tour band', () => {
    expect(scoreMetric('tempo', 2.8)).toBe(100) // lo edge
    expect(scoreMetric('tempo', 3.0)).toBe(100) // centre
    expect(scoreMetric('tempo', 3.2)).toBe(100) // hi edge
  })

  it('scores the percentage away from the nearest tour number', () => {
    // tempo 2.24 is 20% below the 2.8 lower edge → 80.
    expect(scoreMetric('tempo', 2.24)).toBe(80)
    // shoulder turn 12° short of the 85° edge → ~86%.
    expect(scoreMetric('shoulderTurn', 73)).toBe(86)
  })

  it('decays further the further outside the band', () => {
    const near = scoreMetric('tempo', 2.6) // 0.2 below
    const far = scoreMetric('tempo', 2.0) // 0.8 below
    expect(near).toBeLessThan(100)
    expect(far).toBeLessThan(near)
    expect(far).toBeGreaterThanOrEqual(0)
  })

  it('measures a zero-centred metric against its scale, not its tiny edge', () => {
    // spine drift 4.4° is 2.4° past the ±2° band; against half the ±6 scale (6°)
    // that's 40% away → 60, not the 0 an edge-relative percentage would give.
    expect(scoreMetric('spineAngle', 4.4)).toBe(60)
  })

  it('never goes below zero for a wild reading', () => {
    expect(scoreMetric('tempo', 20)).toBe(0)
  })
})

describe('swingScore', () => {
  it('returns null when nothing is measured', () => {
    expect(swingScore({})).toBeNull()
    expect(swingScore({ tempo: null })).toBeNull()
  })

  it('scores a perfect tempo at 100', () => {
    const r = swingScore({ tempo: 3.0 })
    expect(r?.score).toBe(100)
    expect(r?.label).toBe('Tour')
    expect(r?.breakdown).toHaveLength(1)
  })

  it('is the plain average of the measured metrics', () => {
    // tempo perfect (100), xFactor way off (0) → average 50.
    const r = swingScore({ tempo: 3.0, xFactor: 200 })
    expect(r).not.toBeNull()
    expect(r!.score).toBe(50)
    expect(r!.breakdown).toHaveLength(2)
  })

  it('reports each measured metric in the breakdown with a state', () => {
    const r = swingScore({ tempo: 2.6 })
    expect(r!.breakdown[0].id).toBe('tempo')
    expect(r!.breakdown[0].state).toBe('close')
  })
})

describe('scoreLabel', () => {
  it('maps score ranges to golf tiers', () => {
    expect(scoreLabel(95)).toBe('Tour')
    expect(scoreLabel(82)).toBe('Scratch')
    expect(scoreLabel(72)).toBe('Single-digit')
    expect(scoreLabel(60)).toBe('Club')
    expect(scoreLabel(30)).toBe('Weekend')
  })
})
