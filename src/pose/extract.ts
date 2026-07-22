import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseFrame, Swing } from './types'
import { toPoseFrame } from './mapResult'

/*
 * Walk a video frame by frame and collect a PoseFrame per sample.
 *
 * Design note for Lucas — this is the seek-walk from SWING_SPEC, and it replaced
 * an earlier version that rode real-time playback via requestVideoFrameCallback.
 * That version broke on phones: iOS Low Power Mode throttles the frame callback
 * to a trickle, so a short clip played through having delivered only two or three
 * frames — under the tracking floor — and the app wrongly blamed the user's
 * framing. Seeking is driven by JS instead of by the video's paint rate, so it
 * can't be starved: we step through the clip at a fixed sample rate, wait for the
 * frame to land, and read the pose off it. Slower on some devices, but it always
 * sees the whole swing. Do not trade that back for speed.
 *
 * We record each sample's REAL time (video.currentTime after the seek settles),
 * not the time we asked for — a seek lands on the nearest decodable frame — and
 * clamp to keep timestamps strictly increasing (MediaPipe VIDEO mode requires it).
 */

export type ExtractProgress = { frames: number; seconds: number; duration: number }
export type ExtractOptions = {
  onProgress?: (p: ExtractProgress) => void
  signal?: AbortSignal
}
/** The tracked swing plus the fraction of sampled frames a body was found in. */
export type ExtractResult = { swing: Swing; coverage: number }

// Sample rate for the walk. We step finely — 60/s — so the fast part of the
// swing (transition, impact) is pinned tightly: an angle read at the top or at
// impact is only as accurate as the frame we caught it on, and ±1/60s beats
// ±1/30s where the club is moving fastest. On a clip whose real rate is lower,
// the extra seeks land on frames we've already read and are skipped (see the
// dedup below), so we never sample finer than the footage actually is. The total
// seek count is capped so a long clip doesn't seek forever.
const SAMPLE_FPS = 60
const MAX_SAMPLES = 240

/** Seek to `t` and resolve once the frame has settled. A short fallback timer
 *  covers the case where 'seeked' doesn't fire (e.g. a seek to the same frame),
 *  so the walk can never wedge on one sample. */
function seekTo(video: HTMLVideoElement, t: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeEventListener('seeked', onSeeked)
      signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const onSeeked = () => finish(resolve)
    const onAbort = () => finish(() => reject(new DOMException('Extraction aborted', 'AbortError')))
    const timer = setTimeout(() => finish(resolve), 600)
    video.addEventListener('seeked', onSeeked, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
    video.currentTime = t
  })
}

export async function extractSwing(
  video: HTMLVideoElement,
  landmarker: PoseLandmarker,
  opts: ExtractOptions = {},
): Promise<ExtractResult> {
  if (!Number.isFinite(video.duration) || video.duration === 0) {
    throw new Error('Video metadata isn’t loaded yet — wait for loadedmetadata before extracting.')
  }

  const { signal } = opts
  const duration = video.duration
  const frames: PoseFrame[] = []
  let lastTs = -1
  let seen = 0

  video.muted = true
  video.pause()

  // Uniform samples across the clip, capped so a long video doesn't seek forever.
  const count = Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(duration * SAMPLE_FPS)))
  const step = duration / count

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new DOMException('Extraction aborted', 'AbortError')
    const target = Math.min(i * step, Math.max(0, duration - 1e-3))
    await seekTo(video, target, signal)

    // The real time this seek settled on. If it's not past the last frame we
    // kept, the seek landed on a frame we already read (sampling finer than the
    // clip's own rate) — skip it. That keeps timestamps strictly increasing for
    // MediaPipe, avoids duplicate frames skewing the fps estimate, and saves the
    // inference. `seen` counts the distinct frames, so coverage stays honest.
    const ts = Math.round(video.currentTime * 1000)
    if (ts <= lastTs) continue
    lastTs = ts
    seen += 1

    const result = landmarker.detectForVideo(video, ts)
    const frame = toPoseFrame(frames.length, ts, result)
    if (frame) frames.push(frame)

    opts.onProgress?.({ frames: frames.length, seconds: video.currentTime, duration })
  }

  // Coverage = fraction of the distinct frames we saw that a body was found in.
  // The real "did we see a golfer" signal; a poseless clip lands near 0 even
  // though the frames we kept are all valid.
  const coverage = seen > 0 ? frames.length / seen : 0
  return { swing: { fps: estimateFps(frames), frames, events: null }, coverage }
}

/**
 * Estimate the real frame rate from the median inter-frame gap. We read it from
 * the frames actually decoded rather than trusting the file — phone "slo-mo" is
 * often interpolated, and the container's claimed rate lies.
 */
export function estimateFps(frames: PoseFrame[]): number {
  if (frames.length < 2) return 0
  const gaps: number[] = []
  for (let i = 1; i < frames.length; i++) gaps.push(frames[i].timeMs - frames[i - 1].timeMs)
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]
  return median > 0 ? Math.round(1000 / median) : 0
}
