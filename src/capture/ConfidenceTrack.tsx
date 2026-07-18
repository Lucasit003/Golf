import { useMemo } from 'react'
import type { Swing } from '../pose/types'
import { swingConfidences } from '../pose/confidence'
import './ConfidenceTrack.css'

/*
 * A sparkline of tracking confidence across the swing, aligned to the scrub
 * timeline so weak stretches sit under the part of the swing they belong to.
 * Answers M1's real question — where is tracking failing? — at a glance.
 * Segments dip to flag where confidence falls below the usable line.
 */

const USABLE = 0.5

export function ConfidenceTrack({ swing, durationMs }: { swing: Swing; durationMs: number }) {
  const { areaPath, linePath } = useMemo(() => {
    const conf = swingConfidences(swing)
    const last = swing.frames.length ? swing.frames[swing.frames.length - 1].timeMs : 0
    const span = durationMs > 0 ? durationMs : last || 1
    const W = 100
    const H = 24
    const pts = swing.frames.map((f, i) => ({
      x: Math.min(W, Math.max(0, (f.timeMs / span) * W)),
      y: H - conf[i] * H,
    }))
    if (pts.length === 0) return { areaPath: '', linePath: '' }
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${H} L ${pts[0].x.toFixed(2)} ${H} Z`
    return { areaPath: area, linePath: line }
  }, [swing, durationMs])

  return (
    <div className="conf-track">
      <div className="conf-track__head">
        <span className="label">Tracking confidence · across the swing</span>
      </div>
      <svg className="conf-track__svg" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        {/* the usable line */}
        <line
          x1="0"
          y1={24 - USABLE * 24}
          x2="100"
          y2={24 - USABLE * 24}
          className="conf-track__usable"
        />
        <path d={areaPath} className="conf-track__area" />
        <path d={linePath} className="conf-track__line" />
      </svg>
    </div>
  )
}
