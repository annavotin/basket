import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  scanReceipt: jest.fn(),
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  // Pick a date with NO seeded cycle active (seeds: 2026-05-31..06-04, 06-05..06-09).
  jest.useFakeTimers().setSystemTime(new Date('2026-06-20'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

describe('empty period lifecycle', () => {
  it('creates a new period from the + tile and discards it when deselected', async () => {
    const { getAllByTestId, queryByTestId, findAllByTestId } = render(<App />)
    const baseBars = (await findAllByTestId('cycle-bar')).length

    // create a period by tapping a prep-selector + tile (one under each free day)
    fireEvent.press(getAllByTestId('create-period')[0])
    await waitFor(() => expect(queryByTestId('new-period-panel')).toBeTruthy())
    expect(getAllByTestId('cycle-bar').length).toBe(baseBars + 1)

    // tap the new (active) pill again to deselect -> empty period is removed
    const bars = getAllByTestId('cycle-bar')
    fireEvent.press(bars[bars.length - 1])
    await waitFor(() => expect(queryByTestId('new-period-panel')).toBeNull())
    expect(getAllByTestId('cycle-bar').length).toBe(baseBars)
  })

  it('keeps only one empty new period when tapping the + tile again', async () => {
    const { getAllByTestId, findAllByTestId } = render(<App />)
    const baseBars = (await findAllByTestId('cycle-bar')).length
    fireEvent.press(getAllByTestId('create-period')[0])
    await waitFor(() => expect(getAllByTestId('cycle-bar').length).toBe(baseBars + 1))
    // tapping a + tile again discards the first empty period and makes a new one
    fireEvent.press(getAllByTestId('create-period')[0])
    await waitFor(() => expect(getAllByTestId('cycle-bar').length).toBe(baseBars + 1))
  })
})
