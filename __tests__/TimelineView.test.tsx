import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import TimelineView from '../src/components/TimelineView'
import { cycles } from '../src/data'

const WINDOW_START = '2026-05-28'

describe('TimelineView', () => {
  it('renders a pill for each cycle', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    expect(getAllByTestId('cycle-bar')).toHaveLength(cycles.length)
  })

  it('calls onCyclePress with the cycle id when a pill is tapped', () => {
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
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    fireEvent.press(getAllByTestId('cycle-bar')[0])
    expect(onCyclePress).toHaveBeenCalledWith(cycles[0].id)
  })

  it('shows a cluster of up to 3 item emojis on a stocked cycle pill', () => {
    const stocked = [
      {
        id: 'c1',
        startDate: '2026-06-02',
        endDate: '2026-06-05',
        items: [
          { name: 'Salmon', weightG: 600, kcal: 1254, emoji: '🐟' },
          { name: 'Sweet Potato', weightG: 500, kcal: 430, emoji: '🍠' },
          { name: 'Kale', weightG: 200, kcal: 66, emoji: '🥬' },
          { name: 'Apples', weightG: 670, kcal: 342, emoji: '🍎' },
        ],
      },
    ]
    const { getByText, queryByText } = render(
      <TimelineView
        cycles={stocked}
        windowStart="2026-06-01"
        totalDays={10}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    expect(getByText('Meal Prep')).toBeTruthy()
    expect(getByText('🐟')).toBeTruthy()
    expect(getByText('🍠')).toBeTruthy()
    expect(getByText('🥬')).toBeTruthy()
    // capped at 3 — the 4th emoji is not shown
    expect(queryByText('🍎')).toBeNull()
  })
})

describe('TimelineView create tile', () => {
  const oneCycle = [
    {
      id: 'c1',
      startDate: '2026-06-02',
      endDate: '2026-06-03',
      items: [{ name: 'X', weightG: 1, kcal: 1, emoji: '🥦' }],
    },
  ]

  it('renders a create-period tile under every uncovered day', () => {
    // window 2026-06-01..06-05 (5 days); the cycle covers 06-02 & 06-03, leaving 3 free days.
    const { getAllByTestId } = render(
      <TimelineView
        cycles={oneCycle}
        windowStart="2026-06-01"
        totalDays={5}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        onCreatePeriod={jest.fn()}
        dayWidth={64}
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    expect(getAllByTestId('create-period')).toHaveLength(3)
  })

  it('calls onCreatePeriod with the day when a + tile is tapped', () => {
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
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    fireEvent.press(getAllByTestId('create-period')[0]) // first free day = window start
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
        onSetCycleDates={jest.fn()}
        onDeleteCycle={jest.fn()}
        onEditingChange={jest.fn()}
      />
    )
    expect(getByText('New shop')).toBeTruthy()
  })
})
