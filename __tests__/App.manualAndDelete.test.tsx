import React from 'react'
import { Alert } from 'react-native'
import { render, fireEvent, waitFor, within } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  simulateReceiptScan: jest.fn(),
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
  it('keeps the item when the dialog is cancelled and removes it when confirmed', async () => {
    const { getAllByTestId, findAllByTestId } = render(<App />)
    const rows = await findAllByTestId('food-item')
    const count = rows.length

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, btns) => {
      btns?.[0]?.onPress?.()
    })
    fireEvent.press(within(rows[0]).getByTestId('remove-item'))
    expect(getAllByTestId('food-item')).toHaveLength(count)

    alertSpy.mockImplementation((_t, _m, btns) => { btns?.[1]?.onPress?.() })
    fireEvent.press(within(rows[0]).getByTestId('remove-item'))
    await waitFor(() => expect(getAllByTestId('food-item')).toHaveLength(count - 1))
  })
})
