import type { Swing } from './types'

/*
 * Export a tracked swing as JSON. Two reasons this matters:
 *  1. It lets you keep a tracked swing off the device.
 *  2. It's how a swing becomes a test fixture — save the PoseFrame[], commit it,
 *     and event detection can be validated against it frame by frame (the M2
 *     exit-test workflow in ARCHITECTURE). Corrections are the most valuable data
 *     the app generates.
 *
 * The payload is joint data only — never the video — which is also the shape a
 * reference is allowed to take (see DATA_AND_LEGAL).
 */

export type SwingExport = {
  format: 'setjis.swing'
  version: 1
  createdAt: string
  fps: number
  frameCount: number
  events: Swing['events']
  frames: Swing['frames']
}

/** Serialize a swing to a stable, versioned JSON string. Pure — easy to test. */
export function swingToJSON(swing: Swing, now: () => string = () => new Date().toISOString()): string {
  const payload: SwingExport = {
    format: 'setjis.swing',
    version: 1,
    createdAt: now(),
    fps: swing.fps,
    frameCount: swing.frames.length,
    events: swing.events,
    frames: swing.frames,
  }
  return JSON.stringify(payload, null, 2)
}

/** Trigger a browser download of the swing JSON. */
export function downloadSwing(swing: Swing, filename = `swing-${Date.now()}.json`): void {
  const blob = new Blob([swingToJSON(swing)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
