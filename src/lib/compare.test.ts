import { describe, it, expect } from 'vitest'
import { scoreAgainstBand, distanceToBand, defaultMargin } from './compare'

const band = { lo: 40, hi: 50 }

describe('distanceToBand', () => {
  it('is 0 inside the band, including the edges', () => {
    expect(distanceToBand(45, band)).toBe(0)
    expect(distanceToBand(40, band)).toBe(0)
    expect(distanceToBand(50, band)).toBe(0)
  })
  it('is the gap to the nearest edge outside', () => {
    expect(distanceToBand(37, band)).toBe(3)
    expect(distanceToBand(56, band)).toBe(6)
  })
})

describe('defaultMargin', () => {
  it('is a quarter of the band width', () => {
    expect(defaultMargin({ lo: 40, hi: 80 })).toBe(10)
  })
  it('is floored at 2 for tight bands', () => {
    expect(defaultMargin({ lo: 40, hi: 44 })).toBe(2) // 25% of 4 = 1 → floored to 2
  })
})

describe('scoreAgainstBand', () => {
  it('reads inside the band as "in", edges included', () => {
    expect(scoreAgainstBand(45, band, 6)).toBe('in')
    expect(scoreAgainstBand(40, band, 6)).toBe('in')
    expect(scoreAgainstBand(50, band, 6)).toBe('in')
  })

  it('reads within the margin as "close", on both sides', () => {
    expect(scoreAgainstBand(38, band, 6)).toBe('close') // 2 below
    expect(scoreAgainstBand(55, band, 6)).toBe('close') // 5 above
  })

  it('treats the exact margin edge as still "close"', () => {
    expect(scoreAgainstBand(34, band, 6)).toBe('close') // exactly lo - margin
    expect(scoreAgainstBand(56, band, 6)).toBe('close') // exactly hi + margin
  })

  it('reads beyond the margin as "far"', () => {
    expect(scoreAgainstBand(33.9, band, 6)).toBe('far')
    expect(scoreAgainstBand(20, band, 6)).toBe('far')
    expect(scoreAgainstBand(70, band, 6)).toBe('far')
  })

  it('uses the default margin when none is given', () => {
    // default margin for 40–50 is 2.5
    expect(scoreAgainstBand(48, band)).toBe('in')
    expect(scoreAgainstBand(38, band)).toBe('close') // 2 below ≤ 2.5
    expect(scoreAgainstBand(36, band)).toBe('far') // 4 below > 2.5
  })
})
