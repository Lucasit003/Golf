import { useReveal } from '../lib/useReveal'
import { useCountUp } from '../lib/useCountUp'
import './MetricRow.css'

/*
 * A measured quantity shown against its tour band: the name, a scale with the
 * in-range window drawn in chalk, and the numeric range in mono. On scroll-in
 * the band sweeps out and the numbers tick up to their values — a gauge
 * settling. These are published tour ranges (sourced in docs/SWING_SPEC.md),
 * not a user's measurements, so they're safe to state before any upload.
 */

export type Metric = {
  name: string
  unit: string
  scaleMin: number
  scaleMax: number
  lo: number
  hi: number
  decimals?: number
  note?: string
}

const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100

export function MetricRow({ metric, index }: { metric: Metric; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const d = metric.decimals ?? 0
  const lo = useCountUp(metric.lo, shown, { decimals: d, duration: 800 })
  const hi = useCountUp(metric.hi, shown, { decimals: d, duration: 900 })

  const left = pct(metric.lo, metric.scaleMin, metric.scaleMax)
  const right = pct(metric.hi, metric.scaleMin, metric.scaleMax)

  return (
    <div
      ref={ref}
      className={`metric${shown ? ' metric--in' : ''}`}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className="metric__head">
        <span className="metric__name">{metric.name}</span>
        <span className="metric__range data">
          {lo}<span className="metric__dash">–</span>{hi}
          <span className="metric__unit">{metric.unit}</span>
        </span>
      </div>

      <div className="metric__scale" aria-hidden="true">
        <div className="metric__track" />
        <div
          className="metric__band"
          style={{
            left: `${left}%`,
            width: shown ? `${right - left}%` : '0%',
            transitionDelay: `${index * 90 + 120}ms`,
          }}
        />
        <div className="metric__band-cap" style={{ left: `${left}%` }} />
        <div className="metric__band-cap" style={{ left: `${right}%` }} />
      </div>

      {metric.note ? <div className="metric__note label">{metric.note}</div> : null}
    </div>
  )
}
