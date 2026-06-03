import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import TimelineView from '../src/components/TimelineView'
import { cycles, extraMeals } from '../src/data'

const WINDOW_START = '2026-05-28'

describe('TimelineView', () => {
  it('renders a bar for each cycle', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('cycle-bar')).toHaveLength(cycles.length)
  })

  it('renders a pill for each extra meal', () => {
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={jest.fn()}
        dayWidth={64}
      />
    )
    expect(getAllByTestId('extra-pill')).toHaveLength(extraMeals.length)
  })

  it('calls onCyclePress with the cycle id when a bar is tapped', () => {
    const onCyclePress = jest.fn()
    const { getAllByTestId } = render(
      <TimelineView
        cycles={cycles}
        extraMeals={extraMeals}
        windowStart={WINDOW_START}
        totalDays={45}
        activeCycleId={null}
        onCyclePress={onCyclePress}
        dayWidth={64}
      />
    )
    fireEvent.press(getAllByTestId('cycle-bar')[0])
    expect(onCyclePress).toHaveBeenCalledWith(cycles[0].id)
  })
})
