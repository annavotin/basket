import { parseDecomposedItems, estimateExtra } from '../src/services/extra-estimate'
import { FoodSuggestion } from '../src/foods'

const usda = (hits: Partial<FoodSuggestion>[]): jest.Mock =>
  jest.fn().mockResolvedValue(hits.map((h) => ({ name: '', emoji: '', kcalPer100g: 0, source: 'usda', ...h })))

describe('parseDecomposedItems', () => {
  it('maps a valid items payload', () => {
    const result = parseDecomposedItems({
      items: [{ item: 'cheeseburger', grams: 220, kcal: 550, protein: 25, carbs: 40, fat: 30 }],
    })
    expect(result).toEqual([{ item: 'cheeseburger', grams: 220, kcal: 550, protein: 25, carbs: 40, fat: 30 }])
  })

  it('drops individual malformed items but keeps valid ones', () => {
    const result = parseDecomposedItems({
      items: [
        { item: 'fries', grams: 120, kcal: 340, protein: 4, carbs: 40, fat: 16 },
        { item: 'mystery', grams: 'lots', kcal: 100, protein: 1, carbs: 1, fat: 1 }, // grams not a number
      ],
    })
    expect(result).toEqual([{ item: 'fries', grams: 120, kcal: 340, protein: 4, carbs: 40, fat: 16 }])
  })

  it('returns null for missing/malformed/empty payloads', () => {
    expect(parseDecomposedItems(null)).toBeNull()
    expect(parseDecomposedItems({})).toBeNull()
    expect(parseDecomposedItems({ items: [] })).toBeNull()
    expect(parseDecomposedItems({ items: [{ item: 'x' }] })).toBeNull() // all items malformed
  })
})

describe('estimateExtra', () => {
  it('grounds a matched item in USDA data, scaled by the estimated grams', async () => {
    const invoke = jest.fn().mockResolvedValue({
      items: [{ item: 'banana', grams: 200, kcal: 999, protein: 99, carbs: 99, fat: 99 }],
    })
    const usdaSearch = usda([{ kcalPer100g: 89, macrosPer100g: { protein: 1.1, carbs: 23, fat: 0.3 } }])
    const result = await estimateExtra('a banana', invoke, usdaSearch)
    expect(usdaSearch).toHaveBeenCalledWith('banana')
    expect(result).toEqual({ kcal: 178, protein: 2.2, carbs: 46, fat: 0.6 })
  })

  it('falls back to the AI per-item guess when USDA has no match', async () => {
    const invoke = jest.fn().mockResolvedValue({
      items: [{ item: "grandma's lasagna", grams: 300, kcal: 450, protein: 25, carbs: 40, fat: 20 }],
    })
    const usdaSearch = usda([])
    const result = await estimateExtra('grandmas lasagna', invoke, usdaSearch)
    expect(result).toEqual({ kcal: 450, protein: 25, carbs: 40, fat: 20 })
  })

  it('falls back per-item when usdaSearch throws for that item', async () => {
    const invoke = jest.fn().mockResolvedValue({
      items: [{ item: 'weird item', grams: 100, kcal: 200, protein: 10, carbs: 10, fat: 10 }],
    })
    const usdaSearch = jest.fn().mockRejectedValue(new Error('rate limited'))
    const result = await estimateExtra('weird item', invoke, usdaSearch)
    expect(result).toEqual({ kcal: 200, protein: 10, carbs: 10, fat: 10 })
  })

  it('sums multiple items, mixing grounded and fallback sources', async () => {
    const invoke = jest.fn().mockResolvedValue({
      items: [
        { item: 'cheeseburger', grams: 220, kcal: 999, protein: 99, carbs: 99, fat: 99 }, // will be grounded
        { item: 'secret sauce', grams: 20, kcal: 80, protein: 0, carbs: 2, fat: 8 }, // no match, uses fallback
      ],
    })
    const usdaSearch = jest.fn()
      .mockResolvedValueOnce([{ name: '', emoji: '', source: 'usda', kcalPer100g: 250, macrosPer100g: { protein: 12, carbs: 20, fat: 12 } }])
      .mockResolvedValueOnce([])
    const result = await estimateExtra('cheeseburger with secret sauce', invoke, usdaSearch)
    // cheeseburger grounded: 250*2.2=550 kcal, 12*2.2=26.4 protein, 20*2.2=44 carbs, 12*2.2=26.4 fat
    // secret sauce fallback: 80 kcal, 0 protein, 2 carbs, 8 fat
    expect(result).toEqual({ kcal: 630, protein: 26.4, carbs: 46, fat: 34.4 })
  })

  it('ignores a USDA hit with no usable kcal and falls back instead', async () => {
    const invoke = jest.fn().mockResolvedValue({
      items: [{ item: 'oat milk latte', grams: 350, kcal: 120, protein: 4, carbs: 15, fat: 4 }],
    })
    const usdaSearch = usda([{ kcalPer100g: 0 }])
    const result = await estimateExtra('oat milk latte', invoke, usdaSearch)
    expect(result).toEqual({ kcal: 120, protein: 4, carbs: 15, fat: 4 })
  })

  it('returns null when the backend throws (offline-safe)', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('offline'))
    const usdaSearch = jest.fn()
    expect(await estimateExtra('Burger and fries', invoke, usdaSearch)).toBeNull()
    expect(usdaSearch).not.toHaveBeenCalled()
  })

  it('returns null when the backend returns a malformed payload', async () => {
    const invoke = jest.fn().mockResolvedValue({ error: 'bad request' })
    const usdaSearch = jest.fn()
    expect(await estimateExtra('???', invoke, usdaSearch)).toBeNull()
  })
})
