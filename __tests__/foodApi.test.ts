import { lookupProductByBarcode, OFF_USER_AGENT } from '../src/services/foodApi'

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

  it('returns null on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await lookupProductByBarcode('1', { fetch: fetchMock })).toBeNull()
  })
})
