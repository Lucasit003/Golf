/*
 * The Locker — a cosmetic progression layer that sits beside the survey, never
 * on top of it. You earn keys by filming swings; keys open crates; crates hold
 * cosmetics for your golfer and crest. Everything here is pure and local:
 * nothing is bought with money, nothing leaves the device, and none of it
 * touches a measured number. Duplicates refund their key, so a crate is always
 * progress — no dead pulls. Kept wholesome on purpose; this is for every age.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type Slot = 'cap' | 'shirt' | 'club' | 'ball' | 'crest'

export type Item = {
  id: string
  slot: Slot
  name: string
  rarity: Rarity
  /** The colour the cosmetic paints — a cap, polo, grip, ball, or crest field. */
  color: string
}

export const SLOTS: Slot[] = ['cap', 'shirt', 'club', 'ball', 'crest']

/** Drop weights + the earthy rarity ramp: sage → green → amber → gold. */
export const RARITY: Record<Rarity, { weight: number; label: string; color: string }> = {
  common: { weight: 60, label: 'Common', color: '#8f9e93' },
  rare: { weight: 26, label: 'Rare', color: '#4e9d68' },
  epic: { weight: 11, label: 'Epic', color: '#c0872a' },
  legendary: { weight: 3, label: 'Legendary', color: '#e2b23c' },
}

export const ITEMS: Item[] = [
  // caps
  { id: 'cap_white', slot: 'cap', name: 'Tour White', rarity: 'common', color: '#f2f0e6' },
  { id: 'cap_red', slot: 'cap', name: 'Flag Red', rarity: 'common', color: '#c23b30' },
  { id: 'cap_navy', slot: 'cap', name: 'Navy', rarity: 'rare', color: '#23415f' },
  { id: 'cap_sand', slot: 'cap', name: 'Bunker', rarity: 'rare', color: '#ddcda6' },
  { id: 'cap_gold', slot: 'cap', name: 'Champion Gold', rarity: 'epic', color: '#d9a441' },
  // shirts
  { id: 'shirt_cream', slot: 'shirt', name: 'Cream Polo', rarity: 'common', color: '#f2f0e6' },
  { id: 'shirt_fair', slot: 'shirt', name: 'Fairway Polo', rarity: 'common', color: '#2e7d46' },
  { id: 'shirt_sky', slot: 'shirt', name: 'Sky Polo', rarity: 'rare', color: '#6aa6c9' },
  { id: 'shirt_sun', slot: 'shirt', name: 'Sunset Polo', rarity: 'epic', color: '#e0794a' },
  // clubs
  { id: 'club_steel', slot: 'club', name: 'Steel Iron', rarity: 'common', color: '#b7bcc2' },
  { id: 'club_brass', slot: 'club', name: 'Brass Iron', rarity: 'rare', color: '#b08a3e' },
  { id: 'club_gold', slot: 'club', name: 'Gold Driver', rarity: 'legendary', color: '#e2b23c' },
  // balls
  { id: 'ball_white', slot: 'ball', name: 'Tour Ball', rarity: 'common', color: '#f2f0e6' },
  { id: 'ball_neon', slot: 'ball', name: 'Neon Ball', rarity: 'rare', color: '#c8f24a' },
  { id: 'ball_flame', slot: 'ball', name: 'Flame Ball', rarity: 'epic', color: '#e0794a' },
  { id: 'ball_gold', slot: 'ball', name: 'Gold Ball', rarity: 'legendary', color: '#e2b23c' },
  // crests
  { id: 'crest_green', slot: 'crest', name: 'Fairway Crest', rarity: 'common', color: '#2e7d46' },
  { id: 'crest_crim', slot: 'crest', name: 'Crimson Crest', rarity: 'rare', color: '#c23b30' },
  { id: 'crest_gold', slot: 'crest', name: 'Gold Crest', rarity: 'legendary', color: '#e2b23c' },
]

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
)

export type Equip = Record<Slot, string>

export type LockerState = {
  keys: number
  swings: number
  owned: string[]
  equip: Equip
}

export const STARTER: LockerState = {
  keys: 3, // enough to open a few crates on the first visit
  swings: 0,
  owned: ['cap_white', 'shirt_cream', 'club_steel', 'ball_white', 'crest_green'],
  equip: {
    cap: 'cap_white',
    shirt: 'shirt_cream',
    club: 'club_steel',
    ball: 'ball_white',
    crest: 'crest_green',
  },
}

/** Level rises every 5 swings; tiers ramp every two levels. */
export const TIERS = ['Bronze', 'Silver', 'Gold', 'Single-digit', 'Scratch'] as const

export function levelFor(swings: number): number {
  return Math.floor(swings / 5) + 1
}
export function tierFor(level: number): string {
  return TIERS[Math.min(TIERS.length - 1, Math.floor((level - 1) / 2))]
}
/** Swings remaining until the next level. */
export function swingsToNext(swings: number): number {
  return 5 - (swings % 5)
}

/** Is everything in the catalog already owned? */
export function collectionComplete(state: LockerState): boolean {
  return state.owned.length >= ITEMS.length
}

/**
 * Roll a reward the player doesn't own yet: pick a rarity by weight (among the
 * rarities that still have something unowned), then a uniform item within it.
 * Returns null once the whole catalog is collected. Only pulling new items means
 * a crate always gives you something — no wasted, refunded duplicate pulls.
 */
export function rollNewReward(owned: string[], rand: () => number): Item | null {
  const ownedSet = new Set(owned)
  const available = ITEMS.filter((i) => !ownedSet.has(i.id))
  if (available.length === 0) return null
  const rarities = Array.from(new Set(available.map((i) => i.rarity)))
  const total = rarities.reduce((s, r) => s + RARITY[r].weight, 0)
  let roll = rand() * total
  let picked: Rarity = rarities[0]
  for (const r of rarities) {
    roll -= RARITY[r].weight
    if (roll <= 0) {
      picked = r
      break
    }
  }
  const pool = available.filter((i) => i.rarity === picked)
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}

export type OpenResult = { state: LockerState; item: Item }

/**
 * Spend one key and open a crate. The pull is always a cosmetic you don't own
 * yet, added and auto-equipped. Returns null when there's no key to spend or the
 * collection is already complete — so the key only leaves when a reward comes in.
 */
export function openCrate(state: LockerState, rand: () => number): OpenResult | null {
  if (state.keys < 1) return null
  const item = rollNewReward(state.owned, rand)
  if (!item) return null
  return {
    state: {
      ...state,
      keys: state.keys - 1,
      owned: [...state.owned, item.id],
      equip: { ...state.equip, [item.slot]: item.id },
    },
    item,
  }
}

/** Equip an owned item into its slot; a no-op if it isn't owned. */
export function equipItem(state: LockerState, itemId: string): LockerState {
  const item = ITEMS_BY_ID[itemId]
  if (!item || !state.owned.includes(itemId)) return state
  return { ...state, equip: { ...state.equip, [item.slot]: itemId } }
}
