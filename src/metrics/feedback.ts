import { BENCHMARK_BY_ID, type BenchmarkId } from './benchmarks'
import { scoreMetric } from './score'
import { scoreAgainstBand } from '../lib/compare'

/*
 * Turn measured metrics into plain-language strengths and flaws for the post-track
 * reveal. A metric inside its tour band is a strength; outside, a flaw with a
 * short coaching cue keyed to which way it missed. Flaws are ordered worst-first
 * so the reveal leads with what matters most.
 */

export type Note = {
  id: BenchmarkId
  label: string
  value: string
  /** Coaching cue (flaw) or affirmation (strength). */
  note: string
  /** The metric's 0–100 closeness, for ordering. */
  score: number
}

export type SwingFeedback = { strengths: Note[]; flaws: Note[] }

// Cue for missing a metric low / high. Kept short — a nudge, not a lesson.
const TIPS: Partial<Record<BenchmarkId, { low: string; high: string }>> = {
  tempo: {
    low: 'Transition’s rushed — feel a smoother, unhurried backswing before you fire.',
    high: 'Backswing’s a touch slow — let the change of direction flow a bit quicker.',
  },
  shoulderTurn: {
    low: 'Turn the shoulders fuller behind the ball for more coil and width.',
    high: 'Big shoulder turn — keep it connected so you don’t overswing.',
  },
  hipTurn: {
    low: 'Let the hips turn a little more to support the shoulder coil.',
    high: 'Hips are spinning early — feel them stay loaded a beat longer.',
  },
  hipRotationImpact: {
    low: 'Clear the hips more through impact — open them toward the target.',
    high: 'Hips are very open at impact — make sure the strike stays centered.',
  },
  xFactor: {
    low: 'Not much shoulder-over-hip separation — coil the upper body against a quieter lower.',
    high: 'Huge separation — powerful, but keep it repeatable and in sequence.',
  },
  shoulderTilt: {
    low: 'Add a touch of trail-shoulder tilt to get behind the ball.',
    high: 'A lot of tilt — watch that it doesn’t drop you too far behind it.',
  },
  spineAngle: {
    low: 'Posture held nicely.',
    high: 'You’re coming out of your posture — hold your address spine angle through the ball.',
  },
  leadKneeFlex: {
    low: 'Lead knee straightens early — keep a little flex to post up against.',
    high: 'Lead knee stays deep — feel it firm up to brace the strike.',
  },
  trailKneeFlex: {
    low: 'Trail knee straightens in the backswing — keep its flex to stay loaded.',
    high: 'Trail knee is very bent — steady it so the base stays stable.',
  },
}

function fmt(id: BenchmarkId, value: number): string {
  const b = BENCHMARK_BY_ID[id]
  return `${value.toFixed(b.decimals ?? 0)}${b.unit}`
}

export function swingFeedback(readings: Partial<Record<BenchmarkId, number | null>>): SwingFeedback {
  const strengths: Note[] = []
  const flaws: Note[] = []
  for (const id of Object.keys(readings) as BenchmarkId[]) {
    const value = readings[id]
    if (value == null) continue
    const b = BENCHMARK_BY_ID[id]
    const label = b.label.split(' · ')[0]
    const score = scoreMetric(id, value)
    const state = scoreAgainstBand(value, b.band)
    if (state === 'in') {
      strengths.push({ id, label, value: fmt(id, value), note: `Right in the tour range.`, score })
    } else {
      const dir = value < b.band.lo ? 'low' : 'high'
      const tip = TIPS[id]?.[dir] ?? `Outside the tour range (${b.band.lo}–${b.band.hi}${b.unit}).`
      flaws.push({ id, label, value: fmt(id, value), note: tip, score })
    }
  }
  strengths.sort((a, b) => b.score - a.score)
  flaws.sort((a, b) => a.score - b.score) // worst (lowest closeness) first
  return { strengths, flaws }
}
