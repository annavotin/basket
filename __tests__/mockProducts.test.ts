import { MOCK_PRODUCTS, pickRandomProduct } from '../src/mockProducts'

describe('mockProducts', () => {
  it('has a non-empty catalog with required fields', () => {
    expect(MOCK_PRODUCTS.length).toBeGreaterThan(0)
    for (const p of MOCK_PRODUCTS) {
      expect(typeof p.name).toBe('string')
      expect(typeof p.emoji).toBe('string')
      expect(p.packageWeightG).toBeGreaterThan(0)
      expect(p.kcalPer100g).toBeGreaterThan(0)
    }
  })

  it('pickRandomProduct uses the rng to index the catalog', () => {
    const first = pickRandomProduct(() => 0)
    expect(first).toBe(MOCK_PRODUCTS[0])
    const last = pickRandomProduct(() => 0.999999)
    expect(last).toBe(MOCK_PRODUCTS[MOCK_PRODUCTS.length - 1])
  })
})
