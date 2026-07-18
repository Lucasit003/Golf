import { Button } from '../design/Button'
import { HandTrace } from '../components/HandTrace'
import { TopoField } from '../components/TopoField'
import { Flagstick } from '../components/Flagstick'
import { Reveal } from '../components/Reveal'
import { MetricRow, type Metric } from '../components/MetricRow'
import { ComparisonExplainer } from '../components/ComparisonExplainer'
import { HoleCTA } from '../components/HoleCTA'
import { benchmarksByGroup } from '../metrics/benchmarks'
import './Landing.css'

/*
 * The landing page — a full spread now: a fairway-green hero where the swing
 * trace draws itself, the three-step method, the measured set against tour
 * bands, the reference-line differentiator, a privacy note, and a closing hole.
 * More color and motion than the original brief, at Lucas's direction, but the
 * survey language holds it together: line work, mono numerals, chalk = correct,
 * flag = deviation.
 */

// The measured set, grouped by swing region — derived from the single benchmark
// source of truth (src/metrics/benchmarks.ts) so the copy and the math can never
// disagree. Ranges are published tour benchmarks (sourced there and in
// docs/SWING_SPEC.md), shown before any upload as factual reference, not a user's
// numbers. The caveat below flags what's depth-limited or off-limits.
const METRIC_GROUPS: { group: string; items: Metric[] }[] = benchmarksByGroup().map((g) => ({
  group: g.group,
  items: g.items.map(
    (b): Metric => ({
      name: b.label,
      unit: b.unit,
      scaleMin: b.scale.min,
      scaleMax: b.scale.max,
      lo: b.band.lo,
      hi: b.band.hi,
      decimals: b.decimals,
      note: b.note,
    }),
  ),
}))

const STEPS = [
  {
    n: '01',
    title: 'Film',
    body: 'Down-the-line, tripod, 240fps. Full body in frame, feet to hands.',
    icon: (
      <>
        <rect x="10" y="16" width="30" height="22" rx="2" />
        <path d="M40 24 L52 18 V36 L40 30 Z" />
        <circle cx="24" cy="27" r="6" />
      </>
    ),
  },
  {
    n: '02',
    title: 'Survey',
    body: 'We track your body through the swing and measure the angles that matter.',
    icon: (
      <>
        <path d="M8 40 C22 12 42 12 56 40" />
        <path d="M14 40 C24 22 40 22 50 40" />
        <circle cx="32" cy="26" r="2.5" />
      </>
    ),
  },
  {
    n: '03',
    title: 'Compare',
    body: 'Tour benchmarks and a reference line, drawn over your own footage.',
    icon: (
      <>
        <path d="M12 44 C20 20 34 30 30 14" />
        <path d="M20 44 C30 22 44 32 40 12" className="step-icon__ghost" />
        <circle cx="30" cy="14" r="2.5" />
        <circle cx="40" cy="12" r="2.5" className="step-icon__ghost" />
      </>
    ),
  },
]

export function Landing({ onStart, onCompare }: { onStart: () => void; onCompare: () => void }) {
  return (
    <div className="landing">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <TopoField tone="light" className="hero__topo" />
        <div className="hero__inner">
          <div className="hero__copy">
            <p className="hero__eyebrow label">Swing survey · down-the-line</p>
            <h1 className="hero__headline">
              Film a swing.
              <br />
              Get it <span className="hero__headline-accent">surveyed.</span>
            </h1>
            <p className="hero__lede">
              Contour tracks your body through the swing, measures it against tour
              benchmarks, and draws the reference over your own footage — so the
              difference is a line you can see, not a note you have to trust.
            </p>
            <div className="hero__actions">
              <Button variant="cream" onClick={onStart}>
                Upload a swing
                <span className="btn__tick">↑</span>
              </Button>
              <button className="hero__secondary" onClick={onCompare}>
                or compare two swings
                <span aria-hidden="true"> ⇄</span>
              </button>
            </div>
            <span className="hero__local label">Runs in your browser · nothing uploaded</span>
          </div>

          <div className="hero__drawing">
            <div className="hero__plate">
              <div className="hero__plate-head">
                <span className="label hero__plate-title">Fig. 1 — hand path, one swing</span>
                <span className="label data hero__plate-tag">REF</span>
              </div>
              <div className="hero__trace-wrap">
                <HandTrace draw tone="cream" className="hero__trace" />
                <Flagstick number={18} className="hero__flag" />
              </div>
              <div className="hero__plate-foot label">
                addr → top → impact · a single continuous contour
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="section how">
        <Reveal>
          <p className="section__eyebrow label">The method</p>
          <h2 className="section__title">Three steps, one swing.</h2>
        </Reveal>
        <ol className="how__grid">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 110} className="how__item">
              <div className="how__card">
                <span className="how__n data">{s.n}</span>
                <svg className="step-icon" viewBox="0 0 64 52" fill="none" aria-hidden="true">
                  {s.icon}
                </svg>
                <h3 className="how__card-title">{s.title}</h3>
                <p className="how__card-body">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── What it measures ─────────────────────────────── */}
      <section className="section measures">
        <div className="measures__grid">
          <Reveal className="measures__intro">
            <p className="section__eyebrow label">The set</p>
            <h2 className="section__title">Measured against the tour.</h2>
            <p className="section__lede">
              Every quantity is judged against a published tour range. Inside the window
              is <span className="ink-chalk">chalk</span>; outside is{' '}
              <span className="ink-flag">flag</span>. That's the only reason a number ever
              changes color.
            </p>
          </Reveal>
          <div className="measures__list">
            {METRIC_GROUPS.map((g) => (
              <div className="measures__group" key={g.group}>
                <div className="measures__group-label label">{g.group}</div>
                {g.items.map((m, i) => (
                  <MetricRow key={m.name} metric={m} index={i} />
                ))}
              </div>
            ))}
            <p className="measures__caveat">
              Rotation (turn, X-factor) needs depth we're still proving out from a single
              camera — those ship with a confidence flag, never false precision. And the
              club-and-ball numbers — <span className="ink-flag">compression, attack angle,
              spin</span> — need a launch monitor; weight and pressure need a force plate.
              Contour measures the body, and says so instead of faking the rest.
            </p>
          </div>
        </div>
      </section>

      {/* ── How a reading gets scored ────────────────────── */}
      <section className="section scoring">
        <div className="scoring__grid">
          <Reveal className="scoring__copy">
            <p className="section__eyebrow label">The read</p>
            <h2 className="section__title">In, close, or off.</h2>
            <p className="section__lede">
              Every measurement lands in one of three states against its tour range —
              <span className="ink-chalk"> in range</span>,
              <span className="ink-near"> close</span>, or
              <span className="ink-flag"> off</span>. The color is the verdict; you don't
              have to read a table to know where you stand.
            </p>
          </Reveal>
          <Reveal className="scoring__panel" delay={120}>
            <ComparisonExplainer />
          </Reveal>
        </div>
      </section>

      {/* ── The reference line ───────────────────────────── */}
      <section className="section reference">
        <div className="reference__grid">
          <Reveal className="reference__figure-col">
            <div className="reference__figure">
              <TopoField tone="ink" className="reference__topo" />
              <div className="reference__plate-head">
                <span className="label reference__plate-title">Fig. 2 — your line vs the tour</span>
                <span className="label data reference__plate-tag">M4</span>
              </div>
              <svg viewBox="56 24 360 388" fill="none" className="reference__svg" aria-hidden="true">
                {/* reference (chalk) */}
                <path
                  className="reference__ref"
                  pathLength={1}
                  d="M176 392 C205 300 250 210 268 132 C282 74 268 58 240 78 C214 96 196 210 182 300 C178 336 176 372 178 392"
                />
                {/* user (ink) — over the top, diverging at the top */}
                <path
                  className="reference__user"
                  pathLength={1}
                  d="M172 392 C198 300 242 214 276 150 C300 104 292 74 258 92 C226 108 200 214 184 300 C179 336 176 372 178 392"
                />
                {/* divergence segment (flag) */}
                <path
                  className="reference__diverge"
                  pathLength={1}
                  d="M258 92 C300 104 300 128 276 150"
                />
                <circle className="reference__dot-ref" cx="240" cy="78" r="5" />
                <circle className="reference__dot-user" cx="258" cy="92" r="5" />
              </svg>
              <div className="reference__legend">
                <span className="reference__key"><i className="reference__swatch reference__swatch--user" />your line</span>
                <span className="reference__key"><i className="reference__swatch reference__swatch--ref" />reference</span>
                <span className="reference__key"><i className="reference__swatch reference__swatch--diverge" />off tolerance</span>
              </div>
            </div>
          </Reveal>
          <Reveal className="reference__copy" delay={120}>
            <p className="section__eyebrow label">What makes it different</p>
            <h2 className="section__title">The reference line.</h2>
            <p className="section__lede">
              Other apps hand you a number. Contour draws the tour move as a ghost over
              your own — time-matched, scaled to your build, turned to your camera. Where
              your hands leave the reference at the top, the line goes red. You see the
              gap instead of reading about it.
            </p>
            <p className="reference__foot label">Reference overlay · milestone 4</p>
          </Reveal>
        </div>
      </section>

      {/* ── Private by design ────────────────────────────── */}
      <section className="section privacy">
        <Reveal className="privacy__inner">
          <div className="privacy__seal" aria-hidden="true">
            <svg viewBox="0 0 96 96" fill="none">
              <circle cx="48" cy="48" r="45" className="privacy__seal-ring" />
              <circle cx="48" cy="48" r="38" className="privacy__seal-ring privacy__seal-ring--inner" />
              <rect x="36" y="46" width="24" height="18" rx="2" className="privacy__seal-lock" />
              <path d="M41 46 V41 a7 7 0 0 1 14 0 V46" className="privacy__seal-lock" />
              <circle cx="48" cy="55" r="2.6" className="privacy__seal-lock" />
            </svg>
          </div>
          <p className="section__eyebrow label privacy__eyebrow">On-device · client-side</p>
          <h2 className="privacy__title">Your footage never leaves your device.</h2>
          <p className="privacy__body">
            Pose extraction, measurement, and the overlay all run in your browser. No
            upload, no server, no account. It's a real privacy feature — so we say so.
          </p>
        </Reveal>
      </section>

      {/* ── Closing hole ─────────────────────────────────── */}
      <HoleCTA onStart={onStart} />
    </div>
  )
}
