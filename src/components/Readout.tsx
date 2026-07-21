import './Readout.css'

/*
 * A readout in the caddie's margin: a label, a measured value in mono, and the
 * tour range it's judged against. The value is chalk when it lands inside the
 * range, flag when it falls outside — the only reason color ever changes here.
 *
 * Until a swing is measured there is no honest number to show, so the readout
 * sits in its awaiting state: an em dash and the range we'll compare against.
 * We never show a plausible-looking placeholder value. A fake number that looks
 * right is worse than an empty one.
 */

type Props = {
  label: string
  /** Tour range, shown as the margin note under every readout. */
  range: string
  /** Measured value + unit. Omit entirely until a real measurement exists. */
  value?: string
  unit?: string
  /** Only meaningful when a value is present. */
  state?: 'in-range' | 'out-of-range'
  /** How much to trust the value — badged next to it so a rough estimate reads
   *  as rough. Only shown when a value is present. */
  confidence?: 'good' | 'moderate' | 'low'
}

const CONF_LABEL: Record<NonNullable<Props['confidence']>, string> = {
  good: 'solid',
  moderate: 'estimate',
  low: 'rough',
}

export function Readout({ label, range, value, unit, state, confidence }: Props) {
  const awaiting = value == null
  return (
    <div className={`readout${awaiting ? ' readout--awaiting' : ''}`}>
      <div className="label readout__label">{label}</div>
      <div className={`readout__value data readout__value--${awaiting ? 'awaiting' : state}`}>
        {awaiting ? '—' : value}
        {!awaiting && unit ? <span className="readout__unit">{unit}</span> : null}
        {!awaiting && confidence ? (
          <span className={`readout__conf readout__conf--${confidence}`}>{CONF_LABEL[confidence]}</span>
        ) : null}
      </div>
      <div className="label readout__range">
        <span className="readout__range-key">tour</span> {range}
      </div>
    </div>
  )
}
