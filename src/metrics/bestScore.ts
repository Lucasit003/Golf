import { useEffect, useState } from 'react'

/*
 * Your personal best swing score, kept on the device. It gives the score
 * something to chase before the community leaderboard exists — and it's the
 * same number that will seed your leaderboard entry later. Local only; nothing
 * is uploaded.
 */

const KEY = 'setjis.bestScore'

export function getBestScore(): number | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw == null ? null : Number(raw)
  } catch {
    return null
  }
}

/** Pure resolve: given the stored best and a new score, what's the best now? */
export function nextBest(prev: number | null, score: number): { best: number; isNewBest: boolean } {
  if (prev == null) return { best: score, isNewBest: false } // first score isn't a "new best"
  if (score > prev) return { best: score, isNewBest: true }
  return { best: prev, isNewBest: false }
}

/**
 * Track the personal best against a live score. `isNewBest` is true only when a
 * score beats a previously-set record (the very first score just sets the bar).
 */
export function useBestScore(currentScore: number | null): { best: number | null; isNewBest: boolean } {
  const [best, setBest] = useState<number | null>(() => getBestScore())
  const [isNewBest, setIsNewBest] = useState(false)

  useEffect(() => {
    if (currentScore == null) {
      setIsNewBest(false)
      return
    }
    const { best: nb, isNewBest: beat } = nextBest(getBestScore(), currentScore)
    if (beat || getBestScore() == null) {
      try {
        localStorage.setItem(KEY, String(nb))
      } catch {
        /* private mode — the best just won't persist */
      }
    }
    setBest(nb)
    setIsNewBest(beat)
  }, [currentScore])

  return { best, isNewBest }
}
