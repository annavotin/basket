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

describe('extra meals', () => {
  it('adds an extra via a faint pill and shows it in extra mode', async () => {
    const { getAllByTestId, getByTestId, findByTestId } = render(<App />)
    await findByTestId('add-fab')
    fireEvent.press(getAllByTestId('add-extra')[0])
    fireEvent.press(getByTestId('add-fab')) // manual-only FAB -> opens sheet directly
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Sushi with friends')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '850')
    fireEvent.press(getByTestId('save-extra-button'))
    await waitFor(() => expect(getAllByTestId('extra-item').length).toBeGreaterThan(0))
    expect(within(getAllByTestId('extra-item')[0]).getByText('Sushi with friends')).toBeTruthy()
  })

  it('removes an extra after confirming the dialog', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, btns) => btns?.[1]?.onPress?.())
    const { getAllByTestId, queryAllByTestId, getByTestId, findByTestId } = render(<App />)
    await findByTestId('add-fab')
    fireEvent.press(getAllByTestId('add-extra')[0])
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Cake')
    fireEvent.changeText(getByTestId('extra-kcal-input'), '400')
    fireEvent.press(getByTestId('save-extra-button'))
    await waitFor(() => expect(getAllByTestId('extra-item').length).toBe(1))
    fireEvent.press(getAllByTestId('remove-extra')[0])
    await waitFor(() => expect(queryAllByTestId('extra-item').length).toBe(0))
  })
})
