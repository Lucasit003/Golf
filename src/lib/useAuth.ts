import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/*
 * Auth for the leaderboard — passwordless magic link. Signing in is only ever
 * needed to POST a score; reading the board and the whole on-device survey never
 * require an account.
 */

export function useAuth(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = supabase()
    if (!sb) {
      setReady(true)
      return
    }
    let active = true
    sb.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, ready }
}

/** Email a magic sign-in link that returns to the app. */
export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const sb = supabase()
  if (!sb) return { error: 'The leaderboard isn’t connected yet.' }
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return { error: error.message }
    return {}
  } catch {
    return { error: 'Couldn’t send the link. Check your connection and try again.' }
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase()?.auth.signOut()
  } catch {
    /* best effort */
  }
}
