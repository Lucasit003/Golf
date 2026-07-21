import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../design/Button'
import { useAuth, signUpWithPassword, signInWithPassword, signOut } from '../lib/useAuth'
import { useLocker } from '../locker/store'
import { Crest } from '../locker/Avatar'
import { getBestScore } from '../metrics/bestScore'
import { scoreLabel } from '../metrics/score'
import {
  listLeaderboard,
  getMyEntry,
  postScore,
  getProfile,
  claimUsername,
  type Entry,
  type Profile,
} from './api'
import './Leaderboard.css'

/*
 * The leaderboard: best swing scores, ranked. Reading is public; posting needs
 * an account (email + password) and a reserved, unique username. Your analysis
 * stays on-device — only the final score and your username are posted.
 */

const PENDING_KEY = 'setjis.pendingUsername'

export function Leaderboard({ onBack, onFilm }: { onBack: () => void; onFilm: () => void }) {
  const { session, ready } = useAuth()
  const userId = session?.user.id ?? null
  const email = session?.user.email ?? null

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function loadBoard() {
    setLoading(true)
    const { entries, error } = await listLeaderboard()
    setEntries(entries)
    setLoadError(error ?? null)
    setLoading(false)
  }
  useEffect(() => {
    void loadBoard()
  }, [])

  const myRank = userId ? entries.findIndex((e) => e.user_id === userId) : -1

  return (
    <section className="lb" aria-label="Leaderboard">
      <header className="lb__head">
        <p className="label lb__eyebrow">Clubhouse · leaderboard</p>
        <h1 className="lb__title">The Leaderboard.</h1>
        <p className="lb__lede">
          Best swing scores, ranked by how close each swing sits to the tour numbers. Your analysis
          stays on your device — only the score and your username are posted, and only when you
          choose to.
        </p>
      </header>

      <YourCard
        ready={ready}
        userId={userId}
        email={email}
        rank={myRank >= 0 ? myRank + 1 : null}
        onChanged={loadBoard}
        onFilm={onFilm}
      />

      <div className="lb__board">
        <div className="lb__board-head">
          <span className="label">Standings</span>
          <button className="lb__refresh" onClick={() => void loadBoard()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {loadError ? (
          <p className="lb__note lb__note--warn">{loadError}</p>
        ) : loading ? (
          <p className="lb__note">Loading the board…</p>
        ) : entries.length === 0 ? (
          <p className="lb__note">No scores yet — be the first to post one.</p>
        ) : (
          <ol className="lb__list">
            {entries.map((e, i) => (
              <Row key={e.user_id} entry={e} rank={i + 1} isMe={e.user_id === userId} />
            ))}
          </ol>
        )}
      </div>

      <div className="lb__actions">
        <Button variant="line" onClick={onBack}>
          Back
        </Button>
      </div>
    </section>
  )
}

function Row({ entry, rank, isMe }: { entry: Entry; rank: number; isMe: boolean }) {
  const { state } = useLocker()
  return (
    <li className={`lb__row${isMe ? ' is-me' : ''}`}>
      <span className={`lb__rank data lb__rank--${rank <= 3 ? rank : 'n'}`}>{rank}</span>
      {isMe ? <Crest equip={state.equip} className="lb__crest" /> : <span className="lb__crest-gap" />}
      <span className="lb__handle">
        {entry.handle}
        {isMe ? <span className="lb__you label">you</span> : null}
      </span>
      <span className="lb__score data">
        {entry.best_score}
        {entry.best_label ? <span className="lb__tier label">{entry.best_label}</span> : null}
      </span>
    </li>
  )
}

// ── The "you" card routes through: sign in/up → claim username → post ─────────
function YourCard({
  ready,
  userId,
  email,
  rank,
  onChanged,
  onFilm,
}: {
  ready: boolean
  userId: string | null
  email: string | null
  rank: number | null
  onChanged: () => void
  onFilm: () => void
}) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let active = true
    setProfile(undefined)
    getProfile(userId).then((p) => {
      if (active) setProfile(p)
    })
    return () => {
      active = false
    }
  }, [userId])

  if (!ready) return <div className="lb__you-card"><p className="lb__note">Connecting…</p></div>
  if (!userId) return <AuthForm />
  if (profile === undefined) return <div className="lb__you-card"><p className="lb__note">Loading your profile…</p></div>
  if (profile === null) return <ClaimUsername userId={userId} onClaimed={setProfile} />
  return (
    <PostPanel
      userId={userId}
      email={email}
      username={profile.username}
      rank={rank}
      onChanged={onChanged}
      onFilm={onFilm}
    />
  )
}

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      setError('Username: 3–20 letters, numbers or underscores.')
      return
    }
    setBusy(true)
    if (mode === 'signup') {
      const { needsConfirm, error } = await signUpWithPassword(email.trim(), password)
      setBusy(false)
      if (error) {
        setError(error)
        return
      }
      // Remember the desired username to claim once there's a session.
      try {
        localStorage.setItem(PENDING_KEY, username.trim())
      } catch {
        /* ignore */
      }
      if (needsConfirm) setConfirm(true)
      // Otherwise the auth state changes and the username-claim step appears.
    } else {
      const { error } = await signInWithPassword(email.trim(), password)
      setBusy(false)
      if (error) setError(error)
    }
  }

  if (confirm) {
    return (
      <div className="lb__you-card">
        <p className="lb__you-title">Confirm your email</p>
        <p className="lb__note">
          We sent a confirmation link to <strong>{email}</strong>. Tap it, then come back and sign
          in — your username will be waiting.
        </p>
        <button
          className="lb__link"
          onClick={() => {
            setConfirm(false)
            setMode('signin')
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form className="lb__you-card" onSubmit={submit}>
      <div className="lb__auth-tabs">
        <button
          type="button"
          className={mode === 'signin' ? 'is-active' : ''}
          onClick={() => {
            setMode('signin')
            setError(null)
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'is-active' : ''}
          onClick={() => {
            setMode('signup')
            setError(null)
          }}
        >
          Create account
        </button>
      </div>
      <p className="lb__note">
        {mode === 'signin'
          ? 'Sign in to post your best to the board.'
          : 'Your username is reserved to you — no one else can take it.'}
      </p>
      {mode === 'signup' ? (
        <input
          className="lb__input"
          type="text"
          placeholder="username"
          value={username}
          maxLength={20}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
        />
      ) : null}
      <input
        className="lb__input"
        type="email"
        placeholder="you@email.com"
        value={email}
        required
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="lb__input"
        type="password"
        placeholder="password (6+ characters)"
        value={password}
        required
        minLength={6}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" variant="fairway" disabled={busy}>
        {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </Button>
      {error ? <p className="lb__note lb__note--warn">{error}</p> : null}
    </form>
  )
}

function ClaimUsername({
  userId,
  onClaimed,
}: {
  userId: string
  onClaimed: (p: Profile) => void
}) {
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(PENDING_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await claimUsername(userId, username.trim())
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    try {
      localStorage.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }
    onClaimed({ user_id: userId, username: username.trim() })
  }

  return (
    <form className="lb__you-card" onSubmit={claim}>
      <p className="lb__you-title">Pick your username</p>
      <p className="lb__note">This is how you show on the board — it’s yours, no one else can take it.</p>
      <div className="lb__row-form">
        <input
          className="lb__input"
          type="text"
          placeholder="username"
          value={username}
          maxLength={20}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button type="submit" variant="fairway" disabled={busy || username.trim().length < 3}>
          {busy ? 'Claiming…' : 'Claim'}
        </Button>
      </div>
      {error ? <p className="lb__note lb__note--warn">{error}</p> : null}
      <button type="button" className="lb__signout label" onClick={() => void signOut()}>
        Sign out
      </button>
    </form>
  )
}

function PostPanel({
  userId,
  email,
  username,
  rank,
  onChanged,
  onFilm,
}: {
  userId: string
  email: string | null
  username: string
  rank: number | null
  onChanged: () => void
  onFilm: () => void
}) {
  const localBest = getBestScore()
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyEntry(userId).then((e) => {
      if (active) setEntry(e)
    })
    return () => {
      active = false
    }
  }, [userId])

  const serverBest = entry?.best_score ?? null
  const canImprove = localBest != null && (serverBest == null || localBest > serverBest)

  async function post() {
    if (localBest == null) return
    setPosting(true)
    setError(null)
    const { error } = await postScore(userId, username, localBest, scoreLabel(localBest))
    setPosting(false)
    if (error) {
      setError(error)
      return
    }
    const fresh = await getMyEntry(userId)
    setEntry(fresh)
    onChanged()
  }

  return (
    <div className="lb__you-card">
      <div className="lb__you-top">
        <div>
          <p className="lb__you-title">@{username}</p>
          {email ? <p className="label lb__you-sub">{email}</p> : null}
        </div>
        <button className="lb__signout label" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      {localBest == null ? (
        <>
          <p className="lb__note">No swing score yet. Analyze a swing, then post your best.</p>
          <Button variant="line" onClick={onFilm}>
            Film a swing
          </Button>
        </>
      ) : entry === undefined ? (
        <p className="lb__note">Loading your entry…</p>
      ) : (
        <>
          <div className="lb__you-score">
            <span className="lb__you-num data">{localBest}</span>
            <span className="label lb__you-best">your best</span>
            {entry ? (
              <span className="label lb__you-standing">
                on the board{rank ? ` · #${rank}` : ''} · {serverBest}
              </span>
            ) : null}
          </div>
          <Button variant="fairway" onClick={post} disabled={posting || !canImprove}>
            {posting ? 'Posting…' : entry ? (canImprove ? 'Update best' : 'Posted') : 'Post to board'}
          </Button>
          {entry && !canImprove ? (
            <p className="label lb__hint">Beat {serverBest} to move up your entry.</p>
          ) : null}
          {error ? <p className="lb__note lb__note--warn">{error}</p> : null}
        </>
      )}
    </div>
  )
}
