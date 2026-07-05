import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  scanReceipt: jest.fn(),
}))
jest.mock('../src/services/auth', () => ({
  auth: { getCurrentAccount: jest.fn().mockResolvedValue({ name: 'Test', email: 'test@example.com' }) },
}))
const mockInvoke = jest.fn().mockResolvedValue({
  data: { kcal: 550, protein: 20, carbs: 60, fat: 15 },
  error: null,
})
jest.mock('../src/services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke: (...args: any[]) => mockInvoke(...args) } },
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-02'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
  mockInvoke.mockResolvedValue({ data: { kcal: 550, protein: 20, carbs: 60, fat: 15 }, error: null })
  await AsyncStorage.setItem('basket:v1:onboarded', '1')
})
afterEach(() => jest.useRealTimers())

describe('extra meals — AI estimate macros passthrough', () => {
  it('saves the estimated macros onto the created ExtraMeal record', async () => {
    const { getAllByTestId, getByTestId, findByTestId } = render(<App />)
    await findByTestId('add-fab')
    fireEvent.press(getAllByTestId('day-cell')[0])
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    expect(mockInvoke).toHaveBeenCalledWith('estimate-extra', { body: { description: 'Burger and fries' } })
    fireEvent.press(getByTestId('save-extra-button'))
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem('basket:extras:v1')) || '[]')
      expect(stored.some((e: any) => e.name === 'Burger and fries')).toBe(true)
    })
    const stored = JSON.parse((await AsyncStorage.getItem('basket:extras:v1')) || '[]')
    const saved = stored.find((e: any) => e.name === 'Burger and fries')
    expect(saved).toMatchObject({
      name: 'Burger and fries', kcal: 550, macros: { protein: 20, carbs: 60, fat: 15 },
    })
  })
})
