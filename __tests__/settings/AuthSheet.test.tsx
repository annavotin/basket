import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import AuthSheet from '../../src/components/settings/AuthSheet'
import { AuthService, Account } from '../../src/services/auth'

// Synchronous fake auth for most tests
function makeFakeAuth(overrides?: Partial<AuthService>): AuthService {
  return {
    signIn: jest.fn().mockResolvedValue({ ok: true, account: { name: 'Test', email: 'test@example.com' } }),
    signUp: jest.fn().mockResolvedValue({ ok: true, account: { name: 'Test', email: 'test@example.com' } }),
    signInWithApple: jest.fn().mockResolvedValue({ ok: true, account: { name: 'Anna', email: 'anna@icloud.com' } }),
    signInWithGoogle: jest.fn().mockResolvedValue({ ok: true, account: { name: 'Anna', email: 'anna@gmail.com' } }),
    resetPassword: jest.fn().mockResolvedValue({ ok: true }),
    signOut: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderSheet(props?: Partial<React.ComponentProps<typeof AuthSheet>>) {
  const onClose = jest.fn()
  const onAuthed = jest.fn()
  const auth = makeFakeAuth()
  const result = render(
    <AuthSheet
      visible={true}
      onClose={onClose}
      onAuthed={onAuthed}
      auth={auth}
      {...props}
    />
  )
  return { ...result, onClose, onAuthed, auth }
}

describe('AuthSheet', () => {
  describe('validation', () => {
    it('shows error when submitting invalid email', async () => {
      const onAuthed = jest.fn()
      const { getByTestId, getByText } = renderSheet({ onAuthed })
      fireEvent.changeText(getByTestId('auth-email'), 'notanemail')
      fireEvent.changeText(getByTestId('auth-password'), 'password123')
      fireEvent.press(getByTestId('auth-submit'))
      expect(getByText(/Enter a valid email/)).toBeTruthy()
      expect(onAuthed).not.toHaveBeenCalled()
    })

    it('shows error when submitting short password', async () => {
      const onAuthed = jest.fn()
      const { getByTestId, getByText } = renderSheet({ onAuthed })
      fireEvent.changeText(getByTestId('auth-email'), 'test@example.com')
      fireEvent.changeText(getByTestId('auth-password'), '123')
      fireEvent.press(getByTestId('auth-submit'))
      expect(getByText(/6\+ character/)).toBeTruthy()
      expect(onAuthed).not.toHaveBeenCalled()
    })

    it('does not call onAuthed on validation failure', () => {
      const onAuthed = jest.fn()
      const { getByTestId } = renderSheet({ onAuthed })
      // submit with empty fields
      fireEvent.press(getByTestId('auth-submit'))
      expect(onAuthed).not.toHaveBeenCalled()
    })
  })

  describe('successful sign in', () => {
    it('calls onAuthed with account on successful signin', async () => {
      const onAuthed = jest.fn()
      const account: Account = { name: 'Alice', email: 'alice@example.com' }
      const auth = makeFakeAuth({
        signIn: jest.fn().mockResolvedValue({ ok: true, account }),
      })
      const { getByTestId } = render(
        <AuthSheet visible={true} onClose={jest.fn()} onAuthed={onAuthed} auth={auth} />
      )
      fireEvent.changeText(getByTestId('auth-email'), 'alice@example.com')
      fireEvent.changeText(getByTestId('auth-password'), 'password123')
      fireEvent.press(getByTestId('auth-submit'))
      await waitFor(() => expect(onAuthed).toHaveBeenCalledWith(account))
    })
  })

  describe('failed sign in', () => {
    it('shows error text when auth returns error', async () => {
      const onAuthed = jest.fn()
      const auth = makeFakeAuth({
        signIn: jest.fn().mockResolvedValue({ ok: false, error: "Those credentials didn't match. Try again." }),
      })
      const { getByTestId, getByText } = render(
        <AuthSheet visible={true} onClose={jest.fn()} onAuthed={onAuthed} auth={auth} />
      )
      fireEvent.changeText(getByTestId('auth-email'), 'fail@example.com')
      fireEvent.changeText(getByTestId('auth-password'), 'password123')
      fireEvent.press(getByTestId('auth-submit'))
      await waitFor(() => expect(getByText(/Those credentials didn't match/)).toBeTruthy())
      expect(onAuthed).not.toHaveBeenCalled()
    })
  })

  describe('social sign in', () => {
    it('tapping auth-apple calls onAuthed with Apple account', async () => {
      const onAuthed = jest.fn()
      const { getByTestId } = renderSheet({ onAuthed })
      fireEvent.press(getByTestId('auth-apple'))
      await waitFor(() => expect(onAuthed).toHaveBeenCalledWith({ name: 'Anna', email: 'anna@icloud.com' }))
    })

    it('tapping auth-google calls onAuthed with Google account', async () => {
      const onAuthed = jest.fn()
      const { getByTestId } = renderSheet({ onAuthed })
      fireEvent.press(getByTestId('auth-google'))
      await waitFor(() => expect(onAuthed).toHaveBeenCalledWith({ name: 'Anna', email: 'anna@gmail.com' }))
    })
  })

  describe('forgot password mode', () => {
    it('does not show password field in forgot mode', () => {
      const { queryByTestId } = renderSheet({ initialMode: 'forgot' })
      expect(queryByTestId('auth-password')).toBeNull()
    })

    it('shows sent confirmation after successful reset', async () => {
      const { getByTestId, getByText } = renderSheet({ initialMode: 'forgot' })
      fireEvent.changeText(getByTestId('auth-email'), 'user@example.com')
      fireEvent.press(getByTestId('auth-submit'))
      await waitFor(() => expect(getByText(/Check/)).toBeTruthy())
    })

    it('shows error for invalid email in forgot mode', async () => {
      const auth = makeFakeAuth({
        resetPassword: jest.fn().mockResolvedValue({ ok: false, error: 'Enter a valid email.' }),
      })
      const { getByTestId, getByText } = renderSheet({ initialMode: 'forgot', auth })
      fireEvent.changeText(getByTestId('auth-email'), 'notanemail')
      fireEvent.press(getByTestId('auth-submit'))
      await waitFor(() => expect(getByText(/Enter a valid email/)).toBeTruthy())
    })
  })

  describe('signup mode', () => {
    it('shows Apple and Google buttons in signup mode', () => {
      const { getByTestId } = renderSheet({ initialMode: 'signup' })
      expect(getByTestId('auth-apple')).toBeTruthy()
      expect(getByTestId('auth-google')).toBeTruthy()
    })

    it('calls signUp on submit in signup mode', async () => {
      const onAuthed = jest.fn()
      const account: Account = { name: 'New', email: 'new@example.com' }
      const auth = makeFakeAuth({
        signUp: jest.fn().mockResolvedValue({ ok: true, account }),
      })
      const { getByTestId } = render(
        <AuthSheet visible={true} onClose={jest.fn()} onAuthed={onAuthed} auth={auth} initialMode="signup" />
      )
      fireEvent.changeText(getByTestId('auth-email'), 'new@example.com')
      fireEvent.changeText(getByTestId('auth-password'), 'securepass')
      fireEvent.press(getByTestId('auth-submit'))
      await waitFor(() => expect(onAuthed).toHaveBeenCalledWith(account))
    })
  })
})
