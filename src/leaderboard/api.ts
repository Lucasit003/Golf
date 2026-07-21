import { supabase } from '../lib/supabase'

/*
 * Leaderboard data layer. Reads are public; writes require a signed-in player
 * and only touch that player's own row (see supabase/leaderboard.sql). Analysis
 * stays on-device — only the final score + a chosen handle live here.
 */

export type Entry = {
  user_id: string
  handle: string
  best_score: number
  best_label: string | null
}

const CONFIG_ERROR = 'The leaderboard isn’t connected yet. Try again in a moment.'
const NET_ERROR = 'Couldn’t reach the leaderboard. Check your connection and retry.'

/** The board, best score first. */
export async function listLeaderboard(limit = 100): Promise<{ entries: Entry[]; error?: string }> {
  const sb = supabase()
  if (!sb) return { entries: [], error: CONFIG_ERROR }
  try {
    const { data, error } = await sb
      .from('leaderboard')
      .select('user_id,handle,best_score,best_label')
      .order('best_score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit)
    if (error) return { entries: [], error: friendly(error.message) }
    return { entries: (data ?? []) as Entry[] }
  } catch {
    return { entries: [], error: NET_ERROR }
  }
}

/** The signed-in player's own row, or null if they haven't posted yet. */
export async function getMyEntry(userId: string): Promise<Entry | null> {
  const sb = supabase()
  if (!sb) return null
  try {
    const { data } = await sb
      .from('leaderboard')
      .select('user_id,handle,best_score,best_label')
      .eq('user_id', userId)
      .maybeSingle()
    return (data as Entry) ?? null
  } catch {
    return null
  }
}

/** Post (or raise) the player's best score under their handle. */
export async function postScore(
  userId: string,
  handle: string,
  score: number,
  label: string,
): Promise<{ error?: string }> {
  const sb = supabase()
  if (!sb) return { error: CONFIG_ERROR }
  try {
    const { error } = await sb.from('leaderboard').upsert(
      {
        user_id: userId,
        handle: handle.trim(),
        best_score: score,
        best_label: label,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) return { error: friendly(error.message) }
    return {}
  } catch {
    return { error: NET_ERROR }
  }
}

function friendly(msg: string): string {
  if (/row-level security|permission|not authorized|jwt/i.test(msg)) {
    return 'That post was blocked — try signing in again.'
  }
  if (/relation .* does not exist|schema/i.test(msg)) {
    return 'The leaderboard table isn’t set up yet — run supabase/leaderboard.sql.'
  }
  if (/duplicate|unique|check constraint/i.test(msg)) {
    return 'Pick a handle of 2–24 characters.'
  }
  return msg
}
