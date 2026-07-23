import { useEffect, useRef, useState } from 'react'
import { Button } from '../design/Button'
import { useLocker } from './store'
import { Golfer, Crest } from './Avatar'
import { ITEMS, RARITY, collectionComplete, type Item, type OpenResult } from './model'
import './Locker.css'

/*
 * The Locker screen: your golfer and crest, the keys you've earned, and the
 * crate that turns keys into cosmetics. Reads only from the local locker store
 * — no survey data, no network. The reveal is deliberately celebratory but
 * short, and it reuses the same confetti language as the closing scene.
 */

// Confetti fanned up out of the reveal, same palette as the hole scene.
const BURST = Array.from({ length: 16 }, (_, i) => {
  const spread = 0.16 + (i / 16) * 0.7
  const dist = 90 + ((i * 37) % 70)
  const side = i % 2 ? 1 : -1
  return {
    fx: Math.round(Math.cos(Math.PI * spread) * side * dist),
    fy: Math.round(-Math.sin(Math.PI * spread) * dist),
    fr: ((i * 97) % 540) - 270,
  }
})

type Phase = { kind: 'idle' } | { kind: 'spin'; result: OpenResult }

export function Locker({ onFilm, onLeaderboard }: { onFilm: () => void; onLeaderboard: () => void }) {
  const { state, level, tier, toNext, open, equip } = useLocker()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [wardrobe, setWardrobe] = useState(false)

  const into = state.swings % 5
  const complete = collectionComplete(state)
  const canOpen = state.keys >= 1 && !complete

  function startOpen() {
    if (!canOpen) return
    // Roll now, then let the reel spin to the result — case-opening style.
    const result = open()
    if (result) setPhase({ kind: 'spin', result })
  }

  function close() {
    setPhase({ kind: 'idle' })
  }

  return (
    <section className="locker" aria-label="Your locker">
      <header className="locker__head">
        <p className="label locker__eyebrow">Clubhouse · your locker</p>
        <h1 className="locker__title">The Locker.</h1>
        <p className="locker__lede">
          Film swings to earn keys, open crates for cosmetics, and kit out your golfer. It's all
          for looks — nothing here changes a measurement, and nothing leaves your device.
        </p>
        <button className="locker__leaderboard-link" onClick={onLeaderboard}>
          View the leaderboard <span aria-hidden="true">→</span>
        </button>

        <button className="locker__legendary-btn" onClick={() => setWardrobe(true)}>
          <span className="locker__legendary-emblem" aria-hidden="true">
            <Laurel />
          </span>
          <span className="locker__legendary-copy">
            <span className="locker__legendary-name">The Legendary Wardrobe</span>
            <span className="locker__legendary-sub label">
              Thrifted gold — the rarest finds. Pulled at 3%.
            </span>
          </span>
          <span className="locker__legendary-go" aria-hidden="true">→</span>
        </button>
      </header>

      <div className="locker__profile">
        <div className="locker__case">
          <Golfer equip={state.equip} className="locker__golfer" />
        </div>
        <div className="locker__stats">
          <div className="locker__idrow">
            <Crest equip={state.equip} className="locker__crest" />
            <div>
              <p className="locker__name">Your golfer</p>
              <p className="label locker__tier">{tier} · Level {level}</p>
            </div>
          </div>

          <div className="locker__keys" aria-label={`${state.keys} keys`}>
            <span className="locker__keyicon" aria-hidden="true">🔑</span>
            <span className="data locker__keynum">{state.keys}</span>
            <span className="label">keys</span>
          </div>

          <div className="locker__xp">
            <div className="locker__xptrack">
              <i style={{ width: `${(into / 5) * 100}%` }} />
            </div>
            <div className="locker__xplabels label">
              <span>{state.swings} filmed</span>
              <span>{toNext} to level {level + 1}</span>
            </div>
          </div>

          <div className="locker__actions">
            <Button variant="fairway" onClick={startOpen} disabled={!canOpen}>
              {complete ? 'Collection complete' : 'Open a crate'}
              {complete ? null : <span className="locker__cost">1 🔑</span>}
            </Button>
            <Button variant="line" onClick={onFilm}>
              {state.keys < 1 ? 'Film a swing to earn a key' : 'Film a swing · +1 🔑'}
            </Button>
          </div>
          <p className="label locker__odds">
            {complete
              ? 'Every cosmetic collected — nice. Keys keep stacking for whatever lands next.'
              : 'Crate odds — 60% common · 26% rare · 11% epic · 3% legendary. Every crate is one you don’t have yet.'}
          </p>
        </div>
      </div>

      <div className="locker__collhead">
        <span className="label">Collection</span>
        <span className="label data">
          {state.owned.length} / {ITEMS.length}
        </span>
      </div>
      <ul className="locker__grid">
        {ITEMS.map((it) => (
          <Cell
            key={it.id}
            item={it}
            owned={state.owned.includes(it.id)}
            equipped={state.equip[it.slot] === it.id}
            onEquip={() => equip(it.slot, it.id)}
          />
        ))}
      </ul>

      {phase.kind === 'spin' && (
        <div className="locker__overlay" role="dialog" aria-modal="true" aria-label="Opening a crate">
          <div className="locker__reveal">
            <Spinner result={phase.result} onClose={close} />
          </div>
        </div>
      )}

      {wardrobe && (
        <LegendaryWardrobe
          owned={state.owned}
          equip={state.equip}
          onEquip={(slot, id) => equip(slot, id)}
          onClose={() => setWardrobe(false)}
        />
      )}
    </section>
  )
}

// A small gold laurel — the legendary mark.
function Laurel() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <path
        d="M16 5l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5L4.8 10.3l5-.7z"
        fill="currentColor"
      />
      <path
        d="M6 15c0 6 4.5 10 10 11 5.5-1 10-5 10-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  )
}

// ── The Legendary Wardrobe ───────────────────────────────────────────────────
// A gold showcase of just the legendary-rarity cosmetics — a full thrifted set,
// one per slot. Shows which you've unearthed and lets you equip them.
function LegendaryWardrobe({
  owned,
  equip,
  onEquip,
  onClose,
}: {
  owned: string[]
  equip: Record<string, string>
  onEquip: (slot: Item['slot'], id: string) => void
  onClose: () => void
}) {
  const legendary = ITEMS.filter((i) => i.rarity === 'legendary')
  const have = legendary.filter((i) => owned.includes(i.id)).length
  return (
    <div className="ward" role="dialog" aria-modal="true" aria-label="The Legendary Wardrobe" onClick={onClose}>
      <div className="ward__card" onClick={(e) => e.stopPropagation()}>
        <button className="ward__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="ward__emblem" aria-hidden="true">
          <Laurel />
        </div>
        <p className="ward__eyebrow label">Thrifted gold</p>
        <h2 className="ward__title">The Legendary Wardrobe</h2>
        <p className="ward__sub">
          The rarest finds in the locker — one per slot. Pull them from crates at 3%.
        </p>
        <p className="ward__count data">
          {have} / {legendary.length} unearthed
        </p>

        <ul className="ward__grid">
          {legendary.map((it) => {
            const isOwned = owned.includes(it.id)
            const isOn = equip[it.slot] === it.id
            return (
              <li key={it.id}>
                <button
                  className={`ward__item${isOwned ? '' : ' is-locked'}${isOn ? ' is-on' : ''}`}
                  onClick={isOwned ? () => onEquip(it.slot, it.id) : undefined}
                  disabled={!isOwned}
                  aria-label={
                    isOwned ? `${it.name}${isOn ? ', equipped' : ', tap to equip'}` : `${it.name}, locked`
                  }
                >
                  <span className="ward__swatch" style={isOwned ? { background: it.color } : undefined}>
                    {isOwned ? null : <span className="ward__lock" aria-hidden="true">🔒</span>}
                  </span>
                  <span className="ward__name">{it.name}</span>
                  <span className="ward__slot label">{it.slot}</span>
                  {isOn ? <span className="ward__on label">On</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ── Case-opening reel ────────────────────────────────────────────────────────
// A strip of cosmetics scrolls past a centre marker, decelerating to land your
// pull under it — the CS:GO case feel. The reel items are just for show; the one
// at WIN_INDEX is the real reward.
const TILE = 84 // px, tile width
const PITCH = TILE + 8 // width + gap
const WIN_INDEX = 39
const STRIP_LEN = 44
const SPIN_MS = 4200

function buildStrip(won: Item): Item[] {
  const strip = Array.from({ length: STRIP_LEN }, () => ITEMS[Math.floor(Math.random() * ITEMS.length)])
  strip[WIN_INDEX] = won
  return strip
}

function Spinner({ result, onClose }: { result: OpenResult; onClose: () => void }) {
  const viewRef = useRef<HTMLDivElement>(null)
  const [tiles] = useState(() => buildStrip(result.item))
  const [offset, setOffset] = useState<number | null>(null)
  const [landed, setLanded] = useState(false)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const vw = viewRef.current?.clientWidth ?? 320
    // Centre the winning tile under the marker, with a little jitter for realism.
    const target = vw / 2 - (WIN_INDEX * PITCH + TILE / 2) + (Math.random() * 24 - 12)
    if (reduce) {
      setOffset(target)
      setLanded(true)
      return
    }
    const raf = requestAnimationFrame(() => setOffset(target))
    const t = window.setTimeout(() => setLanded(true), SPIN_MS + 150)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [reduce])

  return (
    <div className="locker__spin">
      <div className="locker__reel-view" ref={viewRef}>
        <span className="locker__marker" aria-hidden="true" />
        <div
          className="locker__reel"
          style={{
            transform: `translateX(${offset ?? 0}px)`,
            transition: offset != null && !reduce ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.75, 0.2, 1)` : 'none',
          }}
        >
          {tiles.map((it, i) => (
            <div
              key={i}
              className={`locker__tile${i === WIN_INDEX && landed ? ' is-won' : ''}`}
              style={{ ['--rc' as string]: RARITY[it.rarity].color }}
            >
              <span className="locker__tile-sw" style={{ background: it.color }} />
              <span className="locker__tile-name">{it.name}</span>
            </div>
          ))}
        </div>
      </div>
      {landed ? (
        <Prize result={result} onClose={onClose} />
      ) : (
        <p className="locker__tap label">Opening…</p>
      )}
    </div>
  )
}

function Cell({
  item,
  owned,
  equipped,
  onEquip,
}: {
  item: Item
  owned: boolean
  equipped: boolean
  onEquip: () => void
}) {
  const rc = RARITY[item.rarity].color
  return (
    <li>
      <button
        className={`locker__cell${owned ? '' : ' is-locked'}${equipped ? ' is-equipped' : ''}`}
        onClick={owned ? onEquip : undefined}
        disabled={!owned}
        aria-label={
          owned ? `${item.name}, ${item.rarity}${equipped ? ', equipped' : ', tap to equip'}` : 'Locked'
        }
      >
        <span className="locker__rar" style={{ background: rc }} />
        <span
          className="locker__swatch"
          style={{ background: owned ? item.color : undefined }}
        />
        <span className="locker__cname">{owned ? item.name : '???'}</span>
        {equipped ? <span className="locker__on label">On</span> : null}
      </button>
    </li>
  )
}

function Prize({ result, onClose }: { result: OpenResult; onClose: () => void }) {
  const { item } = result
  const rc = RARITY[item.rarity].color
  return (
    <div className="locker__prize" style={{ ['--rc' as string]: rc }}>
      <div className="locker__confetti" aria-hidden="true">
        {BURST.map((b, i) => (
          <i
            key={i}
            style={{
              ['--fx' as string]: `${b.fx}px`,
              ['--fy' as string]: `${b.fy}px`,
              ['--fr' as string]: `${b.fr}deg`,
              background: [rc, '#f2f0e6', '#55b174', '#c23b30', '#e2b23c'][i % 5],
            }}
          />
        ))}
      </div>
      <div className="locker__glow">
        <span className="locker__prizeswatch" style={{ background: item.color }} />
      </div>
      <p className="locker__rarname" style={{ color: rc }}>
        {RARITY[item.rarity].label}
      </p>
      <p className="locker__prizename">{item.name}</p>
      <span className="locker__new label">New — equipped</span>
      <Button variant="cream" onClick={onClose}>
        Nice
      </Button>
    </div>
  )
}

