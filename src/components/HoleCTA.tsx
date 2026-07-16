import { Button } from '../design/Button'
import { TopoField } from './TopoField'
import { useReveal } from '../lib/useReveal'
import './HoleCTA.css'

/*
 * Closing call to action on a fairway-green ground. When it scrolls in, a ball
 * reads the green, rolls its line, and drops in the hole beside the pin. One
 * motion, self-contained. Reduced motion shows the ball already holed.
 */

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
              d="M70 235 C180 252 300 214 398 174"
            />

            {/* The hole. */}
            <ellipse className="hole-cta__hole" cx="404" cy="172" rx="16" ry="6" />

            {/* The pin. */}
            <line className="hole-cta__pin" x1="404" y1="60" x2="404" y2="172" />
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
