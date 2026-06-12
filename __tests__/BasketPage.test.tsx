import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import BasketPage from '../src/components/BasketPage'
import { MealPrepCycle, PantryItem, ExtraMeal, MacroTargets } from '../src/types'

jest.mock('react-native-svg', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Stub = (p: any) => React.createElement(View, p, p.children)
  return { __esModule: true, default: Stub, Svg: Stub, Circle: Stub }
})

const cycle: MealPrepCycle = {
  id: 'c1', startDate: '2026-06-03', endDate: '2026-06-07',
  items: [
    { name: 'Salmon', weightG: 300, kcal: 600, emoji: '🐟', source: 'barcode' },
    { name: 'Oats', weightG: 500, kcal: 400, emoji: '🌾', source: 'manual' },
  ],
}
const pantry: PantryItem[] = []
const extras: ExtraMeal[] = []
const macros: MacroTargets = { protein: 140, carbs: 220, fat: 70 }

function renderPage(overrides: Partial<React.ComponentProps<typeof BasketPage>> = {}) {
  const props = {
    visible: true, cycle, pantry, extras, dailyGoal: 2000, macroTargets: macros,
    onBack: jest.fn(), onAddItem: jest.fn(), onScanReceipt: jest.fn(),
    onSetDays: jest.fn(), onDeleteCycle: jest.fn(), onItemPress: jest.fn(),
    ...overrides,
  }
  const utils = render(
    <ThemeProvider theme="light" accent={['#7CC96E', '#5FB152', '#3E8F38']}>
      <BasketPage {...props} />
    </ThemeProvider>
  )
  return { ...utils, props }
}

describe('BasketPage', () => {
  it('shows consumed kcal and the budget', () => {
    const { getByText } = renderPage()
    expect(getByText('1,000')).toBeTruthy()
    expect(getByText('of 10,000 kcal')).toBeTruthy()
  })

  it('lists each item with its source tag', () => {
    const { getByText } = renderPage()
    expect(getByText('Salmon')).toBeTruthy()
    expect(getByText('Scanned')).toBeTruthy()
    expect(getByText('Oats')).toBeTruthy()
    expect(getByText('Manual')).toBeTruthy()
  })

  it('shows the item count stat tile', () => {
    const { getByText } = renderPage()
    expect(getByText('items')).toBeTruthy()
  })

  it('calls onItemPress with the index when a card is tapped', () => {
    const { getByText, props } = renderPage()
    fireEvent.press(getByText('Salmon'))
    expect(props.onItemPress).toHaveBeenCalledWith(0)
  })

  it('shows the empty state when the basket has no items', () => {
    const { getByText } = renderPage({ cycle: { ...cycle, items: [] } })
    expect(getByText("Basket's empty")).toBeTruthy()
  })

  it('opens the menu and deletes', () => {
    const { getByLabelText, getByText, props } = renderPage()
    fireEvent.press(getByLabelText('More'))
    fireEvent.press(getByText('Delete this basket'))
    expect(props.onDeleteCycle).toHaveBeenCalled()
  })
})
