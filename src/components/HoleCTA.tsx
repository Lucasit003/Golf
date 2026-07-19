import type { CSSProperties } from 'react'
import { Button } from '../design/Button'
import { TopoField } from './TopoField'
import { useReveal } from '../lib/useReveal'
import './HoleCTA.css'

/*
 * Closing call to action on a fairway-green ground. When it scrolls in, a ball
 * reads the green, rolls its line, and drops in the hole beside the pin. One
 * motion, self-contained. Reduced motion shows the ball already holed.
 */

// Confetti thrown up out of the cup when the ball drops. Directions fan across
// the upper hemisphere; colours cycle the palette. Each fires from the hole.
const CONFETTI = [
  { dx: -58, dy: -46, rot: -200, c: 'var(--flag)' },
  { dx: -40, dy: -62, rot: 160, c: 'var(--brass)' },
  { dx: -22, dy: -70, rot: -120, c: 'var(--fairway-lit)' },
  { dx: -6, dy: -74, rot: 240, c: 'var(--cream)' },
  { dx: 12, dy: -72, rot: -260, c: 'var(--near)' },
  { dx: 30, dy: -64, rot: 140, c: 'var(--flag)' },
  { dx: 48, dy: -50, rot: -180, c: 'var(--fairway-lit)' },
  { dx: 62, dy: -34, rot: 200, c: 'var(--cream)' },
  { dx: -50, dy: -30, rot: 120, c: 'var(--brass)' },
  { dx: 54, dy: -20, rot: -140, c: 'var(--near)' },
  { dx: -30, dy: -54, rot: 300, c: 'var(--cream)' },
  { dx: 22, dy: -58, rot: -220, c: 'var(--fairway-lit)' },
  { dx: 4, dy: -66, rot: 180, c: 'var(--flag)' },
  { dx: -14, dy: -60, rot: -300, c: 'var(--brass)' },
  { dx: 38, dy: -44, rot: 260, c: 'var(--cream)' },
  { dx: -44, dy: -40, rot: -160, c: 'var(--near)' },
]

export function HoleCTA({ onStart }: { onStart: () => void }) {
  const { ref, shown } = useReveal<HTMLDivElement>('0px 0px -20% 0px')

  return (
    <section className="hole-cta" ref={ref}>
      <TopoField tone="light" className="hole-cta__topo" />

      <div className={`hole-cta__inner${shown ? ' is-in' : ''}`}>
        <div className="hole-cta__scene" aria-hidden="true">
          <svg viewBox="0 0 520 300" fill="none" className="hole-cta__svg">
            {/* The read — the putt line. */}
            <path
              className="hole-cta__line"
              d="M70 235 C180 252 300 214 402 176"
            />

            {/* The cup, with depth — a shaded interior, a lit far wall, a back rim. */}
            <defs>
              <linearGradient id="cupDepth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#31603f" />
                <stop offset="0.45" stopColor="#0c2013" />
                <stop offset="1" stopColor="#030906" />
              </linearGradient>
            </defs>
            <g className="hole-cta__cup">
              <ellipse cx="404" cy="172" rx="16.5" ry="6.4" fill="url(#cupDepth)" />
              {/* far inner wall catching light — the cup liner */}
              <path className="hole-cta__cupwall" d="M390 170 C395 166 413 166 418 170" />
              {/* back rim */}
              <path className="hole-cta__rimback" d="M388 172 C388 167.5 420 167.5 420 172" />
            </g>

            {/* The pin, tucked into the cup. */}
            <line className="hole-cta__pin" x1="404" y1="60" x2="404" y2="170" />
            <path
              className="hole-cta__flag"
              d="M404 64 C424 60 436 72 452 67 C447 79 447 85 452 97 C436 92 424 103 404 99 Z"
            />

            {/* The ball: a roller that follows the line, holding a sinking ball. */}
            <g className="hole-cta__roller">
              <g className="hole-cta__sink">
                <circle className="hole-cta__ball" r="10" />
                <circle className="hole-cta__dimple" cx="-3" cy="-3" r="1.1" />
                <circle className="hole-cta__dimple" cx="2" cy="-2" r="1.1" />
                <circle className="hole-cta__dimple" cx="-1" cy="2" r="1.1" />
                <circle className="hole-cta__dimple" cx="4" cy="3" r="1.1" />
              </g>
            </g>

            {/* The front lip — the near grass rim that swallows the ball as it drops.
                Drawn after the ball so it occludes it on the way down. */}
            <path
              className="hole-cta__lip"
              d="M387 172 C392 178.5 416 178.5 421 172 L421 200 L387 200 Z"
            />
            <path className="hole-cta__rimfront" d="M387 172 C392 178.5 416 178.5 421 172" />

            {/* Celebration: a shock ring and confetti fired from the cup as it drops. */}
            <circle className="hole-cta__burst" cx="404" cy="172" r="7" />
            <g className="hole-cta__confetti" transform="translate(404 172)">
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
