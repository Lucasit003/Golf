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

/** Roll a reward: pick a rarity by weight, then a uniform item within it. */
export function rollReward(rand: () => number): Item {
  const total = (Object.keys(RARITY) as Rarity[]).reduce((s, r) => s + RARITY[r].weight, 0)
  let roll = rand() * total
  let picked: Rarity = 'common'
  for (const r of Object.keys(RARITY) as Rarity[]) {
    roll -= RARITY[r].weight
    if (roll <= 0) {
      picked = r
      break
    }
  }
  const pool = ITEMS.filter((i) => i.rarity === picked)
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
}

export type OpenResult = { state: LockerState; item: Item; isNew: boolean }

/**
 * Spend one key and open a crate. A new item is added and auto-equipped; a
 * duplicate refunds the key so no pull is ever wasted. Callers must ensure
 * there's a key to spend.
 */
export function openCrate(state: LockerState, rand: () => number): OpenResult {
  const item = rollReward(rand)
  const isNew = !state.owned.includes(item.id)
  const owned = isNew ? [...state.owned, item.id] : state.owned
  const equip = isNew ? { ...state.equip, [item.slot]: item.id } : state.equip
  const keys = state.keys - 1 + (isNew ? 0 : 1)
  return { state: { ...state, owned, equip, keys }, item, isNew }
}

/** Equip an owned item into its slot; a no-op if it isn't owned. */
export function equipItem(state: LockerState, itemId: string): LockerState {
  const item = ITEMS_BY_ID[itemId]
  if (!item || !state.owned.includes(itemId)) return state
  return { ...state, equip: { ...state.equip, [item.slot]: itemId } }
}
