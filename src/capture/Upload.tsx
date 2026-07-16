import { useEffect, useRef, useState } from 'react'
import { Button } from '../design/Button'
import { Readout } from '../components/Readout'
import { ScrubBar } from './ScrubBar'
import './Upload.css'

/*
 * The survey table. A swing goes in the well on the left; the caddie's margin of
 * readouts sits on the right; the measuring stick runs underneath. This is the
 * M0 shell — it plays a file back and scrubs it. No pose, no numbers yet. The
 * readouts sit in their awaiting state and the empty state teaches the capture
 * setup, because bad footage is the number one cause of bad output.
 */

// Playback speeds for studying a swing. Full speed down to a crawl.
const SPEEDS = [1, 0.5, 0.25, 0.1] as const
// A nudge, in seconds, for frame stepping. We don't trust the file's fps yet
// (see SWING_SPEC — phone slo-mo lies), so step by a small fixed slice.
const STEP = 1 / 60

export function Upload({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState<number>(1)

  // Revoke the object URL when it changes or the screen unmounts.
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

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

  return (
    <section className="upload" aria-label="Swing survey">
      <div className="upload__grid">
        {/* The drawing — video well. */}
        <div className="upload__well">
          {src ? (
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
          ) : (
            <EmptyState onPick={pickFile} />
          )}
        </div>

        {/* The margin — readouts. */}
        <aside className="upload__margin" aria-label="Measurements">
          <div className="upload__margin-head">
            <span className="label">survey</span>
            <span className="label upload__margin-status">
              {src ? 'not yet measured' : 'no swing'}
            </span>
          </div>
          <Readout label="Tempo" range="2.8–3.2 : 1" />
          <Readout label="Shoulder turn" range="85–95°" />
          <Readout label="X-factor" range="40–50°" />
          <Readout label="Hip rotation" range="35–45°" />
          <Readout label="Lead knee flex" range="25–41°" />
          <Readout label="Spine angle" range="±2° address" />
          <p className="upload__margin-note">
            The full set — turn, tilt, bend, knees, tempo — arrives once pose extraction and
            event detection land. Nothing here is estimated; an empty readout is honest, a
            plausible one isn't.
          </p>
        </aside>

        {/* The measuring stick, with its transport. */}
        <div className="upload__scrub">
          <div className={`transport${src ? '' : ' transport--disabled'}`}>
            <div className="transport__group">
              <button
                className="transport__btn"
                onClick={() => step(-1)}
                disabled={!src}
                aria-label="Step back one frame"
                title="Step back"
              >
                ◂
              </button>
              <button
                className="transport__btn transport__btn--play"
                onClick={togglePlay}
                disabled={!src}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <button
                className="transport__btn"
                onClick={() => step(1)}
                disabled={!src}
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
                  disabled={!src}
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
            disabled={!src}
          />
        </div>
      </div>

      <div className="upload__actions">
        <Button variant="line" onClick={onBack}>
          Back
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
      </div>
    </div>
  )
}
