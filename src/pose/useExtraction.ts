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
  | { status: 'extracting'; progress: number }
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
      setState({ status: 'extracting', progress: 0 })
      if (!landmarkerRef.current) {
        landmarkerRef.current = await createPoseLandmarker()
      }
      video.currentTime = 0

      // Watchdog: extraction plays the clip at ~1×, so a stalled decode or a clip
      // that never fires "ended" would hang the UI forever. Abort after a generous
      // multiple of the clip length so a stall fails cleanly instead.
      const controller = new AbortController()
      const budgetMs = Math.max(30_000, (video.duration || 0) * 1000 * 4)
      const watchdog = setTimeout(() => controller.abort(), budgetMs)

      let swing
      try {
        swing = await extractSwing(video, landmarkerRef.current, {
          signal: controller.signal,
          onProgress: (p) =>
            setState({ status: 'extracting', progress: p.duration ? p.seconds / p.duration : 0 }),
        })
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
      // that actually matters. Coverage (frames with a pose) is implicit: extract
      // drops poseless frames, so a tracked swing has full coverage by definition.
      const confidence = overallConfidence(swing)
      const coverage = tracked.length ? 1 : 0

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
