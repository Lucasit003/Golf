import { useEffect, useRef, useState } from 'react'
import { Button } from '../design/Button'
import { Readout } from '../components/Readout'
import { ScrubBar, type ScrubStation } from './ScrubBar'
import { useTransportKeys } from '../lib/useTransportKeys'
import { usePrefs } from '../app/prefs'
import { useExtraction } from '../pose/useExtraction'
import { drawSkeleton, type Ctx2D } from '../pose/skeleton'
import { downloadSwing } from '../pose/exportSwing'
import { detectEvents } from '../metrics/events'
import type { Swing, SwingEvents } from '../pose/types'
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

export function Upload({ onBack, onCompare }: { onBack: () => void; onCompare: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const { prefs } = usePrefs()
  const [rate, setRate] = useState<number>(prefs.defaultSpeed)
  const { state: extraction, run: runExtraction, reset: resetExtraction } = useExtraction()
  const swing = extraction.status === 'done' ? extraction.swing : null
  // Detected events, editable by the user. These are UNVERIFIED — the whole
  // point of the UI is to scrub to each and correct it, which is how a swing
  // becomes a fixture that validates the detector (SWING_SPEC / M2).
  const [events, setEvents] = useState<SwingEvents | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<keyof SwingEvents | null>(null)

  // When a fresh extraction lands, run first-pass detection on it.
  useEffect(() => {
    if (extraction.status === 'done') {
      setEvents(detectEvents(extraction.swing.frames))
      setSelectedEvent(null)
    } else {
      setEvents(null)
    }
  }, [extraction])

  // Revoke the object URL when it changes or the screen unmounts.
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

  // Draw the skeleton for the frame nearest the current time, whenever the
  // playhead moves or a new extraction lands. Colors come from the live theme.
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d') as Ctx2D | null
    if (!ctx) return
    if (!swing) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    canvas.width = video.videoWidth || 1
    canvas.height = video.videoHeight || 1
    const frame = nearestFrame(swing, current * 1000)
    const css = getComputedStyle(document.documentElement)
    drawSkeleton(ctx, frame.landmarks, frame.visibility, canvas.width, canvas.height, {
      line: css.getPropertyValue('--chalk').trim() || '#2547c8',
      joint: css.getPropertyValue('--cream').trim() || '#f2f0e6',
      lineWidth: Math.max(2, canvas.width / 320),
      jointRadius: Math.max(3, canvas.width / 200),
      minVisibility: 0.4,
    })
  }, [current, swing])

  // Keep the element's playback rate in sync with the chosen speed.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, src])

  function pickFile(file: File | undefined) {
    if (!file) return
    if (src) URL.revokeObjectURL(src)
    setSrc(URL.createObjectURL(file))
    setCurrent(0)
    setDuration(0)
    resetExtraction()
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
        <div className="upload__well">
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
                  e.currentTarget.playbackRate = rate
                }}
                onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onClick={togglePlay}
              />
              <canvas ref={canvasRef} className="upload__overlay" aria-hidden="true" />

              {extraction.status === 'extracting' ? (
                <div className="track-status" role="status">
                  <div className="track-status__label label">
                    Tracking the body · {Math.round(extraction.progress * 100)}%
                  </div>
                  <div className="track-status__bar">
                    <span style={{ width: `${extraction.progress * 100}%` }} />
                  </div>
                  <div className="track-status__note label">
                    Playing through once to read every frame. This is a one-time pass.
                  </div>
                </div>
              ) : null}

              {extraction.status === 'failed' ? (
                <div className="track-fail" role="alert">
                  <p className="track-fail__title">Couldn't track this clip.</p>
                  <p className="track-fail__msg">{extraction.message}</p>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState onPick={pickFile} />
          )}
        </div>

        {/* The margin — readouts. */}
        <aside className="upload__margin" aria-label="Measurements">
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

          <Readout label="Tempo" range="2.8–3.2 : 1" />
          <Readout label="Shoulder turn" range="85–95°" />
          <Readout label="X-factor" range="40–50°" />
          <Readout label="Hip rotation" range="35–45°" />
          <Readout label="Lead knee flex" range="25–41°" />
          <Readout label="Spine angle" range="±2° address" />
          <p className="upload__margin-note">
            The skeleton tracks now. The measured numbers stay empty until event detection
            is verified against real swings — we won't show a value we can't stand behind.
            An empty readout is honest, a
            plausible one isn't.
          </p>
        </aside>

        {/* The measuring stick, with its transport. */}
        <div className="upload__scrub">
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
        </div>
      </div>

      <div className="upload__actions">
        <Button variant="line" onClick={onBack}>
          Back
        </Button>
        {src && extraction.status !== 'extracting' ? (
          <Button
            variant="fairway"
            onClick={() => videoRef.current && void runExtraction(videoRef.current)}
          >
            {extraction.status === 'done' ? 'Re-track' : 'Track the swing'}
          </Button>
        ) : null}
        {swing ? (
          <Button variant="line" onClick={() => downloadSwing({ ...swing, events })}>
            Export data ↓
          </Button>
        ) : null}
        <Button variant="line" onClick={onCompare}>
          Compare two swings ⇄
        </Button>
        {src ? (
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
          Film down-the-line, tripod, 240fps. Full body in frame, feet to hands.
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
          <ul className="capture-guide__list">
            <li>
              <span className="capture-guide__k">Angle</span> down-the-line — camera behind
              you, on the target line, at hand height
            </li>
            <li>
              <span className="capture-guide__k">Steady</span> on a tripod. Any camera
              movement throws off every measurement
            </li>
            <li>
              <span className="capture-guide__k">Frame rate</span> 240fps if your phone has
              it; 120 works, 60 is marginal
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
