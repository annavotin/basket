import { addDays, daysBetween, formatDay, dateToIndex } from '../src/utils/dates'

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-06-01', 3)).toBe('2026-06-04')
  })
  it('crosses month boundary', () => {
    expect(addDays('2026-05-30', 3)).toBe('2026-06-02')
  })
})

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0)
  })
  it('returns correct positive count', () => {
    expect(daysBetween('2026-06-01', '2026-06-05')).toBe(4)
  })
})

describe('formatDay', () => {
  it('returns day and abbreviated month', () => {
    expect(formatDay('2026-06-03')).toEqual({ day: '3', month: 'Jun' })
  })
  it('handles January', () => {
    expect(formatDay('2026-01-12')).toEqual({ day: '12', month: 'Jan' })
  })
})

describe('dateToIndex', () => {
  it('returns 0 when date equals window start', () => {
    expect(dateToIndex('2026-06-01', '2026-06-01')).toBe(0)
  })
  it('returns correct offset', () => {
    expect(dateToIndex('2026-06-01', '2026-06-04')).toBe(3)
  })
})
