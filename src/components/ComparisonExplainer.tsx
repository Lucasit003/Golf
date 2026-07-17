import { useId, useState } from 'react'
import { scoreAgainstBand, STATE_TOKEN, STATE_LABEL } from '../lib/compare'
import { BENCHMARK_BY_ID } from '../metrics/benchmarks'
import './ComparisonExplainer.css'

/*
 * An honest, interactive demonstration of how a reading gets scored against a
 * tour range: in range → chalk, close → amber, far → flag. Drag the marker to
 * move a value across the scale and watch the state and color change.
 *
 * This is a mechanism demo, not a measurement. It never claims to be the user's
 * swing — the caption says so. Real per-swing coloring waits on pose extraction
 * (M1) and the metric math (M3); this is the display those will feed.
 */

// X-factor as the worked example — band, scale, and unit come straight from the
// benchmark source of truth, so this demo always matches the measured set above.
const XF = BENCHMARK_BY_ID.xFactor
const BAND = XF.band
const SCALE = XF.scale
const MARGIN = 6 // the "close" margin, widened from default for a legible demo
const UNIT = XF.unit

const pct = (v: number) => ((v - SCALE.min) / (SCALE.max - SCALE.min)) * 100

// Zone edges on the scale: far | close | in | close | far
const ZONES = [
  { from: SCALE.min, to: BAND.lo - MARGIN, token: 'var(--flag)' },
  { from: BAND.lo - MARGIN, to: BAND.lo, token: 'var(--near)' },
  { from: BAND.lo, to: BAND.hi, token: 'var(--chalk)' },
  { from: BAND.hi, to: BAND.hi + MARGIN, token: 'var(--near)' },
  { from: BAND.hi + MARGIN, to: SCALE.max, token: 'var(--flag)' },
]

export function ComparisonExplainer() {
  const id = useId()
  const [value, setValue] = useState(45) // starts in range
  const state = scoreAgainstBand(value, BAND, MARGIN)
  const color = STATE_TOKEN[state]

  return (
    <div className="cmp">
      <div className="cmp__readout">
        <div className="label">X-factor · your reading</div>
        <div className="cmp__value data" style={{ color }}>
          {value.toFixed(0)}
          <span className="cmp__unit">{UNIT}</span>
        </div>
        <div className="cmp__state" style={{ color }}>
          <span className="cmp__dot" style={{ background: color }} />
          {STATE_LABEL[state]}
        </div>
        <div className="cmp__tour data">
          tour {BAND.lo}–{BAND.hi}{UNIT}
        </div>
      </div>

      <label className="cmp__scale" htmlFor={id}>
        <span className="sr-only">Drag a reading across the tour range</span>
        <div className="cmp__zones" aria-hidden="true">
          {ZONES.map((z, i) => (
            <span
              key={i}
              className="cmp__zone"
              style={{
                left: `${pct(z.from)}%`,
                width: `${pct(z.to) - pct(z.from)}%`,
                background: z.token,
              }}
            />
          ))}
          {/* tick labels for the band edges */}
          <span className="cmp__edge" style={{ left: `${pct(BAND.lo)}%` }} data-v="40" />
          <span className="cmp__edge" style={{ left: `${pct(BAND.hi)}%` }} data-v="50" />
          <span className="cmp__marker" style={{ left: `${pct(value)}%`, borderColor: color }} />
        </div>
        <input
          id={id}
          className="cmp__input"
          type="range"
          min={SCALE.min}
          max={SCALE.max}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </label>

      <p className="cmp__note label">
        Drag the reading — this is how your number gets colored once it's measured. Nothing
        is measured here yet.
      </p>
    </div>
  )
}
