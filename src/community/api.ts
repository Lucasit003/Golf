import { supabase, SWING_BUCKET } from '../lib/supabase'

/*
 * Community swing library — the thin data layer over Supabase.
 *
 * Analysis stays on-device; this module only touches the network when a user
 * explicitly shares a swing or opens the library. Every read is limited by RLS
 * to APPROVED swings; every submission lands as PENDING for moderation.
 */

export type Angle = 'down_the_line' | 'face_on'
export type Handedness = 'right' | 'left'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro'

export type SwingRow = {
  id: string
  created_at: string
  handedness: Handedness | null
  angle: Angle
  club: string | null
  skill_level: SkillLevel | null
  caption: string | null
  tempo: number | null
  metrics: Record<string, unknown> | null
  video_path: string
  thumb_path: string | null
  status: 'pending' | 'approved' | 'rejected'
}

export type SwingCard = SwingRow & { videoUrl: string | null }

export type ShareInput = {
  file: File
  angle: Angle
  handedness: Handedness | null
  skillLevel: SkillLevel | null
  club: string | null
  caption: string | null
  tempo: number | null
}

const CONFIG_ERROR = 'The swing library isn’t connected yet. Try again in a moment.'

/** Approved swings, newest first, each with a short-lived signed video URL. */
export async function listApprovedSwings(limit = 40): Promise<{ swings: SwingCard[]; error?: string }> {
  const sb = supabase()
  if (!sb) return { swings: [], error: CONFIG_ERROR }

  try {
    const { data, error } = await sb
      .from('swings')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { swings: [], error: friendly(error.message) }
    const rows = (data ?? []) as SwingRow[]
    if (rows.length === 0) return { swings: [] }

    // Sign every video path in one call; the RLS policy only lets this succeed
    // for objects that belong to an approved swing.
    const paths = rows.map((r) => r.video_path)
    const { data: signed } = await sb.storage.from(SWING_BUCKET).createSignedUrls(paths, 3600)
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

    const swings = rows.map((r) => ({ ...r, videoUrl: urlByPath.get(r.video_path) ?? null }))
    return { swings }
  } catch {
    return { swings: [], error: 'Couldn’t reach the swing library. Check your connection and retry.' }
  }
}

/** Upload a video and file the swing as a pending submission. */
export async function submitSwing(input: ShareInput): Promise<{ error?: string }> {
  const sb = supabase()
  if (!sb) return { error: CONFIG_ERROR }

  const ext = extensionOf(input.file) || 'mp4'
  const path = `incoming/${crypto.randomUUID()}.${ext}`

  try {
    const up = await sb.storage.from(SWING_BUCKET).upload(path, input.file, {
      contentType: input.file.type || 'video/mp4',
      upsert: false,
    })
    if (up.error) return { error: friendly(up.error.message) }

    const { error } = await sb.from('swings').insert({
      video_path: path,
      angle: input.angle,
      handedness: input.handedness,
      skill_level: input.skillLevel,
      club: input.club,
      caption: input.caption,
      tempo: input.tempo,
      consent: true,
      status: 'pending',
    })
    if (error) {
      // Best-effort cleanup so a failed insert doesn't orphan the upload.
      await sb.storage.from(SWING_BUCKET).remove([path])
      return { error: friendly(error.message) }
    }
    return {}
  } catch {
    return { error: 'Couldn’t reach the swing library. Check your connection and try again.' }
  }
}

function extensionOf(file: File): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(file.name)
  return m ? m[1].toLowerCase() : null
}

function friendly(msg: string): string {
  if (/row-level security|permission|not authorized/i.test(msg)) {
    return 'That submission was blocked by the library’s rules. If this keeps happening, the database may need setup.'
  }
  if (/relation .* does not exist|schema/i.test(msg)) {
    return 'The swing library isn’t set up yet — the database schema still needs to be run.'
  }
  return msg
}
