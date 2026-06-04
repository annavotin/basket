import { MOCK_RECEIPT_LINES, getMockReceiptLines } from '../src/mockReceipts'

describe('mockReceipts', () => {
  it('has multiple food lines and at least one non-food line', () => {
    expect(MOCK_RECEIPT_LINES.length).toBeGreaterThan(1)
    expect(MOCK_RECEIPT_LINES.some((l) => l.isFood)).toBe(true)
    expect(MOCK_RECEIPT_LINES.some((l) => !l.isFood)).toBe(true)
  })

  it('getMockReceiptLines returns a fresh copy (not the same array references)', () => {
    const a = getMockReceiptLines()
    const b = getMockReceiptLines()
    expect(a).not.toBe(b)
    expect(a[0]).not.toBe(MOCK_RECEIPT_LINES[0])
    expect(a[0]).toEqual(MOCK_RECEIPT_LINES[0])
  })
})
