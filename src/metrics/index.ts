/*
 * The metric layer, composed. Low-level geometry stays in geometry.ts; this is
 * where a raw value gets attached to its benchmark, confidence, and source to
 * become a Metric the UI can render. A `null` value is a valid, first-class
 * result — never a fabricated number.
 */
import type { Metric, SwingEvents } from '../pose/types'
import { BENCHMARK_BY_ID, type BenchmarkId } from './benchmarks'
import { scoreAgainstBand, type CompareState } from '../lib/compare'

export * from './geometry'
export * from './benchmarks'
export * from './events'

/** Tempo = backswing frames ÷ downswing frames. Null when events are degenerate. */
export function tempoRatio(events: SwingEvents): number | null {
  const back = events.top - events.address
  const down = events.impact - events.top
  if (back <= 0 || down <= 0) return null
  return back / down
}

/** Where a measured value sits against its band — or null when there's no value. */
export function compareState(id: BenchmarkId, value: number | null): CompareState | null {
  if (value == null) return null
  return scoreAgainstBand(value, BENCHMARK_BY_ID[id].band)
}

/** Wrap a raw value as a Metric, pulling label/unit/benchmark/confidence from the catalog. */
export function toMetric(id: BenchmarkId, value: number | null, note?: string): Metric {
  const b = BENCHMARK_BY_ID[id]
  return {
    id,
    label: b.label,
    value,
    unit: b.unit,
    benchmark: { min: b.band.lo, max: b.band.hi, source: b.source },
    confidence: b.confidence,
    note: note ?? b.note,
  }
}
