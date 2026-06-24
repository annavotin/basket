import { clampMove, clampResizeStart, clampResizeEnd } from '../src/utils/timelineDrag'

describe('clampMove', () => {
  it('shifts start+end together by the day delta', () => {
    expect(clampMove(5, 8, +2, 45, [])).toEqual({ start: 7, end: 10 })
    expect(clampMove(5, 8, -3, 45, [])).toEqual({ start: 2, end: 5 })
  })
  it('clamps to the window edges (keeps span)', () => {
    expect(clampMove(2, 4, -10, 45, [])).toEqual({ start: 0, end: 2 })
    expect(clampMove(40, 43, +10, 45, [])).toEqual({ start: 41, end: 44 })
  })
  it('stops at a neighbour on the right and on the left', () => {
    const right = [{ start: 10, end: 12 }]
    expect(clampMove(5, 7, +20, 45, right)).toEqual({ start: 7, end: 9 })
    const left = [{ start: 0, end: 3 }]
    expect(clampMove(6, 8, -20, 45, left)).toEqual({ start: 4, end: 6 })
  })
})

describe('clampResizeStart (end fixed, min 1 day)', () => {
  it('moves the start within bounds', () => {
    expect(clampResizeStart(5, 8, -2, [])).toBe(3)
    expect(clampResizeStart(5, 8, +2, [])).toBe(7)
  })
  it('cannot cross the end (min 1 day) or go below 0 / a left neighbour', () => {
    expect(clampResizeStart(5, 8, +99, [])).toBe(8)
    expect(clampResizeStart(5, 8, -99, [])).toBe(0)
    expect(clampResizeStart(6, 8, -99, [{ start: 0, end: 3 }])).toBe(4)
  })
})

describe('clampResizeEnd (start fixed, min 1 day)', () => {
  it('moves the end within bounds', () => {
    expect(clampResizeEnd(5, 8, +2, 45, [])).toBe(10)
    expect(clampResizeEnd(5, 8, -2, 45, [])).toBe(6)
  })
  it('cannot cross the start (min 1 day) or pass the window / a right neighbour', () => {
    expect(clampResizeEnd(5, 8, -99, 45, [])).toBe(5)
    expect(clampResizeEnd(5, 8, +99, 45, [])).toBe(44)
    expect(clampResizeEnd(5, 8, +99, 45, [{ start: 12, end: 20 }])).toBe(11)
  })
})
