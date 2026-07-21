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

const NOT_CONNECTED = 'The leaderboard isn’t connected yet.'

/**
 * Create an account with an email + password. Returns needsConfirm when the
 * project requires email confirmation (no session yet) — the player must click
 * the confirmation email before they can post.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ needsConfirm?: boolean; error?: string }> {
  const sb = supabase()
  if (!sb) return { error: NOT_CONNECTED }
  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return { error: error.message }
    return { needsConfirm: !data.session }
  } catch {
    return { error: 'Couldn’t create the account. Check your connection and try again.' }
  }
}

/** Sign in with an existing email + password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const sb = supabase()
  if (!sb) return { error: NOT_CONNECTED }
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
  } catch {
    return { error: 'Couldn’t sign in. Check your connection and try again.' }
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase()?.auth.signOut()
  } catch {
    /* best effort */
  }
}
