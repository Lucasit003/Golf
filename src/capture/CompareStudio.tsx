import { useEffect, useRef, useState } from 'react'
import { Button } from '../design/Button'
import { ScrubBar } from './ScrubBar'
import { useTransportKeys } from '../lib/useTransportKeys'
import './CompareStudio.css'

/*
 * Compare studio — two swings, side by side, in slow motion.
 *
 * Now permitted by docs/DATA_AND_LEGAL.md: the user loads two clips they already
 * have (their swing + their own or a licensed reference). Both files stay on the
 * device — nothing is uploaded or stored. One clip is the primary and drives a
 * shared, normalized playhead; the other follows it proportionally, so address
 * lines up with address and impact with impact even when the swings are different
 * lengths. Frame-step and ½/¼/0.1× speeds let you study the two together.
 */

const SPEEDS = [1, 0.5, 0.25, 0.1] as const
const STEP = 1 / 60

export function CompareStudio({ onBack }: { onBack: () => void }) {
  const vA = useRef<HTMLVideoElement>(null)
  const vB = useRef<HTMLVideoElement>(null)
  const raf = useRef<number>(0)

  const [srcA, setSrcA] = useState<string | null>(null)
  const [srcB, setSrcB] = useState<string | null>(null)
  const [durA, setDurA] = useState(0)
  const [durB, setDurB] = useState(0)
  const [pos, setPos] = useState(0) // shared normalized playhead, 0–1
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState<number>(1)

  useEffect(() => () => {
    if (srcA) URL.revokeObjectURL(srcA)
    if (srcB) URL.revokeObjectURL(srcB)
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [srcA, srcB])

  useEffect(() => {
    if (vA.current) vA.current.playbackRate = rate
  }, [rate, srcA])

  // The primary drives the shared playhead; the other follows proportionally.
  function primary() {
    return srcA ? vA.current : vB.current
  }
  function primaryDur() {
    return srcA ? durA : durB
  }
  function follower() {
    return srcA ? vB.current : vA.current
  }
  function followerDur() {
    return srcA ? durB : durA
  }

  function pick(which: 'a' | 'b', file: File | undefined) {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (which === 'a') {
      if (srcA) URL.revokeObjectURL(srcA)
      setSrcA(url)
      setDurA(0)
    } else {
      if (srcB) URL.revokeObjectURL(srcB)
      setSrcB(url)
      setDurB(0)
    }
    setPos(0)
  }

  function syncFollower(p: number) {
    const f = follower()
    const fd = followerDur()
    if (f && fd > 0) {
      const target = p * fd
      if (Math.abs(f.currentTime - target) > 0.04) f.currentTime = target
    }
  }

  function loop() {
    const p = primary()
    const pd = primaryDur()
    if (p && pd > 0) {
      const frac = Math.min(1, p.currentTime / pd)
      setPos(frac)
      syncFollower(frac)
      if (p.ended) {
        stop()
        return
      }
    }
    raf.current = requestAnimationFrame(loop)
  }

  function play() {
    const p = primary()
    if (!p) return
    p.playbackRate = rate
    void p.play()
    setPlaying(true)
    raf.current = requestAnimationFrame(loop)
  }

  function stop() {
    primary()?.pause()
    if (raf.current) cancelAnimationFrame(raf.current)
    setPlaying(false)
  }

  function toggle() {
    if (playing) stop()
    else play()
  }

  function seek(fraction: number) {
    setPos(fraction)
    if (vA.current && durA > 0) vA.current.currentTime = fraction * durA
    if (vB.current && durB > 0) vB.current.currentTime = fraction * durB
  }

  function step(dir: 1 | -1) {
    stop()
    const pd = primaryDur()
    if (pd <= 0) return
    const next = Math.min(1, Math.max(0, pos + (dir * STEP) / pd))
    seek(next)
  }

  const hasAny = !!srcA || !!srcB
  const current = (srcA ? pos * durA : pos * durB) || 0
  const duration = srcA ? durA : durB

  useTransportKeys({ enabled: hasAny, onToggle: toggle, onStep: step })

  return (
    <section className="compare" aria-label="Compare two swings">
      <div className="compare__head">
        <div>
          <p className="label compare__eyebrow">Compare · side by side</p>
          <h1 className="compare__title">Two swings, one playhead.</h1>
        </div>
        <Button variant="line" onClick={onBack}>
          Back to survey
        </Button>
      </div>

      <div className="compare__wells">
        <Well
          label="Your swing"
          videoRef={vA}
          src={srcA}
          onPick={(f) => pick('a', f)}
          onMeta={(d) => setDurA(d)}
          onClickVideo={toggle}
        />
        <Well
          label="Reference"
          videoRef={vB}
          src={srcB}
          onPick={(f) => pick('b', f)}
          onMeta={(d) => setDurB(d)}
          onClickVideo={toggle}
        />
      </div>

      <div className={`compare__transport${hasAny ? '' : ' compare__transport--off'}`}>
        <div className="transport">
          <div className="transport__group">
            <button className="transport__btn" onClick={() => step(-1)} disabled={!hasAny} aria-label="Step back">◂</button>
            <button
              className="transport__btn transport__btn--play"
              onClick={toggle}
              disabled={!hasAny}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <button className="transport__btn" onClick={() => step(1)} disabled={!hasAny} aria-label="Step forward">▸</button>
          </div>
          <div className="transport__speeds" role="group" aria-label="Playback speed">
            <span className="label transport__speeds-label">speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`transport__speed${rate === s ? ' is-active' : ''}`}
                onClick={() => setRate(s)}
                disabled={!hasAny}
                aria-pressed={rate === s}
              >
                {s === 1 ? '1×' : `${s}×`}
              </button>
            ))}
          </div>
        </div>

        <ScrubBar progress={pos} current={current} duration={duration} onSeek={seek} disabled={!hasAny} />
        {hasAny ? (
          <p className="transport__hint label">
            <kbd>space</kbd> play · <kbd>←</kbd> <kbd>→</kbd> step a frame
          </p>
        ) : null}
      </div>

      <p className="compare__note">
        Both clips stay on your device — nothing is uploaded. Load your swing and a reference
        you have the rights to (your own footage or a licensed clip). The reference follows
        your playhead, so address lines up with address.
      </p>
    </section>
  )
}

function Well({
  label,
  videoRef,
  src,
  onPick,
  onMeta,
  onClickVideo,
}: {
  label: string
  videoRef: React.RefObject<HTMLVideoElement>
  src: string | null
  onPick: (f: File | undefined) => void
  onMeta: (d: number) => void
  onClickVideo: () => void
}) {
  return (
    <div className="compare__well">
      <div className="compare__well-head">
        <span className="label">{label}</span>
        {src ? (
          <label className="compare__swap">
            <input type="file" accept="video/*" onChange={(e) => onPick(e.target.files?.[0])} />
            <span>swap</span>
          </label>
        ) : null}
      </div>
      <div className="compare__well-body">
        {src ? (
          <video
            ref={videoRef}
            className="compare__video"
            src={src}
            playsInline
            onLoadedMetadata={(e) => onMeta(e.currentTarget.duration)}
            onClick={onClickVideo}
          />
        ) : (
          <label className="compare__pick">
            <input type="file" accept="video/*" onChange={(e) => onPick(e.target.files?.[0])} />
            <span className="compare__pick-plus" aria-hidden="true">+</span>
            <span className="compare__pick-label">Load {label.toLowerCase()}</span>
          </label>
        )}
      </div>
    </div>
  )
}
