import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import TimelineView from '../src/components/TimelineView'
import { cycles } from '../src/data'

const WINDOW_START = '2026-05-28'

describe('TimelineView', () => {
  it('renders a bar for each cycle', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('cycle-bar')).toHaveLength(cycles.length)
  })

  it('calls onCyclePress with the cycle id when a bar is tapped', () => {
    const onCyclePress = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={onCyclePress}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    fireEvent.press(getAllByTestId('cycle-bar')[0])
    expect(onCyclePress).toHaveBeenCalledWith(cycles[0].id)
  })
})

describe('TimelineView empty slots', () => {
  const oneCycle = [
    {
      id: 'c1',
      startDate: '2026-06-02',
      endDate: '2026-06-03',
      items: [{ name: 'X', weightG: 1, kcal: 1, emoji: '🥦' }],
    },
  ]

  it('renders an empty slot for each uncovered day', () => {
    // window 2026-06-01 .. 2026-06-05 (5 days); cycle covers 06-02 and 06-03
    // => uncovered: 06-01, 06-04, 06-05 = 3 slots
    const { getAllByTestId } = render(
      <TimelineView
        cycles={oneCycle}
        windowStart="2026-06-01"
        totalDays={5}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('empty-slot')).toHaveLength(3)
  })

  it('calls onCreatePeriod with the tapped day', () => {
    const onCreatePeriod = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView
        cycles={oneCycle}
        windowStart="2026-06-01"
        totalDays={5}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={onCreatePeriod}
        dayWidth={64}
      />
    )
    // first empty slot corresponds to 2026-06-01
    fireEvent.press(getAllByTestId('empty-slot')[0])
    expect(onCreatePeriod).toHaveBeenCalledWith('2026-06-01')
  })

  it('labels an empty cycle as New shop', () => {
    const emptyCycle = [
      { id: 'new1', startDate: '2026-06-02', endDate: '2026-06-04', items: [] },
    ]
    const { getByText } = render(
      <TimelineView
        cycles={emptyCycle}
        windowStart="2026-06-01"
        totalDays={6}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getByText('New shop')).toBeTruthy()
  })
})
