/*
 * Comparison scoring — how a measured reading sits against a tour range.
 *
 * Three states, in the survey's language:
 *   in    — inside the tour window            → chalk  (correct)
 *   close — outside, but within a margin       → near   (watch)
 *   far   — beyond the margin                  → flag   (deviation)
 *
 * This is a deliberate extension of the strict two-state (chalk / flag) palette,
 * at Lucas's request: "in standard / close / far." Pure and side-effect free, so
 * it can be unit-tested the moment real metric values exist (M3). It does NOT
 * invent a value — feed it a real measurement or don't call it.
 */

export type Band = { lo: number; hi: number }
export type CompareState = 'in' | 'close' | 'far'

/**
 * Default "close" margin: a quarter of the band's width, floored at a small
 * absolute amount so a very tight band still has a sensible near-zone.
 */
export function defaultMargin(band: Band): number {
  return Math.max(2, (band.hi - band.lo) * 0.25)
}

/** Signed distance from the nearest edge of the band. 0 while inside. */
export function distanceToBand(value: number, band: Band): number {
  if (value < band.lo) return band.lo - value
  if (value > band.hi) return value - band.hi
  return 0
}

/**
 * Score a reading against a band. `margin` is how far outside still counts as
 * "close"; omit it to use defaultMargin.
 */
export function scoreAgainstBand(value: number, band: Band, margin = defaultMargin(band)): CompareState {
  const d = distanceToBand(value, band)
  if (d === 0) return 'in'
  if (d <= margin) return 'close'
  return 'far'
}

/** The token name for a state — so UI never hardcodes a color per state. */
export const STATE_TOKEN: Record<CompareState, string> = {
  in: 'var(--chalk)',
  close: 'var(--near)',
  far: 'var(--flag)',
}

/** Short human label for a state. */
export const STATE_LABEL: Record<CompareState, string> = {
  in: 'in range',
  close: 'close',
  far: 'off',
}
