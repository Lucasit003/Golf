import './Flagstick.css'

/*
 * A pin with a waving flag, stuck in a hole with a cast shadow. The one overt
 * piece of golf iconography — used as a small mark, never as decoration for its
 * own sake. The flag ripples on a slow loop; the hole and shadow ground it.
 */

export function Flagstick({ number = 18, className }: { number?: number; className?: string }) {
  return (
    <svg
      className={`flagstick${className ? ` ${className}` : ''}`}
      viewBox="0 0 160 220"
      role="img"
      aria-label={`Flagstick, hole ${number}`}
      fill="none"
    >
      {/* Hole + green shadow. */}
      <ellipse className="flagstick__green" cx="80" cy="196" rx="46" ry="12" />
      <ellipse className="flagstick__hole" cx="80" cy="194" rx="15" ry="4.5" />

      {/* The pin. */}
      <line className="flagstick__pin" x1="80" y1="24" x2="80" y2="194" />
      <circle className="flagstick__ball-top" cx="80" cy="24" r="4" />

      {/* The flag — a rippling triangle with a numeral. */}
      <g className="flagstick__flag">
        <path
          className="flagstick__cloth"
          d="M80 30 C104 26 118 40 138 34 C132 50 132 58 138 74 C118 68 104 82 80 78 Z"
        />
        <text className="flagstick__num" x="103" y="60">
          {number}
        </text>
      </g>
    </svg>
  )
}
