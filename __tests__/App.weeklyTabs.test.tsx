import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  simulateReceiptScan: jest.fn(),
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

// On 2026-06-07 the active cycle is cycle-2 (2026-06-05..2026-06-09), which has items,
// so the period detail view with the segmented nav renders on load.
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-07'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

describe('weekly tabs', () => {
  it('defaults to the Basket tab showing food items with the FAB visible', async () => {
    const { findByTestId, getAllByTestId, getByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    expect(getAllByTestId('food-item').length).toBeGreaterThan(0)
    expect(getByTestId('add-fab')).toBeTruthy()
  })

  it('switches to the Pantry tab, hides the FAB, and shows pantry rows', async () => {
    const { findByTestId, getByTestId, queryByTestId, getAllByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    fireEvent.press(getByTestId('tab-pantry'))
    await waitFor(() => expect(getAllByTestId('pantry-detail-row').length).toBeGreaterThan(0))
    expect(queryByTestId('add-fab')).toBeNull()
    expect(queryByTestId('food-item')).toBeNull()
  })

  it('switches to the Extras tab and keeps the FAB visible', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(<App />)
    await findByTestId('segmented-nav')
    fireEvent.press(getByTestId('tab-extras'))
    await waitFor(() => expect(getByTestId('add-fab')).toBeTruthy())
    expect(queryByTestId('food-item')).toBeNull()
  })
})
