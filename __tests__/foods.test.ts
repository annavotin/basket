import { searchLocalFoods, LOCAL_FOODS } from '../src/foods'

describe('searchLocalFoods', () => {
  it('returns [] for an empty/blank query', () => {
    expect(searchLocalFoods('')).toEqual([])
    expect(searchLocalFoods('   ')).toEqual([])
  })
  it('matches case-insensitively on name', () => {
    const r = searchLocalFoods('BANA')
    expect(r.some((s) => s.name.toLowerCase().includes('banana'))).toBe(true)
    expect(r.every((s) => s.source === 'local')).toBe(true)
  })
  it('ranks prefix matches before mid-string matches', () => {
    const r = searchLocalFoods('app').map((s) => s.name.toLowerCase())
    expect(r[0].startsWith('app')).toBe(true) // Apple ranked first
  })
  it('caps results at 8', () => {
    expect(searchLocalFoods('a').length).toBeLessThanOrEqual(8)
  })
  it('every entry has a positive kcalPer100g and an emoji', () => {
    expect(LOCAL_FOODS.every((f) => f.kcalPer100g > 0 && !!f.emoji)).toBe(true)
  })
})
