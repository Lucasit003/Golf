/*
 * Swing score — one number, 0–100, for how close a swing sits to the tour
 * benchmarks. This is what the leaderboard ranks by.
 *
 * The model: each measured metric scores its percentage closeness to the tour
 * band, and the swing score is the plain average of those percentages. Every
 * measured metric counts equally; a null (unmeasured) metric is skipped, never
 * guessed. Simple and legible — "you were, on average, 78% of the way to tour."
 *
 * Pure and side-effect free — feed it real values or don't call it.
 */

import { BENCHMARK_BY_ID, type BenchmarkId } from './benchmarks'
import { scoreAgainstBand, type CompareState } from '../lib/compare'

/**
 * 0–100 for a single metric: how close it sits to the tour band, as a percentage.
 * Full marks anywhere inside the band. Outside it, the score is 100 minus how far
 * past the band the value sits, taken as a percentage of the tour number it
 * missed — so "12° short of a 90° turn" reads as ~86, not an abstract distance.
 *
 * One special case: a metric whose tour band straddles zero (spine-angle change,
 * where tour is "hold it, within ±2°") has no meaningful nonzero target to take a
 * percentage of, so its miss is measured against half its plausible on-screen
 * range instead — otherwise a tiny absolute drift reads as a huge percentage.
 */
export function scoreMetric(id: BenchmarkId, value: number): number {
  const b = BENCHMARK_BY_ID[id]
  const { lo, hi } = b.band
  if (value >= lo && value <= hi) return 100
  const beyond = value < lo ? lo - value : value - hi
  const zeroCentered = lo < 0 && hi > 0
  const reference = zeroCentered ? (b.scale.max - b.scale.min) / 2 : Math.abs(value < lo ? lo : hi)
  const pctAway = reference > 0 ? (beyond / reference) * 100 : 100
  return Math.max(0, Math.round(100 - pctAway))
}

export type MetricScore = {
  id: BenchmarkId
  value: number
  score: number
  state: CompareState
}

export type SwingScore = {
  /** 0–100, the average of the measured metrics' closeness to tour. */
  score: number
  /** A golf-flavoured tier for the number. */
  label: string
  /** Per-metric contributions, for the "why" breakdown. */
  breakdown: MetricScore[]
}

/**
 * The overall swing score: the plain average of every measured metric's percent
 * closeness to its tour band. Returns null when nothing has been measured yet.
 */
export function swingScore(readings: Partial<Record<BenchmarkId, number | null>>): SwingScore | null {
  const breakdown: MetricScore[] = []
  let sum = 0
  for (const id of Object.keys(readings) as BenchmarkId[]) {
    const value = readings[id]
    if (value == null) continue
    const s = scoreMetric(id, value)
    breakdown.push({ id, value, score: s, state: scoreAgainstBand(value, BENCHMARK_BY_ID[id].band) })
    sum += s
  }
  if (breakdown.length === 0) return null
  const score = Math.round(sum / breakdown.length)
  return { score, label: scoreLabel(score), breakdown }
}

/** A golf-flavoured tier for a 0–100 score. */
export function scoreLabel(score: number): string {
  if (score >= 90) return 'Tour'
  if (score >= 80) return 'Scratch'
  if (score >= 70) return 'Single-digit'
  if (score >= 55) return 'Club'
  return 'Weekend'
}
