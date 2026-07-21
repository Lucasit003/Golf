import { describe, it, expect } from 'vitest'
import { nextBest } from './bestScore'

describe('nextBest', () => {
  it('sets the bar on the first score without calling it a new best', () => {
    expect(nextBest(null, 72)).toEqual({ best: 72, isNewBest: false })
  })

  it('flags a genuine improvement as a new best', () => {
    expect(nextBest(72, 88)).toEqual({ best: 88, isNewBest: true })
  })

  it('keeps the record when the score is lower or equal', () => {
    expect(nextBest(88, 60)).toEqual({ best: 88, isNewBest: false })
    expect(nextBest(88, 88)).toEqual({ best: 88, isNewBest: false })
  })
})
