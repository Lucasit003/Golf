import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseFrame, Swing } from './types'
import { toPoseFrame } from './mapResult'

/*
 * Walk a video frame by frame and collect a PoseFrame per frame.
 *
 * Design note for Lucas — this differs from the seek-walk sketched in
 * SWING_SPEC. Instead of `video.currentTime = t` + waiting for `seeked` (which
 * lands on the *nearest* decodable frame, not the one you asked for, and makes
 * timestamps hard to keep strictly increasing), it drives extraction from
 * `requestVideoFrameCallback`, which fires once per actually-presented frame and
 * hands back that frame's real `mediaTime`. That sidesteps the async-seek
 * imprecision trap entirely and gives true per-frame timing. If a browser lacks
 * rVFC, we reject rather than guess. Worth a look before M2 relies on it.
 *
 * Extraction runs at playback speed and that's fine — it's a one-time cost per
 * upload with a progress bar. Do not optimize it before it's correct.
 */

export type ExtractProgress = { frames: number; seconds: number; duration: number }
export type ExtractOptions = {
  onProgress?: (p: ExtractProgress) => void
  signal?: AbortSignal
}

type RVFCMeta = { mediaTime: number }
type RVFCVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: RVFCMeta) => void) => number
}

export async function extractSwing(
  video: HTMLVideoElement,
  landmarker: PoseLandmarker,
  opts: ExtractOptions = {},
): Promise<Swing> {
  const v = video as RVFCVideo
  if (typeof v.requestVideoFrameCallback !== 'function') {
    throw new Error('This browser can’t read individual video frames (no requestVideoFrameCallback).')
  }
  if (!Number.isFinite(video.duration) || video.duration === 0) {
    throw new Error('Video metadata isn’t loaded yet — wait for loadedmetadata before extracting.')
  }

  const frames: PoseFrame[] = []
  let index = 0
  let lastTs = -1

  video.muted = true
  video.playbackRate = 1

  await new Promise<void>((resolve, reject) => {
    // Stall guard: if the clip never presents a single frame, the frame callback
    // never fires and we'd sit at 0% until the outer watchdog gives up 30s later.
    // The usual cause on a phone is Low Power Mode throttling/pausing the muted
    // background playback the tracker rides on — so fail fast and say so.
    let stall: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      if (index === 0) {
        video.pause()
        reject(
          new Error(
            'The video isn’t playing through to be read. If your phone is in Low Power Mode, turn it off — it pauses the background playback tracking needs. Then tap Track again.',
          ),
        )
      }
    }, 8000)
    const clearStall = () => {
      if (stall) clearTimeout(stall)
      stall = undefined
    }

    const abort = () => {
      clearStall()
      video.pause()
      reject(new DOMException('Extraction aborted', 'AbortError'))
    }
    if (opts.signal) {
      if (opts.signal.aborted) return abort()
      opts.signal.addEventListener('abort', abort, { once: true })
    }

    const onFrame = (_now: number, meta: RVFCMeta) => {
      clearStall()
      // MediaPipe VIDEO mode throws if timestamps don't strictly increase.
      let ts = Math.round(meta.mediaTime * 1000)
      if (ts <= lastTs) ts = lastTs + 1
      lastTs = ts

      const result = landmarker.detectForVideo(video, ts)
      const frame = toPoseFrame(index, ts, result)
      if (frame) frames.push(frame)
      index += 1

      opts.onProgress?.({ frames: frames.length, seconds: meta.mediaTime, duration: video.duration })

      if (!video.ended && !video.paused) {
        v.requestVideoFrameCallback!(onFrame)
      }
    }

    video.addEventListener(
      'ended',
      () => {
        clearStall()
        opts.signal?.removeEventListener('abort', abort)
        resolve()
      },
      { once: true },
    )

    v.requestVideoFrameCallback!(onFrame)
    video.play().catch(() => {
      clearStall()
      reject(
        new Error(
          'This browser blocked the clip from playing, so it can’t be read. Tap the video once to start it, then tap Track again.',
        ),
      )
    })
  })

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
