import { describe, it, expect } from 'vitest'
import {
  ITEMS,
  RARITY,
  STARTER,
  rollNewReward,
  openCrate,
  collectionComplete,
  equipItem,
  levelFor,
  tierFor,
  swingsToNext,
  type LockerState,
} from './model'

// A deterministic generator so reward rolls are reproducible in tests.
function seeded(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('locker catalog', () => {
  it('every item has a unique id and a known rarity', () => {
    const ids = new Set(ITEMS.map((i) => i.id))
    expect(ids.size).toBe(ITEMS.length)
    for (const it of ITEMS) expect(RARITY[it.rarity]).toBeTruthy()
  })

  it('the starter kit is fully owned and equipped', () => {
    for (const id of STARTER.owned) expect(ITEMS.find((i) => i.id === id)).toBeTruthy()
    for (const slot of Object.keys(STARTER.equip) as (keyof typeof STARTER.equip)[]) {
      expect(STARTER.owned).toContain(STARTER.equip[slot])
    }
  })
})

describe('rollNewReward', () => {
  it('never returns an item the player already owns', () => {
    // Own every common; a common-biased roll must skip to a rarity with stock.
    const owned = ITEMS.filter((i) => i.rarity === 'common').map((i) => i.id)
    const item = rollNewReward(owned, seeded([0.0001, 0]))
    expect(item).not.toBeNull()
    expect(owned).not.toContain(item!.id)
  })

  it('returns null once everything is owned', () => {
    const all = ITEMS.map((i) => i.id)
    expect(rollNewReward(all, seeded([0.5]))).toBeNull()
  })
})

describe('openCrate', () => {
  const base: LockerState = { ...STARTER, keys: 1, owned: [...STARTER.owned], equip: { ...STARTER.equip } }

  it('always pulls a new item, auto-equips it, and spends the key', () => {
    const r = openCrate(base, seeded([0.999, 0]))
    expect(r).not.toBeNull()
    expect(base.owned).not.toContain(r!.item.id) // brand new
    expect(r!.state.owned).toContain(r!.item.id)
    expect(r!.state.equip[r!.item.slot]).toBe(r!.item.id)
    expect(r!.state.keys).toBe(0) // key spent, never refunded
  })

  it('refuses to open with no key', () => {
    expect(openCrate({ ...base, keys: 0 }, seeded([0.5]))).toBeNull()
  })

  it('refuses to open once the collection is complete', () => {
    const done: LockerState = { ...base, owned: ITEMS.map((i) => i.id) }
    expect(collectionComplete(done)).toBe(true)
    expect(openCrate(done, seeded([0.5]))).toBeNull()
  })
})

describe('equipItem', () => {
  it('equips an owned item into its slot', () => {
    const withRed: LockerState = { ...STARTER, owned: [...STARTER.owned, 'cap_red'] }
    const next = equipItem(withRed, 'cap_red')
    expect(next.equip.cap).toBe('cap_red')
  })
  it('ignores an unowned item', () => {
    const next = equipItem(STARTER, 'cap_gold')
    expect(next.equip.cap).toBe(STARTER.equip.cap)
  })
})

describe('levels', () => {
  it('rises every five swings', () => {
    expect(levelFor(0)).toBe(1)
    expect(levelFor(4)).toBe(1)
    expect(levelFor(5)).toBe(2)
    expect(levelFor(12)).toBe(3)
  })
  it('reports swings to the next level', () => {
    expect(swingsToNext(0)).toBe(5)
    expect(swingsToNext(3)).toBe(2)
    expect(swingsToNext(5)).toBe(5)
  })
  it('ramps tiers and clamps at the top', () => {
    expect(tierFor(1)).toBe('Bronze')
    expect(tierFor(3)).toBe('Silver')
    expect(tierFor(99)).toBe('Scratch')
  })
})
