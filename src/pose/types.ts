/*
 * The core data structures, in code. SWING_SPEC is the prose contract; this is
 * the single source of truth the app imports. `PoseFrame[]` is the spine of the
 * whole product — everything downstream is a pure function of it.
 */
import type { Vec3 } from '../lib/vec'

export type { Vec3 }

/** One analyzed frame of video. */
export type PoseFrame = {
  index: number // 0-based frame number
  timeMs: number // presentation timestamp
  landmarks: Vec3[] // 33, normalized image space — DRAW ONLY
  world: Vec3[] // 33, meters, hip-centered — MEASURE WITH THIS
  visibility: number[] // 33, 0–1 per landmark
}

/** The three swing events, as frame indices into `Swing.frames`. */
export type SwingEvents = {
  address: number
  top: number
  impact: number
}

/** A full extracted swing. `fps` is read from the file, never assumed. */
export type Swing = {
  fps: number
  frames: PoseFrame[]
  events: SwingEvents | null
}

/**
 * A reference swing. Joint data is preferred; a `video` field is allowed only
 * when the rights are cleared (see DATA_AND_LEGAL). `source` and `license` are
 * required — a reference without them does not enter the repo.
 */
export type Reference = {
  id: string
  source: string
  license: string
  fps: number
  world: Vec3[][] // frames × 33, time-normalized 0–1
  video?: {
    url: string // local/bundled asset; never a hotlink to another host
    rights: 'owned' | 'licensed'
  }
}

/**
 * A measured quantity against its benchmark. `null` value and `low` confidence
 * are first-class results — the UI must handle them as normally as a clean
 * number. See the swing-metrics skill.
 */
export type Metric = {
  id: string
  label: string
  value: number | null // null when not measurable — a valid outcome
  unit: string
  benchmark: { min: number; max: number; source: string } | null
  confidence: 'good' | 'moderate' | 'low'
  note?: string // why it's null, or why confidence is low
}
