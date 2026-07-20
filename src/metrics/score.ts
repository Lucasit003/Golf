/*
 * Swing score — one number, 0–100, for how close a swing sits to the tour
 * benchmarks. This is what the leaderboard ranks by.
 *
 * Two honesty rules baked in:
 *  - Only real, measured readings count. A null (unmeasured) metric is skipped,
 *    never guessed. With just tempo measured today, the score is a tempo score;
 *    it strengthens on its own as more metrics come online.
 *  - Each metric is weighted by the confidence we hold in it (see benchmarks.ts),
 *    so the trustworthy tempo dominates and the depth-limited angle metrics only
 *    nudge the total. We never let a shaky number swing the score.
 *
 * Pure and side-effect free — feed it real values or don't call it.
 */

import { BENCHMARK_BY_ID, type BenchmarkId, type Confidence } from './benchmarks'
import { distanceToBand, scoreAgainstBand, type CompareState } from '../lib/compare'

/** How much each metric counts, by how much we trust it. */
const CONFIDENCE_WEIGHT: Record<Confidence, number> = { good: 1, moderate: 0.5, low: 0.25 }

/**
 * 0–100 for a single metric: full marks anywhere inside the tour band (being in
 * range is tour-level), then a linear decay by distance from the nearest edge.
 * It reaches zero about a third of the metric's on-screen scale beyond the band,
 * so the falloff is proportionate to what's plausible for that metric.
 */
export function scoreMetric(id: BenchmarkId, value: number): number {
  const b = BENCHMARK_BY_ID[id]
  const d = distanceToBand(value, b.band)
  if (d === 0) return 100
  const zeroAt = (b.scale.max - b.scale.min) * 0.35
  return Math.max(0, Math.round((1 - d / zeroAt) * 100))
}

export type MetricScore = {
  id: BenchmarkId
  value: number
  score: number
  state: CompareState
  weight: number
}

export type SwingScore = {
  /** 0–100, confidence-weighted mean of the measured metrics. */
  score: number
  /** A golf-flavoured tier for the number. */
  label: string
  /** Per-metric contributions, for the "why" breakdown. */
  breakdown: MetricScore[]
}

/**
 * The overall swing score: a confidence-weighted mean of every measured metric's
 * closeness to its tour band. Returns null when nothing has been measured yet.
 */
export function swingScore(readings: Partial<Record<BenchmarkId, number | null>>): SwingScore | null {
  const breakdown: MetricScore[] = []
  let weightSum = 0
  let acc = 0
  for (const id of Object.keys(readings) as BenchmarkId[]) {
    const value = readings[id]
    if (value == null) continue
    const s = scoreMetric(id, value)
    const weight = CONFIDENCE_WEIGHT[BENCHMARK_BY_ID[id].confidence]
    breakdown.push({ id, value, score: s, state: scoreAgainstBand(value, BENCHMARK_BY_ID[id].band), weight })
    acc += s * weight
    weightSum += weight
  }
  if (weightSum === 0) return null
  const score = Math.round(acc / weightSum)
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
