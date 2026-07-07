import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import ChangePasswordSheet from '../../src/components/settings/ChangePasswordSheet'
import { AuthService } from '../../src/services/auth'

function makeAuth(overrides?: Partial<AuthService>): AuthService {
  return {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithApple: jest.fn(),
    resetPassword: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    getCurrentAccount: jest.fn().mockResolvedValue(null),
    changePassword: jest.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  }
}

function renderSheet(auth: AuthService, onClose = jest.fn()) {
  const utils = render(<ChangePasswordSheet visible onClose={onClose} auth={auth} />)
  return { ...utils, onClose }
}

describe('ChangePasswordSheet', () => {
  it("rejects mismatched passwords without calling the service", () => {
    const auth = makeAuth()
    const { getByTestId, getByText } = renderSheet(auth)
    fireEvent.changeText(getByTestId('new-password-input'), 'abcdef')
    fireEvent.changeText(getByTestId('confirm-password-input'), 'abcdeg')
    fireEvent.press(getByTestId('change-password-submit'))
    expect(getByText("Passwords don't match.")).toBeTruthy()
    expect(auth.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a too-short password without calling the service', () => {
    const auth = makeAuth()
    const { getByTestId, getByText } = renderSheet(auth)
    fireEvent.changeText(getByTestId('new-password-input'), 'abc')
    fireEvent.changeText(getByTestId('confirm-password-input'), 'abc')
    fireEvent.press(getByTestId('change-password-submit'))
    expect(getByText('Use at least 6 characters.')).toBeTruthy()
    expect(auth.changePassword).not.toHaveBeenCalled()
  })

  it('submits a valid password and shows confirmation', async () => {
    const auth = makeAuth()
    const { getByTestId, getByText } = renderSheet(auth)
    fireEvent.changeText(getByTestId('new-password-input'), 'abcdef')
    fireEvent.changeText(getByTestId('confirm-password-input'), 'abcdef')
    fireEvent.press(getByTestId('change-password-submit'))
    await waitFor(() => getByText('Password updated'))
    expect(auth.changePassword).toHaveBeenCalledWith('abcdef')
  })

  it('surfaces a service error', async () => {
    const auth = makeAuth({
      changePassword: jest.fn().mockResolvedValue({ ok: false, error: 'Password too weak' }),
    })
    const { getByTestId, getByText } = renderSheet(auth)
    fireEvent.changeText(getByTestId('new-password-input'), 'abcdef')
    fireEvent.changeText(getByTestId('confirm-password-input'), 'abcdef')
    fireEvent.press(getByTestId('change-password-submit'))
    await waitFor(() => getByText('Password too weak'))
  })
})
