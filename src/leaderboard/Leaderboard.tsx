import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../design/Button'
import { useAuth, sendMagicLink, signOut } from '../lib/useAuth'
import { useLocker } from '../locker/store'
import { Crest } from '../locker/Avatar'
import { getBestScore } from '../metrics/bestScore'
import { scoreLabel } from '../metrics/score'
import { listLeaderboard, getMyEntry, postScore, type Entry } from './api'
import './Leaderboard.css'

/*
 * The leaderboard: best swing scores, ranked. Reading is public; posting needs a
 * (passwordless) sign-in and only ever writes your own row. The survey stays
 * entirely on-device — only the final score and a handle you choose are posted.
 */

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
          stays on your device — only the score and a handle you pick are posted, and only when you
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
  if (!ready) return <div className="lb__you-card"><p className="lb__note">Connecting…</p></div>
  if (!userId) return <SignIn />
  return (
    <PostPanel userId={userId} email={email} rank={rank} onChanged={onChanged} onFilm={onFilm} />
  )
}

type SignInState = 'idle' | 'sending' | 'sent' | 'error'

function SignIn() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SignInState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('sending')
    setError(null)
    const { error } = await sendMagicLink(email.trim())
    if (error) {
      setState('error')
      setError(error)
      return
    }
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="lb__you-card">
        <p className="lb__you-title">Check your email</p>
        <p className="lb__note">
          We sent a sign-in link to <strong>{email}</strong>. Tap it and you’ll land back here,
          signed in and ready to post.
        </p>
      </div>
    )
  }

  return (
    <form className="lb__you-card" onSubmit={submit}>
      <p className="lb__you-title">Post your score</p>
      <p className="lb__note">
        Sign in to put your best on the board — no password, just a link to your email.
      </p>
      <div className="lb__row-form">
        <input
          className="lb__input"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="fairway" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send link'}
        </Button>
      </div>
      {error ? <p className="lb__note lb__note--warn">{error}</p> : null}
    </form>
  )
}

function PostPanel({
  userId,
  email,
  rank,
  onChanged,
  onFilm,
}: {
  userId: string
  email: string | null
  rank: number | null
  onChanged: () => void
  onFilm: () => void
}) {
  const localBest = getBestScore()
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined) // undefined = loading
  const [handle, setHandle] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyEntry(userId).then((e) => {
      if (!active) return
      setEntry(e)
      if (e) setHandle(e.handle)
    })
    return () => {
      active = false
    }
  }, [userId])

  const serverBest = entry?.best_score ?? null
  const canImprove = localBest != null && (serverBest == null || localBest > serverBest)

  async function post() {
    if (localBest == null || handle.trim().length < 2) return
    setPosting(true)
    setError(null)
    const { error } = await postScore(userId, handle.trim(), localBest, scoreLabel(localBest))
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
          <p className="lb__you-title">Your entry</p>
          {email ? <p className="label lb__you-sub">{email}</p> : null}
        </div>
        <button className="lb__signout label" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      {localBest == null ? (
        <>
          <p className="lb__note">
            No swing score yet. Analyze a swing, then come back to post your best.
          </p>
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
          <div className="lb__row-form">
            <input
              className="lb__input"
              type="text"
              placeholder="pick a handle"
              maxLength={24}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <Button variant="fairway" onClick={post} disabled={posting || handle.trim().length < 2 || !canImprove}>
              {posting ? 'Posting…' : entry ? (canImprove ? 'Update' : 'Posted') : 'Post to board'}
            </Button>
          </div>
          {entry && !canImprove ? (
            <p className="label lb__hint">Beat {serverBest} to move up your entry.</p>
          ) : null}
          {error ? <p className="lb__note lb__note--warn">{error}</p> : null}
        </>
      )}
    </div>
  )
}
