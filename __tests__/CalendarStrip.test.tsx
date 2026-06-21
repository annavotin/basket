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
    const { getAllByTestId } = render(
      <CalendarStrip
        windowStart={WINDOW_START}
        totalDays={DAYS}
        today="2026-06-01"
        extraDates={['2026-06-02']}
        onExtraPress={() => {}}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('extra-pill')).toHaveLength(1)
  })

  it('renders a faint add-extra pill on a day with no extra and fires onExtraPress', () => {
    const onExtraPress = jest.fn()
    const { getAllByTestId } = render(
      <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
        extraDates={['2026-06-02']} onExtraPress={onExtraPress} dayWidth={64} />
    )
    const adds = getAllByTestId('add-extra')
    expect(adds).toHaveLength(2) // 3 days, 1 has an extra
    fireEvent.press(adds[0])
    expect(onExtraPress).toHaveBeenCalledWith('2026-06-01')
  })

  it('renders exactly one solid extra-pill per day even with multiple extras and fires onExtraPress', () => {
    const onExtraPress = jest.fn()
    const { getAllByTestId } = render(
      <CalendarStrip windowStart="2026-06-01" totalDays={3} today="2026-06-02"
        extraDates={['2026-06-02', '2026-06-02']} onExtraPress={onExtraPress} dayWidth={64} />
    )
    const pills = getAllByTestId('extra-pill')
    expect(pills).toHaveLength(1)
    fireEvent.press(pills[0])
    expect(onExtraPress).toHaveBeenCalledWith('2026-06-02')
  })
})
