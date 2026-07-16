import { Button } from '../design/Button'
import { HandTrace } from '../components/HandTrace'
import { TopoField } from '../components/TopoField'
import { Flagstick } from '../components/Flagstick'
import { Reveal } from '../components/Reveal'
import { MetricRow, type Metric } from '../components/MetricRow'
import { HoleCTA } from '../components/HoleCTA'
import './Landing.css'

/*
 * The landing page — a full spread now: a fairway-green hero where the swing
 * trace draws itself, the three-step method, the measured set against tour
 * bands, the reference-line differentiator, a privacy note, and a closing hole.
 * More color and motion than the original brief, at Lucas's direction, but the
 * survey language holds it together: line work, mono numerals, chalk = correct,
 * flag = deviation.
 */

// The measured set, grouped by swing region. Ranges are published tour benchmarks
// (sourced in docs/SWING_SPEC.md), shown before any upload as factual reference — not a
// user's numbers. Rotational figures are depth-limited from one camera; the caveat below
// says so rather than implying false precision.
const METRIC_GROUPS: { group: string; items: Metric[] }[] = [
  {
    group: 'Rotation',
    items: [
      { name: 'Shoulder turn · top', unit: '°', scaleMin: 0, scaleMax: 120, lo: 85, hi: 95 },
      { name: 'Hip turn · top', unit: '°', scaleMin: 0, scaleMax: 120, lo: 40, hi: 50 },
      { name: 'X-factor · top', unit: '°', scaleMin: 0, scaleMax: 70, lo: 40, hi: 50 },
      { name: 'Hip rotation · impact', unit: '°', scaleMin: 0, scaleMax: 70, lo: 35, hi: 45 },
    ],
  },
  {
    group: 'Tilt & bend',
    items: [
      { name: 'Shoulder tilt · top', unit: '°', scaleMin: 0, scaleMax: 60, lo: 33, hi: 39 },
      {
        name: 'Spine angle',
        unit: '°',
        scaleMin: -6,
        scaleMax: 6,
        lo: -2,
        hi: 2,
        note: 'held within tolerance of the address angle',
      },
    ],
  },
  {
    group: 'Posture & base',
    items: [
      { name: 'Lead knee flex · top', unit: '°', scaleMin: 0, scaleMax: 60, lo: 25, hi: 41 },
      { name: 'Trail knee flex · top', unit: '°', scaleMin: 0, scaleMax: 60, lo: 16, hi: 32 },
    ],
  },
  {
    group: 'Timing',
    items: [{ name: 'Tempo · back : down', unit: ': 1', scaleMin: 1, scaleMax: 4, lo: 2.8, hi: 3.2, decimals: 1 }],
  },
]

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

export function Landing({ onStart }: { onStart: () => void }) {
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
              <span className="hero__local label">Runs in your browser · nothing uploaded</span>
            </div>
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

      {/* ── The reference line ───────────────────────────── */}
      <section className="section reference">
        <div className="reference__grid">
          <Reveal className="reference__figure-col">
            <div className="reference__figure">
              <svg viewBox="0 0 360 420" fill="none" className="reference__svg" aria-hidden="true">
                {/* reference (chalk) */}
                <path
                  className="reference__ref"
                  d="M176 392 C205 300 250 210 268 132 C282 74 268 58 240 78 C214 96 196 210 182 300 C178 336 176 372 178 392"
                />
                {/* user (ink) — over the top, diverging at the top */}
                <path
                  className="reference__user"
                  d="M172 392 C198 300 242 214 276 150 C300 104 292 74 258 92 C226 108 200 214 184 300 C179 336 176 372 178 392"
                />
                {/* divergence segment (flag) */}
                <path
                  className="reference__diverge"
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
          <div className="privacy__mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="10" y="20" width="28" height="20" rx="2" />
              <path d="M16 20 V15 a8 8 0 0 1 16 0 V20" />
              <circle cx="24" cy="30" r="3" />
            </svg>
          </div>
          <div>
            <h2 className="privacy__title">Your footage never leaves your device.</h2>
            <p className="privacy__body">
              Pose extraction, measurement, and the overlay all run in your browser. No
              upload, no server, no account. It's a real privacy feature — so we say so.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Closing hole ─────────────────────────────────── */}
      <HoleCTA onStart={onStart} />
    </div>
  )
}
