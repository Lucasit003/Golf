/*
 * A top-down schematic of the two camera placements, so "down-the-line" and
 * "face-on" read at a glance instead of as words. Decorative — the text tips
 * beside it carry the same information for assistive tech.
 */
export function FilmDiagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 208" className={className} fill="none" aria-hidden="true">
      {/* target line + flag */}
      <line
        x1="40" y1="92" x2="298" y2="92"
        stroke="var(--fairway)" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round"
      />
      <line x1="300" y1="92" x2="300" y2="66" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M300 68 L314 72 L300 76 Z" fill="var(--flag)" />
      <text x="292" y="108" className="film-dia__t" textAnchor="end">target line</text>

      {/* the ball */}
      <circle cx="150" cy="92" r="4.5" fill="var(--cream)" stroke="var(--ink)" strokeWidth="1" />

      {/* the golfer at address, from above: feet spread at the back, body leaning
          over the ball, head and hands down at the line */}
      <ellipse cx="139" cy="50" rx="5.5" ry="3.2" fill="var(--ink-soft)" />
      <ellipse cx="161" cy="50" rx="5.5" ry="3.2" fill="var(--ink-soft)" />
      <path
        d="M135 53 Q130 65 137 79 L163 79 Q170 65 165 53 Q150 59 135 53 Z"
        fill="var(--ink-soft)"
      />
      <circle cx="150" cy="82" r="6.5" fill="var(--ink-soft)" />
      <path d="M140 77 Q149 85 150 89" stroke="var(--ink-soft)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M160 77 Q151 85 150 89" stroke="var(--ink-soft)" strokeWidth="2.2" strokeLinecap="round" />

      {/* down-the-line camera: behind the ball, on the line, looking down it */}
      <g>
        <path d="M46 82 L150 88 L150 96 L46 102 Z" fill="var(--fairway)" opacity="0.1" />
        <rect x="30" y="84" width="16" height="16" rx="3" fill="var(--paper-deep)" stroke="var(--ink)" strokeWidth="1.4" />
        <circle cx="43" cy="92" r="2" fill="var(--ink)" />
        <text x="6" y="126" className="film-dia__t film-dia__t--key" textAnchor="start">Down-the-line</text>
        <text x="6" y="140" className="film-dia__t" textAnchor="start">behind the ball</text>
      </g>

      {/* face-on camera: in front, square to the chest, looking back at the golfer */}
      <g>
        <path d="M142 168 L150 66 L158 66 L166 168 Z" fill="var(--fairway)" opacity="0.1" />
        <rect x="140" y="168" width="20" height="16" rx="3" fill="var(--paper-deep)" stroke="var(--ink)" strokeWidth="1.4" />
        <circle cx="150" cy="176" r="2" fill="var(--ink)" />
        <text x="150" y="202" className="film-dia__t film-dia__t--key" textAnchor="middle">Face-on · square to your chest</text>
      </g>
    </svg>
  )
}
