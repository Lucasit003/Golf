import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../design/Button'
import {
  listApprovedSwings,
  submitSwing,
  type SwingCard,
  type Angle,
  type Handedness,
  type SkillLevel,
} from './api'
import './Community.css'

/*
 * The community swing library. Two halves: a grid of shared (approved) swings to
 * study, and an opt-in form to add your own. Sharing is deliberate and separate
 * from the on-device survey — your video only leaves your phone if you submit it
 * here, and it's reviewed before anyone else can see it.
 */

const ANGLES: { v: Angle; label: string }[] = [
  { v: 'down_the_line', label: 'Down-the-line' },
  { v: 'face_on', label: 'Face-on' },
]
const SKILLS: { v: SkillLevel; label: string }[] = [
  { v: 'beginner', label: 'Beginner' },
  { v: 'intermediate', label: 'Intermediate' },
  { v: 'advanced', label: 'Advanced' },
  { v: 'pro', label: 'Pro' },
]

export function Community({
  onBack,
  onCompareWith,
}: {
  onBack: () => void
  onCompareWith?: (ref: { url: string; label: string }) => void
}) {
  const [swings, setSwings] = useState<SwingCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError(null)
    const { swings, error } = await listApprovedSwings()
    setSwings(swings)
    setLoadError(error ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <section className="community">
      <header className="community__head">
        <p className="label community__eyebrow">Community · shared swings</p>
        <h1 className="community__title">The swing library.</h1>
        <p className="community__lede">
          Swings people have chosen to share — study a better move, or spot a fault in one like
          yours. Add your own below; it stays private until it’s reviewed.
        </p>
      </header>

      <ShareForm onShared={load} />

      <div className="community__gallery">
        <div className="community__gallery-head">
          <span className="label">Shared swings</span>
          <button className="community__refresh" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {loadError ? (
          <p className="community__note community__note--warn">{loadError}</p>
        ) : loading ? (
          <p className="community__note">Loading the library…</p>
        ) : swings.length === 0 ? (
          <p className="community__note">
            No shared swings yet — be the first to add one. New submissions appear here once
            they’re approved.
          </p>
        ) : (
          <ul className="swing-grid">
            {swings.map((s) => (
              <SwingTile key={s.id} swing={s} onCompareWith={onCompareWith} />
            ))}
          </ul>
        )}
      </div>

      <div className="community__actions">
        <Button variant="line" onClick={onBack}>
          Back
        </Button>
      </div>
    </section>
  )
}

function SwingTile({
  swing,
  onCompareWith,
}: {
  swing: SwingCard
  onCompareWith?: (ref: { url: string; label: string }) => void
}) {
  const angle = ANGLES.find((a) => a.v === swing.angle)?.label ?? swing.angle
  const skill = SKILLS.find((s) => s.v === swing.skill_level)?.label
  // A short label for the compare well: caption if any, else the angle + level.
  const refLabel = swing.caption?.trim() || [angle, skill].filter(Boolean).join(' · ')
  return (
    <li className="swing-tile">
      <div className="swing-tile__video">
        {swing.videoUrl ? (
          <video src={swing.videoUrl} controls playsInline preload="metadata" />
        ) : (
          <div className="swing-tile__missing">Video unavailable</div>
        )}
      </div>
      <div className="swing-tile__meta">
        <span className="swing-tile__tag">{angle}</span>
        {skill ? <span className="swing-tile__tag">{skill}</span> : null}
        {swing.club ? <span className="swing-tile__tag">{swing.club}</span> : null}
        {swing.tempo ? <span className="swing-tile__tag data">{swing.tempo.toFixed(1)}:1</span> : null}
      </div>
      {swing.caption ? <p className="swing-tile__caption">{swing.caption}</p> : null}
      {onCompareWith && swing.videoUrl ? (
        <button
          className="swing-tile__compare"
          onClick={() => onCompareWith({ url: swing.videoUrl as string, label: refLabel })}
        >
          Compare with mine <span aria-hidden="true">⇄</span>
        </button>
      ) : null}
    </li>
  )
}

type ShareState = 'idle' | 'submitting' | 'done' | 'error'

function ShareForm({ onShared }: { onShared: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [angle, setAngle] = useState<Angle>('down_the_line')
  const [handedness, setHandedness] = useState<Handedness>('right')
  const [skill, setSkill] = useState<SkillLevel | ''>('')
  const [club, setClub] = useState('')
  const [caption, setCaption] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<ShareState>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const canSubmit = !!file && consent && state !== 'submitting'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || !consent) return
    setState('submitting')
    setError(null)
    const { error } = await submitSwing({
      file,
      angle,
      handedness,
      skillLevel: skill || null,
      club: club.trim() || null,
      caption: caption.trim() || null,
      tempo: null,
    })
    if (error) {
      setState('error')
      setError(error)
      return
    }
    setState('done')
    setFile(null)
    setClub('')
    setCaption('')
    setConsent(false)
    if (fileInput.current) fileInput.current.value = ''
    onShared()
  }

  if (state === 'done') {
    return (
      <div className="share share--done">
        <p className="share__done-title">Thanks — your swing is in the queue.</p>
        <p className="share__done-body">
          It’ll appear in the library once it’s reviewed. Nothing else about your device or footage
          was shared.
        </p>
        <Button variant="line" onClick={() => setState('idle')}>
          Share another
        </Button>
      </div>
    )
  }

  return (
    <form className="share" onSubmit={onSubmit}>
      <div className="share__head">
        <span className="label">Add your swing</span>
        <span className="label share__opt">Optional · reviewed before it’s public</span>
      </div>

      <label className="share__file">
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span>{file ? file.name : 'Choose a video…'}</span>
      </label>

      <div className="share__row">
        <Field label="Angle">
          <select value={angle} onChange={(e) => setAngle(e.target.value as Angle)}>
            {ANGLES.map((a) => (
              <option key={a.v} value={a.v}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hand">
          <select value={handedness} onChange={(e) => setHandedness(e.target.value as Handedness)}>
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </Field>
        <Field label="Level">
          <select value={skill} onChange={(e) => setSkill(e.target.value as SkillLevel | '')}>
            <option value="">—</option>
            {SKILLS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Club">
          <input
            type="text"
            value={club}
            placeholder="e.g. 7-iron"
            maxLength={24}
            onChange={(e) => setClub(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Caption">
        <input
          type="text"
          value={caption}
          placeholder="What should people look at?"
          maxLength={120}
          onChange={(e) => setCaption(e.target.value)}
        />
      </Field>

      <label className="share__consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I have the right to share this video and everyone in it consents to it appearing in the
          public library.
        </span>
      </label>

      {error ? <p className="community__note community__note--warn">{error}</p> : null}

      <div className="share__submit">
        <Button type="submit" variant="fairway" disabled={!canSubmit}>
          {state === 'submitting' ? 'Sharing…' : 'Share to library'}
          <span className="btn__tick">↑</span>
        </Button>
        {!consent && file ? <span className="label share__hint">Confirm consent to share</span> : null}
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label label">{label}</span>
      {children}
    </label>
  )
}
