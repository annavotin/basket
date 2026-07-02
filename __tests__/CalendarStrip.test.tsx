import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import CalendarStrip from '../src/components/CalendarStrip'

const WINDOW_START = '2026-06-01'
const DAYS = 7

describe('CalendarStrip', () => {
  it('renders the correct number of day cells', () => {
    const { getAllByTestId } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        today="2026-06-03"
        extraDates={[]}
        onExtraPress={() => {}}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('day-cell')).toHaveLength(DAYS)
  })

  it('renders the day number for each date', () => {
    const { getByText } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        today="2026-06-03"
        extraDates={[]}
        onExtraPress={() => {}}
        dayWidth={64}
      />
    )
    // WINDOW_START is the 1st, so a cell labeled "1" must exist
    expect(getByText('1')).toBeTruthy()
    expect(getByText('7')).toBeTruthy()
  })

  it('marks dates with extra meals with a dot', () => {
    const { toJSON } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        today="2026-06-01"
        extraDates={['2026-06-02']}
        onExtraPress={() => {}}
        dayWidth={64}
      />
    )
    // Each day-cell's dcell wrapper (its first rendered child) always renders the weekday +
    // day-number Text nodes (2 children); a day with an extra gets a 3rd child — the dot View.
    const cells = (toJSON() as any).children
    const dotCounts = cells.map((cell: any) => cell.children[0].children.length)
    expect(dotCounts.filter((n: number) => n === 3)).toHaveLength(1)
    expect(dotCounts[1]).toBe(3) // 2026-06-02 is the 2nd day in the window
  })

  it('every day cell is pressable and fires onExtraPress with its own date, extra or not', () => {
    const onExtraPress = jest.fn()
    const { getAllByTestId } = render(
      <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
        extraDates={['2026-06-02']} onExtraPress={onExtraPress} dayWidth={64} />
    )
    const cells = getAllByTestId('day-cell')
    expect(cells).toHaveLength(3)
    fireEvent.press(cells[0]) // no extra
    expect(onExtraPress).toHaveBeenCalledWith('2026-06-01')
    fireEvent.press(cells[1]) // has an extra
    expect(onExtraPress).toHaveBeenCalledWith('2026-06-02')
  })

  it('shows exactly one dot per day even when a date has multiple extras', () => {
    const { toJSON } = render(
      <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
        extraDates={['2026-06-02', '2026-06-02']} onExtraPress={() => {}} dayWidth={64} />
    )
    const cells = (toJSON() as any).children
    const dotCounts = cells.map((cell: any) => cell.children[0].children.length)
    expect(dotCounts.filter((n: number) => n === 3)).toHaveLength(1)
  })
})
