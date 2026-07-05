import { parseEstimateResponse, estimateExtra } from '../src/services/extra-estimate'

describe('parseEstimateResponse', () => {
  it('maps a valid payload into an EstimateResult', () => {
    const result = parseEstimateResponse({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
  })

  it('coerces string numbers and rounds', () => {
    const result = parseEstimateResponse({ kcal: '549.6', protein: '20.04', carbs: '60', fat: '15.25' })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15.3 })
  })

  it('returns null for malformed or missing fields', () => {
    expect(parseEstimateResponse(null)).toBeNull()
    expect(parseEstimateResponse({})).toBeNull()
    expect(parseEstimateResponse({ kcal: 500, protein: 20, carbs: 60 })).toBeNull() // fat missing
    expect(parseEstimateResponse({ kcal: 'not a number', protein: 20, carbs: 60, fat: 15 })).toBeNull()
  })

  it('clamps negative values to 0', () => {
    const result = parseEstimateResponse({ kcal: -10, protein: -5, carbs: 60, fat: 15 })
    expect(result).toEqual({ kcal: 0, protein: 0, carbs: 60, fat: 15 })
  })
})

describe('estimateExtra', () => {
  it('invokes the backend with the description and returns the parsed estimate', async () => {
    const invoke = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const result = await estimateExtra('Burger and fries', invoke)
    expect(invoke).toHaveBeenCalledWith({ description: 'Burger and fries' })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
  })

  it('returns null when the backend throws (offline-safe)', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('offline'))
    expect(await estimateExtra('Burger and fries', invoke)).toBeNull()
  })

  it('returns null when the backend returns a malformed payload', async () => {
    const invoke = jest.fn().mockResolvedValue({ error: 'bad request' })
    expect(await estimateExtra('???', invoke)).toBeNull()
  })
})
