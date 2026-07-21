import { useCallback, useEffect, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Swing } from './types'
import { createPoseLandmarker } from './landmarker'
import { extractSwing } from './extract'
import { overallConfidence } from './confidence'

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
  // stage 'loading' = fetching the pose model the first time (no progress yet);
  // stage 'reading' = walking the clip frame by frame (progress is real).
  | { status: 'extracting'; progress: number; stage: 'loading' | 'reading' }
  | { status: 'done'; swing: Swing; confidence: number; coverage: number }
  | { status: 'failed'; message: string }

export function useExtraction() {
  const [state, setState] = useState<ExtractionState>({ status: 'idle' })
  const landmarkerRef = useRef<PoseLandmarker | null>(null)

  // Free the WASM-backed landmarker when the screen unmounts.
  useEffect(() => {
    return () => {
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  // Restore a previously-computed result — used when switching between the
  // down-the-line and face-on clips so each angle keeps its survey.
  const hydrate = useCallback(
    (swing: Swing, confidence: number, coverage: number) =>
      setState({ status: 'done', swing, confidence, coverage }),
    [],
  )

  const run = useCallback(async (video: HTMLVideoElement) => {
    try {
      // First run downloads the pose model — that can take a few seconds, so say
      // "loading" rather than parking at 0% and looking frozen.
      setState({ status: 'extracting', progress: 0, stage: 'loading' })
      if (!landmarkerRef.current) {
        landmarkerRef.current = await createPoseLandmarker()
      }
      setState({ status: 'extracting', progress: 0, stage: 'reading' })
      video.currentTime = 0

      // Watchdog: the seek-walk steps through the clip frame by frame, and a slow
      // phone (or a flaky decoder) could drag. Abort after a generous multiple of
      // the clip length so a genuine stall fails cleanly instead of hanging.
      const controller = new AbortController()
      const budgetMs = Math.max(45_000, (video.duration || 0) * 1000 * 8)
      const watchdog = setTimeout(() => controller.abort(), budgetMs)

      let swing
      let coverage
      try {
        const result = await extractSwing(video, landmarkerRef.current, {
          signal: controller.signal,
          onProgress: (p) =>
            setState({
              status: 'extracting',
              stage: 'reading',
              progress: p.duration ? p.seconds / p.duration : 0,
            }),
        })
        swing = result.swing
        coverage = result.coverage
      } finally {
        clearTimeout(watchdog)
      }
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

      // Confidence is the mean visibility of the joints we measure — the signal
      // that actually matters. Coverage is the fraction of sampled frames a body
      // was found in, straight from extraction — the honest "did we see a golfer
      // the whole way through" read the framing check leans on.
      const confidence = overallConfidence(swing)

      setState({ status: 'done', swing, confidence, coverage })
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      setState({
        status: 'failed',
        message: aborted
          ? 'Tracking took too long and was stopped — try a shorter clip, or one that plays cleanly.'
          : err instanceof Error
            ? err.message
            : 'Pose tracking failed unexpectedly.',
      })
    }
  }, [])

  return { state, run, reset, hydrate }
}
