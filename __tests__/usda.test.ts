const { usdaLookupByBarcode, usdaSearchByName } =
  jest.requireActual('../src/services/usda') as typeof import('../src/services/usda')

function fakeFetch(payload: any, ok = true) {
  return jest.fn(async () => ({ ok, json: async () => payload })) as unknown as typeof fetch
}

const BRANDED = {
  description: 'GREEK YOGURT',
  gtinUpc: '0012345678905',
  servingSize: 170,
  servingSizeUnit: 'g',
  foodNutrients: [
    { nutrientNumber: '208', nutrientName: 'Energy', unitName: 'KCAL', value: 59 },
    { nutrientNumber: '203', nutrientName: 'Protein', value: 10 },
    { nutrientNumber: '205', nutrientName: 'Carbohydrate, by difference', value: 4 },
    { nutrientNumber: '204', nutrientName: 'Total lipid (fat)', value: 0.4 },
  ],
}

describe('usdaLookupByBarcode', () => {
  it('maps a branded food to a Product (title-cased, per-100g kcal, serving weight, macros)', async () => {
    const fetchMock = fakeFetch({ foods: [BRANDED] })
    const product = await usdaLookupByBarcode('012345678905', { fetch: fetchMock })
    expect(product).toEqual({
      name: 'Greek Yogurt',
      emoji: '🛒',
      packageWeightG: 170,
      kcalPer100g: 59,
      macrosPer100g: { protein: 10, carbs: 4, fat: 0.4 },
    })
  })

  it('prefers the food whose gtinUpc matches the scanned barcode', async () => {
    const other = { ...BRANDED, description: 'WRONG', gtinUpc: '999' }
    const fetchMock = fakeFetch({ foods: [other, BRANDED] })
    const product = await usdaLookupByBarcode('12345678905', { fetch: fetchMock })
    expect(product?.name).toBe('Greek Yogurt')
  })

  it('returns null when no food has usable kcal', async () => {
    const fetchMock = fakeFetch({ foods: [{ description: 'X', foodNutrients: [] }] })
    expect(await usdaLookupByBarcode('1', { fetch: fetchMock })).toBeNull()
  })

  it('returns null on a non-ok response', async () => {
    expect(await usdaLookupByBarcode('1', { fetch: fakeFetch({}, false) })).toBeNull()
  })
})

describe('usdaSearchByName', () => {
  it('maps search hits to FoodSuggestions and skips ones without kcal', async () => {
    const fetchMock = fakeFetch({
      foods: [
        BRANDED,
        { description: 'NO ENERGY', foodNutrients: [] },
      ],
    })
    const out = await usdaSearchByName('yogurt', { fetch: fetchMock })
    expect(out).toEqual([
      {
        name: 'Greek Yogurt',
        emoji: '🛒',
        kcalPer100g: 59,
        packageWeightG: 170,
        source: 'usda',
        macrosPer100g: { protein: 10, carbs: 4, fat: 0.4 },
      },
    ])
  })

  it('returns [] on error', async () => {
    expect(await usdaSearchByName('x', { fetch: fakeFetch({}, false) })).toEqual([])
  })
})
