import { useId } from 'react'
import './ScrubBar.css'

/*
 * The scrub bar is a measuring stick, not a media player. Ticks, a timecode in
 * mono, a station you drag along a ruled track. Address, top, and impact get
 * marked on it as labeled stations once event detection exists (M2); until then
 * the track is a clean ruler and the timecode is the only number, because it's
 * the only one we can honestly report.
 */

type Props = {
  /** 0..1 position of the playhead. */
  progress: number
  /** Seconds. */
  current: number
  duration: number
  onSeek: (fraction: number) => void
  disabled?: boolean
}

function timecode(t: number): string {
  if (!Number.isFinite(t)) return '0.00'
  return t.toFixed(2)
}

export function ScrubBar({ progress, current, duration, onSeek, disabled }: Props) {
  const id = useId()
  // A tick every tenth of the track — the ruler's graduations.
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10)

  return (
    <div className={`scrub${disabled ? ' scrub--disabled' : ''}`}>
      <div className="scrub__head">
        <span className="label">scrub</span>
        <span className="scrub__timecode data">
          {timecode(current)}<span className="scrub__timecode-sep">/</span>{timecode(duration)}
          <span className="scrub__timecode-unit">s</span>
        </span>
      </div>

      <label className="scrub__track" htmlFor={id}>
        <span className="sr-only">Scrub through the swing</span>
        <div className="scrub__ruler" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className={`scrub__tick${t === 0 || t === 1 || t === 0.5 ? ' scrub__tick--major' : ''}`}
              style={{ left: `${t * 100}%` }}
            />
          ))}
          <span className="scrub__fill" style={{ width: `${progress * 100}%` }} />
          <span className="scrub__station" style={{ left: `${progress * 100}%` }} />
        </div>
        <input
          id={id}
          className="scrub__input"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={Number.isFinite(progress) ? progress : 0}
          disabled={disabled}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
