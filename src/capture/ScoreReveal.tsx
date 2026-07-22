import { useEffect, useState } from 'react'
import { useCountUp } from '../lib/useCountUp'
import type { SwingScore } from '../metrics/score'
import type { SwingFeedback } from '../metrics/feedback'
import './ScoreReveal.css'

/*
 * The post-track reveal: a swing's score counts up inside a ring, then its
 * strengths and the things to work on slide in under it. Shown once when a fresh
 * track lands. When the events aren't set yet (no honest score), it invites the
 * golfer to set them instead of faking a number.
 */

type Props = {
  open: boolean
  onClose: () => void
  score: SwingScore | null
  feedback: SwingFeedback
  best: number | null
  isNewBest: boolean
}

export function ScoreReveal({ open, onClose, score, feedback, best, isNewBest }: Props) {
  const [armed, setArmed] = useState(false)
  const value = useCountUp(score?.score ?? 0, open, { duration: 1100 })

  useEffect(() => {
    if (!open) {
      setArmed(false)
      return
    }
    const t = requestAnimationFrame(() => setArmed(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const pct = score ? score.score : 0
  const R = 54
  const C = 2 * Math.PI * R

  return (
    <div className="score-reveal" role="dialog" aria-modal="true" aria-label="Your swing score" onClick={onClose}>
      <div className={`score-reveal__card${armed ? ' is-in' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="score-reveal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <p className="score-reveal__eyebrow label">Your swing</p>

        {score ? (
          <>
            <div className="score-reveal__gauge">
              <svg viewBox="0 0 128 128" className="score-reveal__ring" aria-hidden="true">
                <circle cx="64" cy="64" r={R} className="score-reveal__ring-track" />
                <circle
                  cx="64"
                  cy="64"
                  r={R}
                  className="score-reveal__ring-fill"
                  style={{ strokeDasharray: C, strokeDashoffset: armed ? C * (1 - pct / 100) : C }}
                />
              </svg>
              <div className="score-reveal__num">
                <span className="score-reveal__score data">{value}</span>
                <span className="score-reveal__max">/ 100</span>
              </div>
            </div>

            <div className="score-reveal__tier">
              <span className="score-reveal__tier-name">{score.label}</span>
              {isNewBest ? (
                <span className="score-reveal__best score-reveal__best--new">★ New best</span>
              ) : best != null ? (
                <span className="score-reveal__best">Best {best}</span>
              ) : null}
            </div>

            {feedback.strengths.length ? (
              <section className="score-reveal__sect">
                <h3 className="score-reveal__sect-title score-reveal__sect-title--good">What’s working</h3>
                <ul className="score-reveal__list">
                  {feedback.strengths.map((n) => (
                    <li key={n.id} className="score-reveal__item score-reveal__item--good">
                      <span className="score-reveal__mark" aria-hidden="true">✓</span>
                      <span>
                        <b>{n.label}</b> <span className="data score-reveal__val">{n.value}</span> — {n.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {feedback.flaws.length ? (
              <section className="score-reveal__sect">
                <h3 className="score-reveal__sect-title score-reveal__sect-title--work">Work on this</h3>
                <ul className="score-reveal__list">
                  {feedback.flaws.map((n) => (
                    <li key={n.id} className="score-reveal__item score-reveal__item--work">
                      <span className="score-reveal__mark" aria-hidden="true">△</span>
                      <span>
                        <b>{n.label}</b> <span className="data score-reveal__val">{n.value}</span> — {n.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <button className="btn btn--fairway score-reveal__cta" onClick={onClose}>
              See the full breakdown
            </button>
          </>
        ) : (
          <div className="score-reveal__empty">
            <div className="score-reveal__empty-badge" aria-hidden="true">✓</div>
            <p className="score-reveal__empty-title">Nice — that tracked cleanly.</p>
            <p className="score-reveal__empty-msg">
              Set your swing points — address, top, impact — to unlock your score and see exactly
              where to improve.
            </p>
            <button className="btn btn--fairway score-reveal__cta" onClick={onClose}>
              Set my swing points
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
