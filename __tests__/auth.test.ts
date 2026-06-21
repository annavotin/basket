import { stubAuth, createSupabaseAuth } from '../src/services/auth'

function mockClient(over: any = {}) {
  return {
    auth: {
      signInWithPassword: jest.fn(async () => ({
        data: { user: { email: 'a@b.com', user_metadata: { name: 'Ann' } } },
        error: null,
      })),
      signUp: jest.fn(async () => ({
        data: { user: { email: 'anna@x.com', user_metadata: {} } },
        error: null,
      })),
      resetPasswordForEmail: jest.fn(async () => ({ error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      updateUser: jest.fn(async () => ({ data: { user: {} }, error: null })),
      ...over.auth,
    },
    rpc: jest.fn(async () => ({ error: null })),
    ...over,
  }
}

describe('createSupabaseAuth', () => {
  it('signIn returns the account on success', async () => {
    const a = createSupabaseAuth(mockClient())
    expect(await a.signIn('a@b.com', 'pw')).toEqual({
      ok: true,
      account: { email: 'a@b.com', name: 'Ann' },
    })
  })

  it('signIn surfaces the supabase error message', async () => {
    const a = createSupabaseAuth(
      mockClient({
        auth: {
          signInWithPassword: jest.fn(async () => ({
            data: {},
            error: { message: 'Invalid login credentials' },
          })),
        },
      })
    )
    expect(await a.signIn('a@b.com', 'x')).toEqual({
      ok: false,
      error: 'Invalid login credentials',
    })
  })

  it('signUp falls back to a capitalized email name when metadata is absent', async () => {
    const a = createSupabaseAuth(mockClient())
    const r = await a.signUp('anna@x.com', 'pw')
    expect(r).toEqual({ ok: true, account: { email: 'anna@x.com', name: 'Anna' } })
  })

  it('signUp returns error on supabase failure', async () => {
    const a = createSupabaseAuth(
      mockClient({
        auth: {
          signUp: jest.fn(async () => ({
            data: {},
            error: { message: 'Email already in use' },
          })),
        },
      })
    )
    expect(await a.signUp('x@y.com', 'pw')).toEqual({
      ok: false,
      error: 'Email already in use',
    })
  })

  it('signInWithApple returns deferred message', async () => {
    const a = createSupabaseAuth(mockClient())
    expect(await a.signInWithApple()).toEqual({
      ok: false,
      error: 'Use email sign-in for now — Apple/Google coming soon.',
    })
  })

  it('signInWithGoogle returns deferred message', async () => {
    const a = createSupabaseAuth(mockClient())
    expect(await a.signInWithGoogle()).toEqual({
      ok: false,
      error: 'Use email sign-in for now — Apple/Google coming soon.',
    })
  })

  it('resetPassword rejects an invalid email before calling supabase', async () => {
    const client = mockClient()
    const a = createSupabaseAuth(client)
    expect(await a.resetPassword('nope')).toEqual({ ok: false, error: 'Enter a valid email.' })
    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('resetPassword calls supabase and returns ok for valid email', async () => {
    const client = mockClient()
    const a = createSupabaseAuth(client)
    expect(await a.resetPassword('user@example.com')).toEqual({ ok: true })
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com')
  })

  it('resetPassword surfaces supabase error', async () => {
    const client = mockClient({
      auth: {
        resetPasswordForEmail: jest.fn(async () => ({ error: { message: 'Rate limit exceeded' } })),
      },
    })
    const a = createSupabaseAuth(client)
    expect(await a.resetPassword('user@example.com')).toEqual({
      ok: false,
      error: 'Rate limit exceeded',
    })
  })

  it('deleteAccount calls the rpc then signs out', async () => {
    const client = mockClient()
    await createSupabaseAuth(client).deleteAccount()
    expect(client.rpc).toHaveBeenCalledWith('delete_account')
    expect(client.auth.signOut).toHaveBeenCalled()
  })

  it('signOut calls supabase signOut', async () => {
    const client = mockClient()
    await createSupabaseAuth(client).signOut()
    expect(client.auth.signOut).toHaveBeenCalled()
  })

  it('getCurrentAccount returns the account from a persisted session', async () => {
    const client = mockClient({
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { user: { email: 'a@b.com', user_metadata: { name: 'Ann' } } } },
          error: null,
        })),
      },
    })
    expect(await createSupabaseAuth(client).getCurrentAccount()).toEqual({
      email: 'a@b.com',
      name: 'Ann',
    })
  })

  it('getCurrentAccount returns null when there is no session', async () => {
    const client = mockClient()
    expect(await createSupabaseAuth(client).getCurrentAccount()).toBeNull()
  })

  it('changePassword calls updateUser and returns ok', async () => {
    const client = mockClient()
    expect(await createSupabaseAuth(client).changePassword('newpass123')).toEqual({ ok: true })
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('changePassword surfaces the supabase error', async () => {
    const client = mockClient({
      auth: {
        updateUser: jest.fn(async () => ({ data: {}, error: { message: 'Password too weak' } })),
      },
    })
    expect(await createSupabaseAuth(client).changePassword('x')).toEqual({
      ok: false,
      error: 'Password too weak',
    })
  })
})

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

  describe('getCurrentAccount', () => {
    it('returns null (no persisted session in local-only mode)', async () => {
      await expect(stubAuth.getCurrentAccount()).resolves.toBeNull()
    })
  })

  describe('changePassword', () => {
    it('resolves ok in local-only mode', async () => {
      await expect(stubAuth.changePassword('whatever123')).resolves.toEqual({ ok: true })
    })
  })
})
