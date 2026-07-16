import './HandTrace.css'

/*
 * The hand trace — the one thing people remember.
 *
 * A yardage book draws a green's slope as a single continuous contour. We do
 * the same to a swing: the midpoint of the hands, tracked from address through
 * the top and down to impact and follow-through, drawn as one looping stroke.
 *
 * On the hero it draws itself once on load, then rests. In the result view the
 * user's trace sits in ink, the reference in chalk, and the segments where they
 * diverge in flag.
 *
 * This path is a representative reference swing (down-the-line, right-handed)
 * authored for the shell. Milestone 4 replaces it with a trace derived from
 * real pose data — the shape and the semantics stay exactly the same.
 */

// One closed loop: address → backswing → over the top → downswing → impact →
// follow-through. Normalized path length so the draw needs no measurement.
const SWING_PATH =
  'M 296 598 ' +
  'C 340 502 402 360 450 236 ' + // backswing, rising to the top
  'C 484 150 470 116 426 148 ' + // the loop over the top
  'C 388 176 360 306 336 430 ' + // downswing, dropping inside the line
  'C 326 486 322 552 316 590 ' + // through impact, back near address
  'C 310 556 290 492 256 410 ' + // leaving impact into the follow-through
  'C 228 344 198 250 180 192' //   follow-through, up and left to the finish

// The three swing events, marked as surveyed stations on the trace. Labels are
// offset so address and impact — which sit almost on top of each other, as they
// do on a real swing — stay legible.
type Station = {
  id: string
  label: string
  x: number
  y: number
  dx: number
  dy: number
  anchor: 'start' | 'end'
}
const STATIONS: Station[] = [
  { id: 'address', label: 'ADDR', x: 296, y: 598, dx: -13, dy: 4, anchor: 'end' },
  { id: 'top', label: 'TOP', x: 466, y: 124, dx: 13, dy: 4, anchor: 'start' },
  { id: 'impact', label: 'IMPACT', x: 316, y: 590, dx: 14, dy: 18, anchor: 'start' },
]

type Props = {
  /** Draw on mount (hero). When false, renders the finished trace immediately. */
  draw?: boolean
  /** 'ink' on paper, 'cream' on dark green. */
  tone?: 'ink' | 'cream'
  className?: string
}

export function HandTrace({ draw = false, tone = 'ink', className }: Props) {
  return (
    <svg
      className={`hand-trace hand-trace--${tone}${draw ? ' hand-trace--draw' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 620 720"
      role="img"
      aria-label="Contour trace of a reference golf swing — the path of the hands from address through the top of the backswing to impact."
      fill="none"
    >
      {/* Faint survey contour rings behind the trace — the ruled ground. */}
      <g className="hand-trace__topo" aria-hidden="true">
        {[210, 168, 126, 84].map((r) => (
          <ellipse key={r} cx="330" cy="360" rx={r} ry={r * 1.28} transform="rotate(-8 330 360)" />
        ))}
      </g>

      {/* Plumb line + ground line — the surveyor's reference frame. */}
      <g className="hand-trace__frame" aria-hidden="true">
        <line x1="300" y1="120" x2="300" y2="620" />
        <line x1="120" y1="612" x2="520" y2="612" />
      </g>

      {/* The trace itself. */}
      <path className="hand-trace__stroke" d={SWING_PATH} pathLength={1} />

      {/* Surveyed stations, revealed after the stroke lands. */}
      <g className="hand-trace__stations">
        {STATIONS.map((s) => (
          <g key={s.id} className="hand-trace__station">
            <circle cx={s.x} cy={s.y} r="5.5" />
            <text
              className="hand-trace__station-label"
              x={s.x + s.dx}
              y={s.y + s.dy}
              textAnchor={s.anchor}
            >
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
