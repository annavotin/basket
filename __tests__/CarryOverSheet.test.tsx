import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ThemeProvider } from '../src/styles/ThemeProvider'
import CarryOverSheet from '../src/components/CarryOverSheet'
import { MealPrepCycle } from '../src/types'

jest.mock('@react-native-community/slider', () => 'Slider')

const prev: MealPrepCycle = {
  id: 'c0', startDate: '2026-06-01', endDate: '2026-06-05',
  items: [
    { name: 'Salmon', weightG: 600, kcal: 1200, emoji: '🐟', source: 'barcode' },
    { name: 'Oats', weightG: 500, kcal: 400, emoji: '🌾', source: 'manual' },
  ],
}
const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme="light" accent={['#7CC96E','#5FB152','#3E8F38']}>{ui}</ThemeProvider>)

describe('CarryOverSheet', () => {
  it('starts with everything unticked → confirm carries nothing', () => {
    const onConfirm = jest.fn()
    const { getByText } = wrap(<CarryOverSheet visible prevCycle={prev} onConfirm={onConfirm} onSkip={jest.fn()} onClose={jest.fn()} />)
    expect(getByText('Nothing yet')).toBeTruthy()
    fireEvent.press(getByText('Start fresh prep'))
    expect(onConfirm).toHaveBeenCalledWith([])
  })
  it('ticking an item carries its full remainder', () => {
    const onConfirm = jest.fn()
    const { getByText, getByTestId } = wrap(<CarryOverSheet visible prevCycle={prev} onConfirm={onConfirm} onSkip={jest.fn()} onClose={jest.fn()} />)
    fireEvent.press(getByTestId('carry-toggle-0'))
    fireEvent.press(getByText('Start prep with leftovers'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    const carried = onConfirm.mock.calls[0][0]
    expect(carried).toHaveLength(1)
    expect(carried[0]).toMatchObject({ name: 'Salmon', weightG: 600, kcal: 1200, source: 'carry' })
  })
  it('select-all toggles every row', () => {
    const onConfirm = jest.fn()
    const { getByText } = wrap(<CarryOverSheet visible prevCycle={prev} onConfirm={onConfirm} onSkip={jest.fn()} onClose={jest.fn()} />)
    fireEvent.press(getByText('Select all'))
    fireEvent.press(getByText('Start prep with leftovers'))
    expect(onConfirm.mock.calls[0][0]).toHaveLength(2)
  })
})
