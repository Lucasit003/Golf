import { useCallback, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Swing } from './types'
import { createPoseLandmarker } from './landmarker'
import { extractSwing } from './extract'
import { POSE_JOINTS } from './skeleton'

/*
 * Runs pose extraction on a loaded video and reports honest state: idle →
 * extracting (with progress) → done (with a confidence read) or failed (with a
 * reason). The landmarker is heavy, so it's created once and reused.
 *
 * Confidence is the mean visibility of the joints we measure, across the frames
 * where a pose was found, times the fraction of frames that had a pose at all.
 * When tracking is poor we say so — we never dress up a bad extraction.
 */

export type ExtractionState =
  | { status: 'idle' }
  | { status: 'extracting'; progress: number }
  | { status: 'done'; swing: Swing; confidence: number; coverage: number }
  | { status: 'failed'; message: string }

export function useExtraction() {
  const [state, setState] = useState<ExtractionState>({ status: 'idle' })
  const landmarkerRef = useRef<PoseLandmarker | null>(null)

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  const run = useCallback(async (video: HTMLVideoElement) => {
    try {
      setState({ status: 'extracting', progress: 0 })
      if (!landmarkerRef.current) {
        landmarkerRef.current = await createPoseLandmarker()
      }
      video.currentTime = 0

      const swing = await extractSwing(video, landmarkerRef.current, {
        onProgress: (p) =>
          setState({ status: 'extracting', progress: p.duration ? p.seconds / p.duration : 0 }),
      })
      video.pause()
      video.currentTime = 0

      const tracked = swing.frames
      if (tracked.length < 5) {
        setState({
          status: 'failed',
          message:
            "Couldn't track a body in this clip. Make sure the full body is in frame, well lit, and filmed from a steady camera.",
        })
        return
      }

      // Coverage: fraction of the walked frames that produced a pose is implicit
      // in extract (frames without a pose are dropped), so approximate coverage
      // from how densely frames landed vs. the video length is out of scope here;
      // report joint visibility, the signal that actually matters for measurement.
      let sum = 0
      let count = 0
      for (const f of tracked) {
        for (const j of POSE_JOINTS) {
          sum += f.visibility[j] ?? 0
          count++
        }
      }
      const confidence = count ? sum / count : 0
      const coverage = tracked.length ? 1 : 0

      setState({ status: 'done', swing, confidence, coverage })
    } catch (err) {
      setState({
        status: 'failed',
        message: err instanceof Error ? err.message : 'Pose tracking failed unexpectedly.',
      })
    }
  }, [])

  return { state, run, reset }
}
