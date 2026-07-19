import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
 * Supabase client for the community swing library.
 *
 * The URL and publishable key below are safe to ship in the browser — that's
 * what a publishable/anon key is for. Row-level security (see supabase/schema.sql)
 * is what actually protects the data: the public key can only read APPROVED
 * swings and insert PENDING ones. Never put the service_role/secret key here.
 *
 * Env vars win when set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), so the
 * project can be re-pointed in Vercel without a code change.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://aoyyvnkodxrnzojdbqsz.supabase.co'
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_nllSLQuOanId99bVP388Fw_9xfg7lkC'

let client: SupabaseClient | null = null

/** The shared client, created lazily. Returns null only if config is missing. */
export function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: false },
    })
  }
  return client
}

export const SWING_BUCKET = 'swing-videos'
