import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  STARTER,
  openCrate as openCratePure,
  equipItem as equipItemPure,
  levelFor,
  tierFor,
  swingsToNext,
  type LockerState,
  type OpenResult,
  type Slot,
} from './model'

/*
 * Locker state, persisted to localStorage. Same shape of ownership as prefs —
 * entirely local, no account, nothing uploaded. The survey never reads this;
 * it's a cosmetic layer you can ignore completely and lose nothing.
 */

const KEY = 'setjis.locker'

function load(): LockerState {
  if (typeof localStorage === 'undefined') return STARTER
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return STARTER
    const parsed = JSON.parse(raw) as Partial<LockerState>
    // Merge over STARTER so a new field (or a freshly added cosmetic) never
    // leaves the state malformed.
    return {
      keys: typeof parsed.keys === 'number' ? parsed.keys : STARTER.keys,
      swings: typeof parsed.swings === 'number' ? parsed.swings : STARTER.swings,
      owned: Array.isArray(parsed.owned) ? parsed.owned : STARTER.owned,
      equip: { ...STARTER.equip, ...(parsed.equip ?? {}) },
    }
  } catch {
    return STARTER
  }
}

type Ctx = {
  state: LockerState
  level: number
  tier: string
  toNext: number
  /** Film-a-swing reward: one key per swing, and a swing toward the next level. */
  earnKey: () => void
  /** Open a crate (spends a key). Returns the pull so the view can reveal it. */
  open: () => OpenResult | null
  equip: (slot: Slot, itemId: string) => void
}

const LockerContext = createContext<Ctx | null>(null)

export function LockerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockerState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private mode / storage full — the locker just won't persist */
    }
  }, [state])

  function earnKey() {
    setState((s) => ({ ...s, keys: s.keys + 1, swings: s.swings + 1 }))
  }

  function open(): OpenResult | null {
    // Roll outside the state updater so it stays pure (no double-roll under
    // StrictMode). The crate always spends the key and yields a new cosmetic.
    const result = openCratePure(state, Math.random)
    if (result) setState(result.state)
    return result
  }

  function equip(_slot: Slot, itemId: string) {
    setState((s) => equipItemPure(s, itemId))
  }

  const level = levelFor(state.swings)
  const value: Ctx = {
    state,
    level,
    tier: tierFor(level),
    toNext: swingsToNext(state.swings),
    earnKey,
    open,
    equip,
  }

  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>
}

export function useLocker(): Ctx {
  const ctx = useContext(LockerContext)
  if (!ctx) throw new Error('useLocker must be used inside <LockerProvider>')
  return ctx
}
