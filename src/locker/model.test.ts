import { describe, it, expect } from 'vitest'
import {
  ITEMS,
  RARITY,
  STARTER,
  rollReward,
  openCrate,
  equipItem,
  levelFor,
  tierFor,
  swingsToNext,
  type LockerState,
  type Rarity,
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

describe('rollReward', () => {
  it('a roll near zero yields the first (common) tier', () => {
    const item = rollReward(seeded([0.0001, 0]))
    expect(item.rarity).toBe<Rarity>('common')
  })

  it('a roll near one yields the last (legendary) tier', () => {
    // First call selects the rarity bucket; 0.999 lands past the common/rare/epic
    // weights into legendary. Second call picks within the pool.
    const item = rollReward(seeded([0.999, 0]))
    expect(item.rarity).toBe<Rarity>('legendary')
  })
})

describe('openCrate', () => {
  const base: LockerState = { ...STARTER, keys: 1, owned: [...STARTER.owned], equip: { ...STARTER.equip } }

  it('a new item is added, auto-equipped, and costs the key', () => {
    // Force a legendary (not in the starter kit) so it's guaranteed new.
    const r = openCrate(base, seeded([0.999, 0]))
    expect(r.isNew).toBe(true)
    expect(r.state.owned).toContain(r.item.id)
    expect(r.state.equip[r.item.slot]).toBe(r.item.id)
    expect(r.state.keys).toBe(0)
  })

  it('a duplicate refunds the key and leaves ownership unchanged', () => {
    // 0.0001 → common bucket; the common pool's first item is a starter item,
    // so this is a guaranteed duplicate.
    const r = openCrate(base, seeded([0.0001, 0]))
    expect(r.isNew).toBe(false)
    expect(r.state.keys).toBe(1) // spent one, refunded one
    expect(r.state.owned.length).toBe(base.owned.length)
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
