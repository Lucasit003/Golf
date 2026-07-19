/*
 * Tour benchmarks — the single source of truth for every published range the
 * app compares against. The UI (landing "what it measures") and the metric math
 * both read from here, so a number can never drift between the copy and the
 * computation. Every entry carries its source and an honest confidence; see the
 * metric catalog in docs/SWING_SPEC.md for the full provenance.
 *
 * These are facts (published ranges), not copyrighted references — safe to show
 * before any upload. See DATA_AND_LEGAL: benchmark vs. reference.
 *
 * Verified against current sources 2026-07. All values held up: tempo 3:1
 * (Tour Tempo / Yale); shoulder turn ~90°, pelvis ~45°, X-factor ~45° at top
 * (TPI / 3D norms); hip open ~36°+ and shoulder tilt ~36° at impact/top (GolfTEC
 * SwingTRU, 90M swings); lead/trail knee flex 33±8° / 24±8° at top (Sports 2022
 * systematic review). Re-check when the underlying studies are superseded.
 */

export type BenchmarkId =
  | 'tempo'
  | 'shoulderTurn'
  | 'hipTurn'
  | 'xFactor'
  | 'hipRotationImpact'
  | 'shoulderTilt'
  | 'spineAngle'
  | 'leadKneeFlex'
  | 'trailKneeFlex'

export type MetricGroup = 'Rotation' | 'Tilt & bend' | 'Posture & base' | 'Timing'
export type Confidence = 'good' | 'moderate' | 'low'

export type Benchmark = {
  id: BenchmarkId
  label: string
  unit: string
  band: { lo: number; hi: number }
  scale: { min: number; max: number } // for the on-screen range bar
  group: MetricGroup
  confidence: Confidence
  source: string
  decimals?: number
  note?: string
}

export const BENCHMARKS: Benchmark[] = [
  {
    id: 'tempo',
    label: 'Tempo · back : down',
    unit: ': 1',
    band: { lo: 2.8, hi: 3.2 },
    scale: { min: 1, max: 4 },
    group: 'Timing',
    confidence: 'good',
    decimals: 1,
    source: 'Tour Tempo (Novosel) — 21 frames back / 7 down @30fps ≈ 3:1; Yale tempo study concurs',
  },
  {
    id: 'shoulderTurn',
    label: 'Shoulder turn · top',
    unit: '°',
    band: { lo: 85, hi: 95 },
    scale: { min: 0, max: 120 },
    group: 'Rotation',
    confidence: 'low',
    source: 'TPI / 3D norms — pros ≈90° shoulders at top; Chu/Sell/Lephart (PMID 21844613)',
    note: 'axial rotation — depth-limited from one camera',
  },
  {
    id: 'hipTurn',
    label: 'Hip turn · top',
    unit: '°',
    band: { lo: 40, hi: 50 },
    scale: { min: 0, max: 120 },
    group: 'Rotation',
    confidence: 'low',
    source: 'TPI / 3D norms — pros ≈45° pelvis at top; Chu/Sell/Lephart (PMID 21844613)',
    note: 'axial rotation — depth-limited from one camera',
  },
  {
    id: 'xFactor',
    label: 'X-factor · top',
    unit: '°',
    band: { lo: 40, hi: 50 },
    scale: { min: 0, max: 70 },
    group: 'Rotation',
    confidence: 'low',
    source: 'TPI — shoulder−pelvis separation ≈45° at top (~50° stretch in transition); caveat J Appl Biomech 2016 (2D≠3D by ~16°)',
    note: 'high variance; depends on noisy monocular z',
  },
  {
    id: 'hipRotationImpact',
    label: 'Hip rotation · impact',
    unit: '°',
    band: { lo: 35, hi: 45 },
    scale: { min: 0, max: 70 },
    group: 'Rotation',
    confidence: 'low',
    source: 'GolfTEC SwingTRU (90M+ swings) — better players ≥36° hips open at impact',
    note: 'open to target; depth-limited',
  },
  {
    id: 'shoulderTilt',
    label: 'Shoulder tilt · top',
    unit: '°',
    band: { lo: 33, hi: 39 },
    scale: { min: 0, max: 60 },
    group: 'Tilt & bend',
    confidence: 'moderate',
    source: 'GolfTEC SwingTRU (90M+ swings) — better players ≈36° shoulder tilt at top',
  },
  {
    id: 'spineAngle',
    label: 'Spine angle',
    unit: '°',
    band: { lo: -2, hi: 2 },
    scale: { min: -6, max: 6 },
    group: 'Tilt & bend',
    confidence: 'moderate',
    source: '2D/3D trunk kinematics, J Appl Biomech 2016;32(1):23',
    note: 'held within tolerance of the address angle',
  },
  {
    id: 'leadKneeFlex',
    label: 'Lead knee flex · top',
    unit: '°',
    band: { lo: 25, hi: 41 },
    scale: { min: 0, max: 60 },
    group: 'Posture & base',
    confidence: 'moderate',
    source: 'Golf Swing Biomechanics systematic review, Sports 2022, 10(6):91 — lead knee ≈33±8° flexion at top',
  },
  {
    id: 'trailKneeFlex',
    label: 'Trail knee flex · top',
    unit: '°',
    band: { lo: 16, hi: 32 },
    scale: { min: 0, max: 60 },
    group: 'Posture & base',
    confidence: 'moderate',
    source: 'Sports 2022, 10(6):91 — trail knee ≈24±8° flexion at top',
  },
]

export const BENCHMARK_BY_ID: Record<BenchmarkId, Benchmark> = Object.fromEntries(
  BENCHMARKS.map((b) => [b.id, b]),
) as Record<BenchmarkId, Benchmark>

/** Benchmarks grouped by swing region, preserving array order within a group. */
export function benchmarksByGroup(): { group: MetricGroup; items: Benchmark[] }[] {
  const order: MetricGroup[] = ['Rotation', 'Tilt & bend', 'Posture & base', 'Timing']
  return order.map((group) => ({ group, items: BENCHMARKS.filter((b) => b.group === group) }))
}
