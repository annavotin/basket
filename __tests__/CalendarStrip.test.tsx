import React from 'react'
import { render } from '@testing-library/react-native'
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
        dayWidth={64}
      />
    )
    // WINDOW_START is the 1st, so a cell labeled "1" must exist
    expect(getByText('1')).toBeTruthy()
    expect(getByText('7')).toBeTruthy()
  })

  it('renders an Extra label on dates with extra meals', () => {
    const { getByText } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        today="2026-06-01"
        extraDates={['2026-06-02']}
        dayWidth={64}
      />
    )
    expect(getByText('Extra')).toBeTruthy()
  })
})
