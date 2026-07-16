import { Button } from '../design/Button'
import { HandTrace } from '../components/HandTrace'
import './Landing.css'

/*
 * The landing page. One thesis, stated once: this is what we do to a swing. The
 * reference trace draws itself on load and then rests — the page's only motion.
 * One clear action. No photography, no stock golfers, no green grass. Line work
 * on paper. If it needs a photo to look good, the drawing isn't good enough.
 */

// What Contour surveys, with the tour benchmark each is judged against. These
// are published tour ranges, not a user's measurements — factual reference, safe
// to show before anything is uploaded. Sourced in docs/SWING_SPEC.md.
const SURVEYED = [
  { metric: 'Tempo', range: '2.8 – 3.2 : 1' },
  { metric: 'X-factor', range: '40 – 50°' },
  { metric: 'Hip rotation', range: '35 – 45°' },
  { metric: 'Spine angle', range: '± 2° address' },
]

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="landing">
      <div className="landing__spread">
        <div className="landing__col">
          <p className="landing__eyebrow label">Swing survey · down-the-line</p>
          <h1 className="landing__headline">
            Film a swing.
            <br />
            Get it surveyed.
          </h1>
          <p className="landing__lede">
            Contour tracks your body through the swing and measures it against tour
            benchmarks — then draws the reference over your own footage, so the
            difference is a line you can see, not a note you have to trust.
          </p>

          <div className="landing__actions">
            <Button onClick={onStart}>
              Upload a swing
              <span className="btn__tick">↑</span>
            </Button>
            <span className="landing__local label">Runs in your browser · nothing uploaded</span>
          </div>

          <dl className="landing__surveyed">
            <dt className="label landing__surveyed-head">What it measures</dt>
            {SURVEYED.map((s) => (
              <div key={s.metric} className="landing__surveyed-row">
                <dd className="landing__surveyed-metric">{s.metric}</dd>
                <dd className="landing__surveyed-range data">{s.range}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="landing__drawing">
          <div className="landing__plate">
            <div className="landing__plate-head">
              <span className="label">Fig. 1 — hand path, one swing</span>
              <span className="label data landing__plate-tag">REF</span>
            </div>
            <HandTrace draw className="landing__trace" />
            <div className="landing__plate-foot label">
              addr → top → impact · a single continuous contour
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
