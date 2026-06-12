import { lookupProductByBarcode, OFF_USER_AGENT, searchProductsByName } from '../src/services/foodApi'

function fakeFetch(payload: any, ok = true) {
  return jest.fn(async (_url: string, _opts?: any) => ({
    ok,
    json: async () => payload,
  })) as unknown as typeof fetch
}

describe('lookupProductByBarcode', () => {
  it('requests the production OFF v2 endpoint with a User-Agent', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'X', product_quantity: '100', nutriments: { 'energy-kcal_100g': 50 } },
    })
    await lookupProductByBarcode('3017624010701', { fetch: fetchMock })
    const [url, opts] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('https://world.openfoodfacts.org/api/v2/product/3017624010701')
    expect(url).toContain('fields=')
    expect(opts.headers['User-Agent']).toBe(OFF_USER_AGENT)
  })

  it('maps a found product to a Product (package size + kcal/100g)', async () => {
    const fetchMock = fakeFetch({
      product: {
        product_name: 'Nutella',
        brands: 'Ferrero',
        product_quantity: '400',
        nutriments: { 'energy-kcal_100g': 539 },
      },
    })
    const product = await lookupProductByBarcode('3017624010701', { fetch: fetchMock })
    expect(product).toEqual({
      name: 'Nutella',
      emoji: '🛒',
      packageWeightG: 400,
      kcalPer100g: 539,
    })
  })

  it('returns null when the product is missing', async () => {
    const fetchMock = fakeFetch({ status: 0 })
    expect(await lookupProductByBarcode('0000', { fetch: fetchMock })).toBeNull()
  })

  it('returns null when there is no usable energy value', async () => {
    const fetchMock = fakeFetch({ product: { product_name: 'Mystery', nutriments: {} } })
    expect(await lookupProductByBarcode('0000', { fetch: fetchMock })).toBeNull()
  })

  it('falls back to a default package weight when product_quantity is absent', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'Loose', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ name: 'Loose', packageWeightG: 100, kcalPer100g: 100 })
  })

  it('parses a "200 g" quantity string when product_quantity is absent', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'P', quantity: '200 g', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ packageWeightG: 200 })
  })

  it('parses a "1.5 kg" quantity string to grams', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'P', quantity: '1.5 kg', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ packageWeightG: 1500 })
  })

  it('parses a "500ml" quantity string to grams', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'P', quantity: '500ml', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ packageWeightG: 500 })
  })

  it('parses a "1 L" quantity string to grams', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'P', quantity: '1 L', nutriments: { 'energy-kcal_100g': 100 } },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ packageWeightG: 1000 })
  })

  it('prefers numeric product_quantity over the quantity string', async () => {
    const fetchMock = fakeFetch({
      product: {
        product_name: 'P',
        product_quantity: '400',
        quantity: '200 g',
        nutriments: { 'energy-kcal_100g': 100 },
      },
    })
    const product = await lookupProductByBarcode('1', { fetch: fetchMock })
    expect(product).toMatchObject({ packageWeightG: 400 })
  })

  it('requests the quantity field', async () => {
    const fetchMock = fakeFetch({
      product: { product_name: 'X', product_quantity: '100', nutriments: { 'energy-kcal_100g': 50 } },
    })
    await lookupProductByBarcode('1', { fetch: fetchMock })
    const [url] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('quantity')
  })

  it('returns null on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await lookupProductByBarcode('1', { fetch: fetchMock })).toBeNull()
  })
})

describe('searchProductsByName', () => {
  it('hits the OFF search endpoint with search_terms + User-Agent and maps hits', async () => {
    const fetchMock = fakeFetch({
      products: [
        { product_name: 'Hummus', quantity: '200 g', nutriments: { 'energy-kcal_100g': 166 } },
        { product_name: 'No Energy', nutriments: {} },
        { product_name: '', nutriments: { 'energy-kcal_100g': 100 } },
      ],
    })
    const out = await searchProductsByName('hummus', { fetch: fetchMock })
    const [url, opts] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('search_terms=hummus')
    expect(opts.headers['User-Agent']).toBe(OFF_USER_AGENT)
    expect(out).toEqual([
      { name: 'Hummus', emoji: '🛒', kcalPer100g: 166, packageWeightG: 200, source: 'off' },
    ])
  })

  it('returns [] when the response is not ok', async () => {
    expect(await searchProductsByName('x', { fetch: fakeFetch({}, false) })).toEqual([])
  })

  it('returns [] on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => { throw new Error('down') }) as unknown as typeof fetch
    expect(await searchProductsByName('x', { fetch: fetchMock })).toEqual([])
  })
})

function fetchReturning(product: any) {
  return async () => ({ ok: true, json: async () => ({ product }) }) as any
}

describe('OFF macro extraction', () => {
  it('reads proteins/carbohydrates/fat per 100g into macrosPer100g', async () => {
    const p = await lookupProductByBarcode('x', {
      fetch: fetchReturning({
        product_name: 'Yogurt', product_quantity: '500',
        nutriments: { 'energy-kcal_100g': 59, proteins_100g: 10, carbohydrates_100g: 4, fat_100g: 0.4 },
      }),
    })
    expect(p?.macrosPer100g).toEqual({ protein: 10, carbs: 4, fat: 0.4 })
  })
  it('leaves macrosPer100g undefined when nutriments lack them', async () => {
    const p = await lookupProductByBarcode('x', {
      fetch: fetchReturning({ product_name: 'Plain', product_quantity: '500', nutriments: { 'energy-kcal_100g': 100 } }),
    })
    expect(p?.macrosPer100g).toBeUndefined()
  })
})
