import { useEffect, useRef, useState } from 'react'
import { Button } from '../design/Button'
import { Readout } from '../components/Readout'
import { ScrubBar, type ScrubStation } from './ScrubBar'
import { useTransportKeys } from '../lib/useTransportKeys'
import { usePrefs } from '../app/prefs'
import { useLocker } from '../locker/store'
import { useExtraction } from '../pose/useExtraction'
import { drawSkeleton, drawPolyline, type Ctx2D } from '../pose/skeleton'
import { handTracePoints } from '../pose/trace'
import { downloadSwing } from '../pose/exportSwing'
import { detectEvents } from '../metrics/events'
import {
  tempoRatio,
  compareState,
  computeSwingMetrics,
  BENCHMARK_BY_ID,
  type Benchmark,
  type BenchmarkId,
} from '../metrics'
import { swingScore } from '../metrics/score'
import { useBestScore } from '../metrics/bestScore'
import { checkFraming } from '../pose/framing'
import type { Swing, SwingEvents } from '../pose/types'
import { ConfidenceTrack } from './ConfidenceTrack'
import { FilmDiagram } from './FilmDiagram'
import './Upload.css'

/*
 * The survey table. A swing goes in the well on the left; the caddie's margin of
 * readouts sits on the right; the measuring stick runs underneath. Loading a clip
 * plays and scrubs it; "Track the swing" runs pose extraction (M1) and draws the
 * skeleton over the video with a confidence read.
 *
 * The measured numbers deliberately stay in their awaiting state: event detection
 * and the metrics are written and tested, but unvalidated against real swings, so
 * showing a value here would be a plausible-looking guess — exactly what the
 * project forbids. Skeleton + confidence are honest; numbers wait for M2's exit test.
 */

// Playback speeds for studying a swing. Full speed down to a crawl.
const SPEEDS = [1, 0.5, 0.25, 0.1] as const
// A nudge, in seconds, for frame stepping. We don't trust the file's fps yet
// (see SWING_SPEC — phone slo-mo lies), so step by a small fixed slice.
const STEP = 1 / 60

// Two camera angles, each surveyed on its own. A phone can only film one at a
// time, so you upload and track each; the app keeps both.
type Angle = 'down_the_line' | 'face_on'

const ANGLE_TABS: { v: Angle; label: string; hint: string }[] = [
  {
    v: 'down_the_line',
    label: 'Down-the-line',
    hint: 'Camera behind you, on the target line — reads posture, spine angle and plane.',
  },
  {
    v: 'face_on',
    label: 'Face-on',
    hint: 'Camera square to your chest — reads turn, sway, tilt and lead-leg support.',
  },
]

// Which measurements each angle can honestly speak to, by benchmark id. Tempo is
// angle-independent (pure frame counting) so it's shown separately, above these.
const ANGLE_METRICS: Record<Angle, BenchmarkId[]> = {
  down_the_line: ['spineAngle', 'shoulderTurn'],
  face_on: ['hipRotationImpact', 'xFactor', 'shoulderTilt', 'leadKneeFlex'],
}

// Short label (drop the "· top / · impact" event tag) and a compact range for a
// benchmark's tour band.
function shortLabel(b: Benchmark): string {
  return b.label.split(' · ')[0]
}
function fmtRange(b: Benchmark): string {
  const { lo, hi } = b.band
  return lo === -hi ? `±${hi}${b.unit}` : `${lo}–${hi}${b.unit}`
}
function fmtValue(id: BenchmarkId, b: Benchmark, v: number): string {
  const decimals = b.decimals ?? (id === 'spineAngle' ? 1 : 0)
  return v.toFixed(decimals)
}

// A saved clip for one angle: the file, its object URL, corrected events, and
// the tracked result so switching angles doesn't lose the survey.
type ClipSnap = {
  file: File
  src: string
  events: SwingEvents | null
  result: { swing: Swing; confidence: number; coverage: number } | null
}

export function Upload({ onBack, onCompare }: { onBack: () => void; onCompare: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  // The clip's own shape, so the well fits it instead of forcing 4:3 — most
  // phone swings are portrait and were being squeezed into a thin center strip.
  const [aspect, setAspect] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const { prefs } = usePrefs()
  const { earnKey } = useLocker()
  const [rate, setRate] = useState<number>(prefs.defaultSpeed)
  const { state: extraction, run: runExtraction, reset: resetExtraction, hydrate } = useExtraction()
  const swing = extraction.status === 'done' ? extraction.swing : null
  // Which angle we're surveying, and the saved clip for each.
  const [angle, setAngle] = useState<Angle>('down_the_line')
  const [clips, setClips] = useState<Record<Angle, ClipSnap | null>>({
    down_the_line: null,
    face_on: null,
  })
  // Set true right before restoring a cached result, so the auto-detect effect
  // keeps the corrected events instead of re-detecting.
  const restoringRef = useRef(false)
  // Every object URL we create, revoked together on unmount (a clip may be held
  // by an inactive angle, so we can't revoke eagerly on src change).
  const urlsRef = useRef<Set<string>>(new Set())
  // Detected events, editable by the user. These are UNVERIFIED — the whole
  // point of the UI is to scrub to each and correct it, which is how a swing
  // becomes a fixture that validates the detector (SWING_SPEC / M2).
  const [events, setEvents] = useState<SwingEvents | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<keyof SwingEvents | null>(null)
  const [overlay, setOverlay] = useState<'skeleton' | 'trace' | 'off'>('skeleton')

  // When a fresh extraction lands, run first-pass detection on it. When we're
  // restoring a saved clip, keep its already-corrected events instead.
  useEffect(() => {
    if (extraction.status === 'done') {
      if (restoringRef.current) {
        restoringRef.current = false
        return
      }
      setEvents(detectEvents(extraction.swing.frames))
      setSelectedEvent(null)
    } else if (!restoringRef.current) {
      setEvents(null)
    }
  }, [extraction])

  // Revoke every object URL we made when the screen unmounts.
  useEffect(() => {
    const urls = urlsRef.current
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  // Draw the skeleton for the frame nearest the current time, whenever the
  // playhead moves or a new extraction lands. Colors come from the live theme.
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d') as Ctx2D | null
    if (!ctx) return
    if (!swing || overlay === 'off') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    canvas.width = video.videoWidth || 1
    canvas.height = video.videoHeight || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const css = getComputedStyle(document.documentElement)
    const chalk = css.getPropertyValue('--chalk').trim() || '#2547c8'
    const cream = css.getPropertyValue('--cream').trim() || '#f2f0e6'

    if (overlay === 'trace') {
      // The signature hand trace, drawn from the real swing.
      const pts = handTracePoints(swing.frames)
      drawPolyline(ctx, pts, canvas.width, canvas.height, chalk, Math.max(2, canvas.width / 260))
    } else {
      const frame = nearestFrame(swing, current * 1000)
      drawSkeleton(ctx, frame.landmarks, frame.visibility, canvas.width, canvas.height, {
        line: chalk,
        joint: cream,
        lineWidth: Math.max(2, canvas.width / 320),
        jointRadius: Math.max(3, canvas.width / 200),
        minVisibility: 0.4,
      })
    }
  }, [current, swing, overlay])

  // Keep the element's playback rate in sync with the chosen speed.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, src])

  function pickFile(file: File | undefined) {
    if (!file) return
    const url = URL.createObjectURL(file)
    urlsRef.current.add(url)
    restoringRef.current = false
    setVideoError(null)
    setSrc(url)
    setCurrent(0)
    setDuration(0)
    setAspect(null)
    resetExtraction()
    setEvents(null)
    setSelectedEvent(null)
    setClips((prev) => ({ ...prev, [angle]: { file, src: url, events: null, result: null } }))
    // Filming a swing earns a locker key — the one reward tied to actually
    // using the survey. Cosmetic only; it never touches a measurement.
    earnKey()
  }

  // Swap to the other angle, saving the current one's clip + survey so nothing
  // is lost, and restoring the target angle's if it's been filmed.
  function switchAngle(next: Angle) {
    if (next === angle || busy) return
    setClips((prev) => {
      const cur = prev[angle]
      if (!src || !cur) return prev
      return {
        ...prev,
        [angle]: {
          file: cur.file,
          src,
          events,
          result:
            extraction.status === 'done'
              ? {
                  swing: extraction.swing,
                  confidence: extraction.confidence,
                  coverage: extraction.coverage,
                }
              : null,
        },
      }
    })

    const snap = clips[next]
    setAngle(next)
    setCurrent(0)
    setDuration(0)
    setSelectedEvent(null)
    setOverlay('skeleton')
    if (snap) {
      setSrc(snap.src)
      setEvents(snap.events)
      if (snap.result) {
        restoringRef.current = true
        hydrate(snap.result.swing, snap.result.confidence, snap.result.coverage)
      } else {
        restoringRef.current = false
        resetExtraction()
      }
    } else {
      setSrc(null)
      setEvents(null)
      restoringRef.current = false
      resetExtraction()
    }
  }

  // Relocate the current clip (and its survey) to the other angle slot — the fix
  // offered when a clip looks like it landed in the wrong spot. Only used when the
  // target slot is empty, so nothing gets clobbered.
  function moveClipToAngle(next: Angle) {
    if (next === angle || !src || busy) return
    const cur = clips[angle]
    if (!cur || clips[next]) return
    const moved: ClipSnap = {
      file: cur.file,
      src,
      events,
      result:
        extraction.status === 'done'
          ? {
              swing: extraction.swing,
              confidence: extraction.confidence,
              coverage: extraction.coverage,
            }
          : null,
    }
    setClips((prev) => ({ ...prev, [angle]: null, [next]: moved }))
    setAngle(next)
    setCurrent(0)
    setDuration(0)
    setSelectedEvent(null)
    setOverlay('skeleton')
    setSrc(moved.src)
    setEvents(moved.events)
    if (moved.result) {
      restoringRef.current = true
      hydrate(moved.result.swing, moved.result.confidence, moved.result.coverage)
    } else {
      restoringRef.current = false
      resetExtraction()
    }
  }

  function seek(fraction: number) {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = fraction * v.duration
  }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  function step(dir: 1 | -1) {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.pause()
    v.currentTime = Math.min(Math.max(0, v.currentTime + dir * STEP), v.duration)
  }

  const progress = duration > 0 ? current / duration : 0
  const busy = extraction.status === 'extracting'
  const canTransport = !!src && !busy

  // Event frame index → scrub fraction, via the frame's real timestamp.
  function eventFraction(frameIndex: number): number {
    if (!swing || duration <= 0) return 0
    const f = swing.frames[frameIndex]
    if (!f) return 0
    return Math.min(1, Math.max(0, f.timeMs / (duration * 1000)))
  }

  const EVENT_ORDER: { key: keyof SwingEvents; label: string }[] = [
    { key: 'address', label: 'Address' },
    { key: 'top', label: 'Top' },
    { key: 'impact', label: 'Impact' },
  ]

  const stations: ScrubStation[] =
    events && swing
      ? EVENT_ORDER.map(({ key, label }) => ({
          id: key,
          label,
          fraction: eventFraction(events[key]),
        }))
      : []

  // Tempo is the one number we can show honestly here: it's just the ratio of
  // backswing to downswing FRAMES, computed from the events the user can see and
  // correct. No depth, no geometry, no unvalidated assumption — pure counting.
  const tempoVal = events ? tempoRatio(events) : null
  const tempoState =
    tempoVal != null
      ? compareState('tempo', tempoVal) === 'in'
        ? 'in-range'
        : 'out-of-range'
      : undefined

  // The swing score: how close this swing sits to the tour numbers. Fed only the
  // metrics we actually measure — tempo today — so it's honest now and grows on
  // its own as the angle metrics are validated. Null until there's a reading.
  const score = swingScore({ tempo: tempoVal })
  const { best, isNewBest } = useBestScore(score ? score.score : null)

  // The angle metrics, measured at the detected events. Estimates from a single
  // camera — each carries the catalog's confidence badge so a rough one reads as
  // rough. Recomputes as the user corrects the events below.
  const measures = swing && events ? computeSwingMetrics(swing.frames, events) : {}

  // A soft "does this clip match the slot?" read, once the body is tracked. It
  // catches a face-on clip dropped in the down-the-line slot, a clip with no
  // golfer, or feet cropped out — surfaced as a gentle nudge, never a block.
  const framing =
    extraction.status === 'done' ? checkFraming(extraction.swing, angle, extraction.coverage) : null

  function jumpToEvent(key: keyof SwingEvents) {
    if (!events) return
    setSelectedEvent(key)
    seek(eventFraction(events[key]))
  }

  // Correction: move the selected event to the frame nearest the playhead.
  function setEventHere() {
    if (!events || !swing || !selectedEvent) return
    const idx = nearestFrameIndex(swing, current * 1000)
    setEvents({ ...events, [selectedEvent]: idx })
  }

  useTransportKeys({ enabled: canTransport, onToggle: togglePlay, onStep: step })

  return (
    <section className="upload" aria-label="Swing survey">
      <div className="upload__grid">
        {/* The drawing — video well, with the skeleton overlay. */}
        <div
          className={`upload__well${src ? '' : ' upload__well--empty'}`}
          style={src && aspect ? { aspectRatio: String(aspect) } : undefined}
        >
          {src ? (
            <>
              <video
                ref={videoRef}
                className="upload__video"
                src={src}
                playsInline
                controls={false}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration)
                  const w = e.currentTarget.videoWidth
                  const h = e.currentTarget.videoHeight
                  // Fit the well to the clip, but clamp so an ultra-tall or ultra-wide
                  // export can't blow out the layout.
                  if (w && h) setAspect(Math.max(0.5, Math.min(1.9, w / h)))
                  e.currentTarget.playbackRate = rate
                }}
                onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onClick={togglePlay}
                onError={() => {
                  const code = videoRef.current?.error?.code
                  setVideoError(
                    code === 4 || code === 3
                      ? 'This browser can’t play this clip’s format. Try a video straight from your camera roll, or re-save/export it as MP4.'
                      : 'The video couldn’t load. If your phone is in Low Power Mode, turn it off and try again.',
                  )
                }}
              />
              <canvas ref={canvasRef} className="upload__overlay" aria-hidden="true" />

              {videoError ? (
                <div className="track-fail" role="alert">
                  <p className="track-fail__title">Can’t play this video</p>
                  <p className="track-fail__msg">{videoError}</p>
                </div>
              ) : null}

              {extraction.status === 'extracting' ? (
                <div className="track-status" role="status">
                  <div className="track-status__label label">
                    {extraction.stage === 'loading'
                      ? 'Loading the tracker…'
                      : `Tracking the body · ${Math.round(extraction.progress * 100)}%`}
                  </div>
                  <div className={`track-status__bar${extraction.stage === 'loading' ? ' track-status__bar--indeterminate' : ''}`}>
                    <span
                      style={extraction.stage === 'loading' ? undefined : { width: `${extraction.progress * 100}%` }}
                    />
                  </div>
                  <div className="track-status__note label">
                    {extraction.stage === 'loading'
                      ? 'Downloading the pose model — one time on the first swing.'
                      : 'Scanning the clip frame by frame. This is a one-time pass.'}
                  </div>
                </div>
              ) : null}

              {extraction.status === 'failed' ? (
                <div className="track-fail" role="alert">
                  <p className="track-fail__title">Couldn't track this clip.</p>
                  <p className="track-fail__msg">{extraction.message}</p>
                </div>
              ) : null}

              {swing ? (
                <div className="overlay-toggle" role="group" aria-label="Overlay">
                  {(['skeleton', 'trace', 'off'] as const).map((m) => (
                    <button
                      key={m}
                      className={`overlay-toggle__btn${overlay === m ? ' is-active' : ''}`}
                      onClick={() => setOverlay(m)}
                      aria-pressed={overlay === m}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState onPick={pickFile} />
          )}
        </div>

        {/* The margin — readouts. */}
        <aside className="upload__margin" aria-label="Measurements">
          <div className="angle-tabs" role="group" aria-label="Camera angle">
            {ANGLE_TABS.map((t) => (
              <button
                key={t.v}
                className={`angle-tabs__btn${angle === t.v ? ' is-active' : ''}`}
                onClick={() => switchAngle(t.v)}
                disabled={busy}
                aria-pressed={angle === t.v}
              >
                {t.label}
                {clips[t.v]?.result ? (
                  <span className="angle-tabs__dot" aria-hidden="true" title="surveyed" />
                ) : null}
              </button>
            ))}
          </div>
          <p className="angle-tabs__hint label">{ANGLE_TABS.find((t) => t.v === angle)!.hint}</p>

          <div className="upload__margin-head">
            <span className="label">survey</span>
            <span className="label upload__margin-status">
              {extraction.status === 'done'
                ? `${swing?.frames.length ?? 0} frames tracked`
                : extraction.status === 'extracting'
                  ? 'tracking…'
                  : src
                    ? 'not yet measured'
                    : 'no swing'}
            </span>
          </div>

          {framing ? (
            <div className={`framing-hint framing-hint--${framing.kind}`} role="status">
              <span className="framing-hint__mark" aria-hidden="true">
                {framing.kind === 'wrong-angle' ? '↺' : '!'}
              </span>
              <div className="framing-hint__body">
                <p className="framing-hint__title">
                  {framing.kind === 'no-pose'
                    ? 'No golfer tracked'
                    : framing.kind === 'cropped'
                      ? 'Body is cut off'
                      : 'This might be the wrong angle'}
                </p>
                <p className="framing-hint__msg">{framing.message}</p>
                {framing.kind === 'wrong-angle' && framing.suggest && !clips[framing.suggest] ? (
                  <button
                    className="framing-hint__action"
                    onClick={() => moveClipToAngle(framing.suggest!)}
                    disabled={busy}
                  >
                    Move it to {framing.suggest === 'face_on' ? 'Face-on' : 'Down-the-line'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {extraction.status === 'done' ? (
            <div className="track-confidence">
              <div className="label">Tracking confidence</div>
              <div className={`track-confidence__val data track-confidence__val--${confidenceBand(extraction.confidence)}`}>
                {Math.round(extraction.confidence * 100)}
                <span className="track-confidence__pct">%</span>
              </div>
              <div className="label track-confidence__note">
                {extraction.confidence >= 0.7
                  ? 'Solid — the joints are clearly visible.'
                  : 'Low — measurements from this clip would be unreliable. Re-film brighter, fuller in frame.'}
              </div>
            </div>
          ) : null}

          {score ? (
            <div className="swing-score">
              <div className="swing-score__top">
                <span className="label">Swing score</span>
                <span className="label swing-score__tier">{score.label}</span>
              </div>
              <div className="swing-score__val data">
                {score.score}
                <span className="swing-score__max">/ 100</span>
                {isNewBest ? (
                  <span className="swing-score__best swing-score__best--new">★ New best</span>
                ) : best != null ? (
                  <span className="swing-score__best">Best {best}</span>
                ) : null}
              </div>
              <p className="label swing-score__note">
                How close this swing sits to the tour numbers. Tempo-weighted for now — the
                angle metrics join in once they're validated.
              </p>
            </div>
          ) : null}

          <Readout
            label="Tempo"
            range="2.8–3.2 : 1"
            value={tempoVal != null ? tempoVal.toFixed(1) : undefined}
            unit=": 1"
            state={tempoState}
          />
          {ANGLE_METRICS[angle].map((id) => {
            const b = BENCHMARK_BY_ID[id]
            const v = measures[id]
            const has = v != null && Number.isFinite(v)
            const cs = has ? compareState(id, v!) : null
            return (
              <Readout
                key={id}
                label={shortLabel(b)}
                range={fmtRange(b)}
                value={has ? fmtValue(id, b, v!) : undefined}
                unit={has ? b.unit : undefined}
                state={cs ? (cs === 'in' ? 'in-range' : 'out-of-range') : undefined}
                confidence={has ? b.confidence : undefined}
              />
            )
          })}
          <p className="upload__margin-note">
            What a {angle === 'down_the_line' ? 'down-the-line' : 'face-on'} camera can see.
            Tempo is the solid one — pure backswing ÷ downswing frames. The angle metrics are
            measured off the tracked body at the events below, so correct those and everything
            here updates. They're single-camera estimates: spine, tilt and knee flex are
            fairly reliable; the rotations (turn, X-factor) are depth-limited, so they're
            badged <em>rough</em> — read them as a ballpark, not a launch monitor.
          </p>
        </aside>

        {/* The measuring stick, with its transport. */}
        <div className={`upload__scrub${src ? '' : ' upload__scrub--empty'}`}>
          <div className={`transport${canTransport ? '' : ' transport--disabled'}`}>
            <div className="transport__group">
              <button
                className="transport__btn"
                onClick={() => step(-1)}
                disabled={!canTransport}
                aria-label="Step back one frame"
                title="Step back"
              >
                ◂
              </button>
              <button
                className="transport__btn transport__btn--play"
                onClick={togglePlay}
                disabled={!canTransport}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <button
                className="transport__btn"
                onClick={() => step(1)}
                disabled={!canTransport}
                aria-label="Step forward one frame"
                title="Step forward"
              >
                ▸
              </button>
            </div>

            <div className="transport__speeds" role="group" aria-label="Playback speed">
              <span className="label transport__speeds-label">speed</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`transport__speed${rate === s ? ' is-active' : ''}`}
                  onClick={() => setRate(s)}
                  disabled={!canTransport}
                  aria-pressed={rate === s}
                >
                  {s === 1 ? '1×' : `${s}×`}
                </button>
              ))}
            </div>
          </div>

          <ScrubBar
            progress={progress}
            current={current}
            duration={duration}
            onSeek={seek}
            disabled={!canTransport}
            stations={stations}
          />
          {src ? (
            <p className="transport__hint label">
              <kbd>space</kbd> play · <kbd>←</kbd> <kbd>→</kbd> step a frame
            </p>
          ) : null}

          {events && swing ? (
            <div className="events">
              <div className="events__head">
                <span className="label">Detected events · verify</span>
                <span className="label events__note">jump, scrub to the true frame, correct</span>
              </div>
              <div className="events__row">
                {EVENT_ORDER.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`events__chip${selectedEvent === key ? ' is-selected' : ''}`}
                    onClick={() => jumpToEvent(key)}
                  >
                    <span className="events__chip-label">{label}</span>
                    <span className="events__chip-frame data">f{events[key]}</span>
                  </button>
                ))}
                <button
                  className="events__correct"
                  onClick={setEventHere}
                  disabled={!selectedEvent}
                  title={selectedEvent ? `Set ${selectedEvent} to the current frame` : 'Select an event first'}
                >
                  Set {selectedEvent ?? '…'} to here
                </button>
              </div>
            </div>
          ) : null}

          {swing ? <ConfidenceTrack swing={swing} durationMs={duration * 1000} /> : null}
        </div>
      </div>

      <div className="upload__actions">
        <Button variant="line" onClick={onBack} disabled={busy}>
          Back
        </Button>
        {src && extraction.status !== 'extracting' ? (
          <Button
            variant="fairway"
            onClick={() => {
              const v = videoRef.current
              if (!v) return
              // extraction plays the clip at 1× and mutes it; restore the user's
              // chosen speed afterward.
              void runExtraction(v).then(() => {
                v.playbackRate = rate
              })
            }}
          >
            {extraction.status === 'done' ? 'Re-track' : 'Track the swing'}
          </Button>
        ) : null}
        {swing ? (
          <Button variant="line" onClick={() => downloadSwing({ ...swing, events })}>
            Export data ↓
          </Button>
        ) : null}
        <Button variant="line" onClick={onCompare} disabled={busy}>
          Compare two swings ⇄
        </Button>
        {src && !busy ? (
          <label className="upload__replace">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <span>Replace swing</span>
          </label>
        ) : null}
      </div>
    </section>
  )
}

/** Index of the stored frame whose timestamp is closest to `timeMs`. */
function nearestFrameIndex(swing: Swing, timeMs: number): number {
  const frames = swing.frames
  let lo = 0
  let hi = frames.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (frames[mid].timeMs < timeMs) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(frames[lo - 1].timeMs - timeMs) < Math.abs(frames[lo].timeMs - timeMs)) {
    return lo - 1
  }
  return lo
}

/** The stored frame whose timestamp is closest to `timeMs`. */
function nearestFrame(swing: Swing, timeMs: number) {
  return swing.frames[nearestFrameIndex(swing, timeMs)]
}

function confidenceBand(c: number): 'in' | 'near' | 'far' {
  if (c >= 0.7) return 'in'
  if (c >= 0.5) return 'near'
  return 'far'
}

function EmptyState({ onPick }: { onPick: (file: File | undefined) => void }) {
  return (
    <div className="empty">
      <div className="empty__frame" aria-hidden="true">
        <span className="empty__crosshair empty__crosshair--v" />
        <span className="empty__crosshair empty__crosshair--h" />
        <span className="empty__corner empty__corner--tl" />
        <span className="empty__corner empty__corner--tr" />
        <span className="empty__corner empty__corner--bl" />
        <span className="empty__corner empty__corner--br" />
      </div>

      <div className="empty__body">
        <h2 className="empty__title">Upload a swing</h2>
        <p className="empty__how">
          Film it on your phone — down-the-line from behind, plus a face-on side view.
          Full body in frame, feet to hands.
        </p>
        <label className="btn btn--fairway empty__pick">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <span>Choose file</span>
          <span className="btn__tick">↑</span>
        </label>
        <p className="empty__privacy label">
          Your video never leaves this device. Everything runs in the browser.
        </p>

        <details className="capture-guide">
          <summary className="capture-guide__summary">How to film it</summary>
          <FilmDiagram className="capture-guide__diagram" />
          <ul className="capture-guide__list">
            <li>
              <span className="capture-guide__k">Angles</span> film two — down-the-line
              (behind you, on the target line, at hand height) and face-on (side-on,
              square to your chest). Each shows faults the other hides
            </li>
            <li>
              <span className="capture-guide__k">Steady</span> prop your phone against
              something solid — a bag, a bench, a rail. Any camera movement throws off
              every measurement
            </li>
            <li>
              <span className="capture-guide__k">Frame rate</span> set it as high as your phone
              allows — 60fps works, and 120 or 240 (slow-mo) sharpens the fastest part of the
              swing. Higher is better, but any of these is fine
            </li>
            <li>
              <span className="capture-guide__k">Framing</span> your whole body, feet to
              hands, with headroom at the top
            </li>
            <li>
              <span className="capture-guide__k">Repeat</span> the same spot each session so
              swings compare cleanly
            </li>
          </ul>
        </details>
      </div>
    </div>
  )
}
