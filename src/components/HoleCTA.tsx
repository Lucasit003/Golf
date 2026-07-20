import type { CSSProperties } from 'react'
import { Button } from '../design/Button'
import { useReveal } from '../lib/useReveal'
import './HoleCTA.css'

/*
 * Closing call to action on a fairway-green ground. When it scrolls in, a ball
 * rolls across the green — from ground level — up to the edge of the cup, then
 * falls in and the hole throws confetti. One motion, self-contained. Reduced
 * motion shows the ball resting at the lip, no drop.
 */

// Confetti thrown up out of the cup when the ball drops in. Directions fan
// across the upper hemisphere; colours cycle the palette.
const CONFETTI = [
  { dx: -52, dy: -44, rot: -200, c: 'var(--flag)' },
  { dx: -34, dy: -60, rot: 160, c: 'var(--brass)' },
  { dx: -16, dy: -68, rot: -120, c: 'var(--fairway-lit)' },
  { dx: 2, dy: -70, rot: 240, c: 'var(--cream)' },
  { dx: 20, dy: -66, rot: -260, c: 'var(--near)' },
  { dx: 38, dy: -56, rot: 140, c: 'var(--flag)' },
  { dx: 54, dy: -40, rot: -180, c: 'var(--fairway-lit)' },
  { dx: -46, dy: -26, rot: 120, c: 'var(--cream)' },
  { dx: 50, dy: -22, rot: -140, c: 'var(--near)' },
  { dx: -26, dy: -54, rot: 300, c: 'var(--cream)' },
  { dx: 12, dy: -60, rot: -220, c: 'var(--fairway-lit)' },
  { dx: -8, dy: -58, rot: 180, c: 'var(--flag)' },
  { dx: 30, dy: -50, rot: -300, c: 'var(--brass)' },
  { dx: 44, dy: -30, rot: 260, c: 'var(--cream)' },
]

export function HoleCTA({ onStart }: { onStart: () => void }) {
  const { ref, shown } = useReveal<HTMLDivElement>('0px 0px -20% 0px')

  return (
    <section className="hole-cta" ref={ref}>
      <div className={`hole-cta__inner${shown ? ' is-in' : ''}`}>
        <div className="hole-cta__scene" aria-hidden="true">
          <svg viewBox="0 0 520 250" fill="none" className="hole-cta__svg">
            <defs>
              <linearGradient id="hc-ground" gradientUnits="userSpaceOnUse" x1="0" y1="118" x2="0" y2="250">
                <stop offset="0" stopColor="#2f6b41" />
                <stop offset="1" stopColor="#123320" />
              </linearGradient>
              <radialGradient id="hc-depth" cx="0.5" cy="0.32" r="0.85">
                <stop offset="0" stopColor="#123020" />
                <stop offset="0.5" stopColor="#08160d" />
                <stop offset="1" stopColor="#020503" />
              </radialGradient>
              <radialGradient id="hc-ball" cx="0.38" cy="0.32" r="0.75">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#d7dccf" />
              </radialGradient>
              <filter id="hc-softshadow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* the green, receding to a horizon */}
            <rect x="0" y="118" width="520" height="132" fill="url(#hc-ground)" />

            {/* the hole, cut flush into the surface */}
            <ellipse cx="368" cy="150" rx="22" ry="7.5" fill="url(#hc-depth)" />
            {/* the white cup liner ring, just inside the rim */}
            <ellipse
              className="hole-cta__liner"
              cx="368"
              cy="150"
              rx="19.5"
              ry="6.3"
              fill="none"
            />

            {/* the pin + flag, standing out of the hole */}
            <line className="hole-cta__pin" x1="368" y1="150" x2="368" y2="48" />
            <path
              className="hole-cta__flag"
              d="M368 52 C388 48 400 60 416 55 C411 67 411 73 416 85 C400 80 388 91 368 87 Z"
            />

            {/* the ball: rolls in from the left, up to the lip, then drops in */}
            <g transform="translate(348 141)">
              <g className="hole-cta__roller">
                <g className="hole-cta__drop">
                  <ellipse
                    className="hole-cta__ballshadow"
                    cx="-1"
                    cy="10.5"
                    rx="7.5"
                    ry="2.3"
                    filter="url(#hc-softshadow)"
                  />
                  <circle className="hole-cta__ball" r="10.5" fill="url(#hc-ball)" />
                  <circle className="hole-cta__dimple" cx="-3.5" cy="-3" r="1.2" />
                  <circle className="hole-cta__dimple" cx="2.5" cy="-2" r="1.2" />
                  <circle className="hole-cta__dimple" cx="0" cy="2.5" r="1.2" />
                </g>
              </g>
            </g>

            {/* near ground: flat grass in front of the hole, drawn on top so the
                ball drops behind it — seamless with the ground, no mound. */}
            <path
              className="hole-cta__lip"
              d="M346 150.5 C354 158.5 382 158.5 390 150.5 L393 188 L343 188 Z"
              fill="url(#hc-ground)"
            />

            {/* celebration */}
            <circle className="hole-cta__burst" cx="368" cy="150" r="8" />
            <g className="hole-cta__confetti" transform="translate(368 150)">
              {CONFETTI.map((p, i) => (
                <rect
                  key={i}
                  className="hole-cta__piece"
                  x="-2.6"
                  y="-1.8"
                  width="5.2"
                  height="3.6"
                  rx="0.7"
                  style={
                    {
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      '--rot': `${p.rot}deg`,
                      '--c': p.c,
                    } as CSSProperties
                  }
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="hole-cta__copy">
          <p className="hole-cta__eyebrow label">Ready when you are</p>
          <h2 className="hole-cta__title">Put a swing on the table.</h2>
          <p className="hole-cta__lede">
            One video is all it takes. It runs in your browser, on your device — nothing
            uploaded, no account, no wait.
          </p>
          <Button variant="cream" onClick={onStart}>
            Upload a swing
            <span className="btn__tick">↑</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
