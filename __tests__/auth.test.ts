import { stubAuth } from '../src/services/auth'

describe('stubAuth', () => {
  describe('signIn', () => {
    it('resolves ok with capitalized name and email on success', async () => {
      const result = await stubAuth.signIn('anna@example.com', 'password123')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.account.name).toBe('Anna')
        expect(result.account.email).toBe('anna@example.com')
      }
    })

    it('derives name from local part of email', async () => {
      const result = await stubAuth.signIn('john.doe@example.com', 'pass123')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.account.name).toBe('John.doe')
      }
    })

    it('returns error for fail@ email', async () => {
      const result = await stubAuth.signIn('fail@example.com', 'password')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe("Those credentials didn't match. Try again.")
      }
    })
  })

  describe('signUp', () => {
    it('resolves ok with capitalized name and email on success', async () => {
      const result = await stubAuth.signUp('newuser@example.com', 'password123')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.account.name).toBe('Newuser')
        expect(result.account.email).toBe('newuser@example.com')
      }
    })

    it('returns error for fail@ email', async () => {
      const result = await stubAuth.signUp('fail@somewhere.com', 'password')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe("Those credentials didn't match. Try again.")
      }
    })
  })

  describe('signInWithApple', () => {
    it('returns ok with Anna and iCloud email', async () => {
      const result = await stubAuth.signInWithApple()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.account.name).toBe('Anna')
        expect(result.account.email).toBe('anna@icloud.com')
      }
    })
  })

  describe('signInWithGoogle', () => {
    it('returns ok with Anna and Gmail email', async () => {
      const result = await stubAuth.signInWithGoogle()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.account.name).toBe('Anna')
        expect(result.account.email).toBe('anna@gmail.com')
      }
    })
  })

  describe('resetPassword', () => {
    it('returns ok for valid email', async () => {
      const result = await stubAuth.resetPassword('user@example.com')
      expect(result.ok).toBe(true)
    })

    it('returns error for invalid email', async () => {
      const result = await stubAuth.resetPassword('notanemail')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Enter a valid email.')
    })

    it('returns error for empty string', async () => {
      const result = await stubAuth.resetPassword('')
      expect(result.ok).toBe(false)
    })
  })

  describe('signOut', () => {
    it('resolves without error', async () => {
      await expect(stubAuth.signOut()).resolves.toBeUndefined()
    })
  })

  describe('deleteAccount', () => {
    it('resolves without error', async () => {
      await expect(stubAuth.deleteAccount()).resolves.toBeUndefined()
    })
  })
})
