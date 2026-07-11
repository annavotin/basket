import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  scanReceipt: jest.fn(),
}))
// These tests sign in via the email UI to reach a signed-in state; email auth is
// flag-gated off for the Apple-only build, so force it on for the test harness.
jest.mock('../src/config/features', () => ({ EMAIL_AUTH_ENABLED: true }))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth as authService } from '../src/services/auth'
import { SYNC_METADATA_KEYS } from '../src/services/sync-reset'
import { MODAL_DISMISS_DELAY_MS } from '../src/components/settings/ConfirmDialog'

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-02'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
  await AsyncStorage.setItem('basket:v1:onboarded', '1')
  // Seed leftover sync metadata from a "previous session" so we can assert it gets cleared.
  await AsyncStorage.setItem('basket:syncQueue:v1', JSON.stringify({ cycles: ['stale-id'] }))
  await AsyncStorage.setItem('basket:syncCursors:v1', JSON.stringify({ cycles: '2020-01-01T00:00:00.000Z' }))
  await AsyncStorage.setItem('basket:adopted:v1', '1')
})
afterEach(() => jest.useRealTimers())

async function signIn(getByTestId: any, findByTestId: any) {
  await findByTestId('add-fab')
  fireEvent.press(getByTestId('open-settings'))
  fireEvent.press(getByTestId('account-signin'))
  fireEvent.changeText(getByTestId('auth-email'), 'test@example.com')
  fireEvent.changeText(getByTestId('auth-password'), 'password1')
  fireEvent.press(getByTestId('auth-submit'))
  await waitFor(() => expect(getByTestId('account-signout')).toBeTruthy())
}

describe('sign-out clears sync metadata', () => {
  it('removes the dirty queue, cursors, and adopted flag on sign-out', async () => {
    const { getByTestId, findByTestId } = render(<App />)
    await signIn(getByTestId, findByTestId)

    fireEvent.press(getByTestId('account-signout'))

    await waitFor(async () => {
      for (const key of SYNC_METADATA_KEYS) {
        expect(await AsyncStorage.getItem(key)).toBeNull()
      }
    })
  })
})

describe('clear all data', () => {
  it('signs out first when signed in, then clears sync metadata too', async () => {
    const { getByTestId, findByTestId } = render(<App />)
    await signIn(getByTestId, findByTestId)

    fireEvent.press(getByTestId('clear-data'))
    fireEvent.press(getByTestId('confirm-go'))
    // Closing the Settings modal is deferred past the confirm dialog's own dismiss (see
    // MODAL_DISMISS_DELAY_MS) so the two Modals don't close in the same tick.
    jest.advanceTimersByTime(MODAL_DISMISS_DELAY_MS)

    await waitFor(async () => {
      expect(getByTestId('account-signin')).toBeTruthy() // back to signed-out UI
      for (const key of SYNC_METADATA_KEYS) {
        expect(await AsyncStorage.getItem(key)).toBeNull()
      }
    })
  })
})

describe('delete account', () => {
  it('awaits the cloud delete and only wipes local data on success', async () => {
    const spy = jest.spyOn(authService, 'deleteAccount').mockRejectedValueOnce(new Error('network down'))
    const { getByTestId, findByTestId } = render(<App />)
    await signIn(getByTestId, findByTestId)

    fireEvent.press(getByTestId('account-delete'))
    fireEvent.press(getByTestId('confirm-go'))

    // Failure: local data must NOT be wiped, account stays signed in.
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(getByTestId('account-signout')).toBeTruthy()

    spy.mockRestore()
  })

  it('wipes local data and sync metadata once the cloud delete succeeds', async () => {
    jest.spyOn(authService, 'deleteAccount').mockResolvedValueOnce(undefined)
    const { getByTestId, findByTestId } = render(<App />)
    await signIn(getByTestId, findByTestId)

    fireEvent.press(getByTestId('account-delete'))
    fireEvent.press(getByTestId('confirm-go'))

    await waitFor(async () => {
      expect(getByTestId('account-signin')).toBeTruthy()
      for (const key of SYNC_METADATA_KEYS) {
        expect(await AsyncStorage.getItem(key)).toBeNull()
      }
    })
  })
})
