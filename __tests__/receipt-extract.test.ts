import { parseReceiptResponse, extractReceiptLines } from '../src/services/receipt-extract'

describe('parseReceiptResponse', () => {
  it('maps a valid payload into ReceiptLines with ids', () => {
    const lines = parseReceiptResponse({
      lines: [
        { name: 'Chicken thighs', weightG: 1000, kcal: 1770, isFood: true },
        { name: 'TOTAL', weightG: 0, kcal: 0, isFood: false },
      ],
    })
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ name: 'Chicken thighs', weightG: 1000, kcal: 1770, isFood: true })
    expect(lines[0].id).toBeTruthy()
    expect(lines[1].isFood).toBe(false)
  })

  it('coerces string numbers and defaults isFood to true', () => {
    const [line] = parseReceiptResponse({ lines: [{ name: 'Rice', weightG: '500', kcal: '650' }] })
    expect(line).toMatchObject({ name: 'Rice', weightG: 500, kcal: 650, isFood: true })
  })

  it('drops rows with no name and trims names', () => {
    const lines = parseReceiptResponse({ lines: [{ name: '  ' }, { name: ' Kale ', weightG: 200, kcal: 46 }] })
    expect(lines).toHaveLength(1)
    expect(lines[0].name).toBe('Kale')
  })

  it('returns [] for malformed input', () => {
    expect(parseReceiptResponse(null)).toEqual([])
    expect(parseReceiptResponse({})).toEqual([])
    expect(parseReceiptResponse({ lines: 'nope' })).toEqual([])
  })
})

describe('extractReceiptLines', () => {
  it('invokes the backend with the image and returns parsed lines', async () => {
    const invoke = jest.fn().mockResolvedValue({ lines: [{ name: 'Oats', weightG: 1000, kcal: 3890 }] })
    const lines = await extractReceiptLines({ base64: 'abc', mediaType: 'image/jpeg' }, invoke)
    expect(invoke).toHaveBeenCalledWith({ image: 'abc', mediaType: 'image/jpeg' })
    expect(lines[0]).toMatchObject({ name: 'Oats', weightG: 1000, kcal: 3890 })
  })

  it('returns [] when the backend throws (offline-safe)', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('offline'))
    expect(await extractReceiptLines({ base64: 'abc', mediaType: 'image/jpeg' }, invoke)).toEqual([])
  })
})
