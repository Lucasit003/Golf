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

// Sample rate for the walk. We don't trust the file's fps (phone "slo-mo" is
// interpolated and the container's rate lies), so we sample uniformly. 30/s is
// ample for a swing; the total is capped so long clips don't seek forever.
const SAMPLE_FPS = 30
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
): Promise<Swing> {
  if (!Number.isFinite(video.duration) || video.duration === 0) {
    throw new Error('Video metadata isn’t loaded yet — wait for loadedmetadata before extracting.')
  }

  const { signal } = opts
  const duration = video.duration
  const frames: PoseFrame[] = []
  let lastTs = -1

  video.muted = true
  video.pause()

  // Uniform samples across the clip, capped so a long video doesn't seek forever.
  const count = Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(duration * SAMPLE_FPS)))
  const step = duration / count

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new DOMException('Extraction aborted', 'AbortError')
    const target = Math.min(i * step, Math.max(0, duration - 1e-3))
    await seekTo(video, target, signal)

    let ts = Math.round(video.currentTime * 1000)
    if (ts <= lastTs) ts = lastTs + 1
    lastTs = ts

    const result = landmarker.detectForVideo(video, ts)
    const frame = toPoseFrame(frames.length, ts, result)
    if (frame) frames.push(frame)

    opts.onProgress?.({ frames: frames.length, seconds: video.currentTime, duration })
  }

  return { fps: estimateFps(frames), frames, events: null }
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
