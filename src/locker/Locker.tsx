import { useState } from 'react'
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

type Phase = { kind: 'idle' } | { kind: 'crate' } | { kind: 'prize'; result: OpenResult }

export function Locker({ onFilm }: { onFilm: () => void }) {
  const { state, level, tier, toNext, open, equip } = useLocker()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [shaking, setShaking] = useState(false)

  const into = state.swings % 5
  const complete = collectionComplete(state)
  const canOpen = state.keys >= 1 && !complete

  function startOpen() {
    if (!canOpen) return
    setShaking(false)
    setPhase({ kind: 'crate' })
  }

  function tapCrate() {
    if (shaking) return
    setShaking(true)
    // spend the key + roll only once the crate is actually struck
    const result = open()
    window.setTimeout(() => {
      if (result) setPhase({ kind: 'prize', result })
      else setPhase({ kind: 'idle' })
      setShaking(false)
    }, 850)
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

      {phase.kind !== 'idle' && (
        <div className="locker__overlay" role="dialog" aria-modal="true" aria-label="Opening a crate">
          <div className="locker__reveal">
            {phase.kind === 'crate' ? (
              <>
                <button
                  className={`locker__crate${shaking ? ' is-shaking' : ''}`}
                  onClick={tapCrate}
                  aria-label="Open the crate"
                >
                  <CrateArt />
                </button>
                <p className="locker__tap label">{shaking ? '' : 'Tap the crate to open'}</p>
              </>
            ) : (
              <Prize result={phase.result} onClose={close} />
            )}
          </div>
        </div>
      )}
    </section>
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

function CrateArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="16" y="30" width="68" height="56" rx="6" fill="#22381f" stroke="#d9a441" strokeWidth="2.5" />
      <rect x="16" y="30" width="68" height="18" rx="6" fill="#2f4a2a" stroke="#d9a441" strokeWidth="2.5" />
      <rect x="44" y="30" width="12" height="56" fill="#d9a441" opacity="0.85" />
      <rect x="16" y="52" width="68" height="6" fill="#d9a441" opacity="0.5" />
      <circle cx="50" cy="56" r="9" fill="#2f4a2a" stroke="#d9a441" strokeWidth="2" />
      <path d="M50 51 v10 M46 56 h8" stroke="#d9a441" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
