import React from 'react'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  scanReceipt: jest.fn(),
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-02'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

describe('delete confirmation', () => {
  it('keeps the item when cancelled and removes it when confirmed via ItemDetail', async () => {
    const { getAllByTestId, findAllByTestId, getByText, queryAllByTestId } = render(<App />)
    const rows = await findAllByTestId('food-item')
    const count = rows.length

    // Open the detail sheet for the first item
    fireEvent.press(within(rows[0]).getByTestId('edit-item'))

    // Tap "Remove from basket" to trigger the confirm state
    fireEvent.press(getByText('Remove from basket'))

    // Cancel — item should still be there
    fireEvent.press(getByText('Cancel'))
    expect(getAllByTestId('food-item')).toHaveLength(count)

    // Open the detail sheet again and confirm deletion
    const freshRows = getAllByTestId('food-item')
    fireEvent.press(within(freshRows[0]).getByTestId('edit-item'))
    fireEvent.press(getByText('Remove from basket'))
    fireEvent.press(getByText('Delete'))

    await waitFor(() => expect(getAllByTestId('food-item')).toHaveLength(count - 1))
  })
})
