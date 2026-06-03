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
        selectedDate="2026-06-03"
        extraDates={[]}
        onDaySelect={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('day-cell')).toHaveLength(DAYS)
  })

  it('calls onDaySelect with the tapped date', () => {
    const onDaySelect = jest.fn()
    const { getAllByTestId } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        selectedDate="2026-06-01"
        extraDates={[]}
        onDaySelect={onDaySelect}
        dayWidth={64}
      />
    )
    fireEvent.press(getAllByTestId('day-cell')[2]) // index 2 = 2026-06-03
    expect(onDaySelect).toHaveBeenCalledWith('2026-06-03')
  })

  it('renders an Extra label on dates with extra meals', () => {
    const { getByText } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        selectedDate="2026-06-01"
        extraDates={['2026-06-02']}
        onDaySelect={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getByText('Extra')).toBeTruthy()
  })
})
