import { stubAuth, createSupabaseAuth } from '../src/services/auth'

function mockClient(over: any = {}) {
  return {
    auth: {
      signInWithPassword: jest.fn(async () => ({
        data: { user: { email: 'a@b.com', user_metadata: { name: 'Ann' } } },
        error: null,
      })),
      signUp: jest.fn(async () => ({
        data: {
          user: { email: 'anna@x.com', user_metadata: {} },
          session: { access_token: 'tok' },
        },
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

  it('signUp passes emailRedirectTo and returns pending when there is no session', async () => {
    const signUp = jest.fn(async () => ({
      data: { user: { email: 'anna@x.com', user_metadata: {} }, session: null },
      error: null,
    }))
    const a = createSupabaseAuth(mockClient({ auth: { signUp } }))
    const r = await a.signUp('anna@x.com', 'pw')
    expect(signUp).toHaveBeenCalledWith({
      email: 'anna@x.com',
      password: 'pw',
      options: { emailRedirectTo: 'https://annavotin.github.io/batch-app/confirm.html' },
    })
    expect(r).toEqual({ ok: true, pending: true, email: 'anna@x.com' })
  })

  it('signUp reports an already-registered email (empty identities, no session)', async () => {
    // Supabase's enumeration protection returns a fake success with an empty
    // identities array when the email already exists.
    const signUp = jest.fn(async () => ({
      data: { user: { email: 'taken@x.com', identities: [] }, session: null },
      error: null,
    }))
    const a = createSupabaseAuth(mockClient({ auth: { signUp } }))
    expect(await a.signUp('taken@x.com', 'pw')).toEqual({
      ok: false,
      error: 'That email is already registered. Sign in instead.',
    })
  })

  describe('completeFromUrl', () => {
    it('exchanges the code and returns the account on success', async () => {
      const exchangeCodeForSession = jest.fn(async () => ({
        data: { user: { email: 'anna@x.com', user_metadata: { name: 'Anna' } } },
        error: null,
      }))
      const a = createSupabaseAuth(mockClient({ auth: { exchangeCodeForSession } }))
      const r = await a.completeFromUrl('batch://auth-callback?code=abc123')
      expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
      expect(r).toEqual({ ok: true, account: { email: 'anna@x.com', name: 'Anna' } })
    })

    it('returns an error when the url has no code param', async () => {
      const a = createSupabaseAuth(mockClient())
      expect(await a.completeFromUrl('batch://auth-callback')).toEqual({
        ok: false,
        error: 'Invalid confirmation link.',
      })
    })

    it('surfaces the supabase error on exchange failure', async () => {
      const exchangeCodeForSession = jest.fn(async () => ({
        data: {},
        error: { message: 'Code expired' },
      }))
      const a = createSupabaseAuth(mockClient({ auth: { exchangeCodeForSession } }))
      expect(await a.completeFromUrl('batch://auth-callback?code=abc123')).toEqual({
        ok: false,
        error: 'Code expired',
      })
    })
  })

  describe('signInWithApple', () => {
    const appleClient = (over: any = {}) => {
      const client = mockClient()
      client.auth.signInWithIdToken = jest.fn(async () => ({
        data: { user: { email: 'a@icloud.com', user_metadata: {} } },
        error: null,
      }))
      Object.assign(client.auth, over)
      return client
    }

    it('exchanges the identity token and returns the account', async () => {
      const client = appleClient()
      const getAppleToken = jest.fn(async () => ({ identityToken: 'id-tok', nonce: 'raw-nonce' }))
      const a = createSupabaseAuth(client, { getAppleToken })
      const r = await a.signInWithApple()
      expect(client.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'apple',
        token: 'id-tok',
        nonce: 'raw-nonce',
      })
      expect(r).toEqual({ ok: true, account: { email: 'a@icloud.com', name: 'A' } })
    })

    it('persists the full name into user metadata on first sign-in', async () => {
      const client = appleClient()
      const getAppleToken = jest.fn(async () => ({
        identityToken: 'id-tok',
        nonce: 'raw-nonce',
        fullName: 'Jamie Rivers',
      }))
      const a = createSupabaseAuth(client, { getAppleToken })
      const r = await a.signInWithApple()
      expect(client.auth.updateUser).toHaveBeenCalledWith({ data: { name: 'Jamie Rivers' } })
      expect(r).toEqual({ ok: true, account: { email: 'a@icloud.com', name: 'Jamie Rivers' } })
    })

    it('does not call updateUser when no name is returned', async () => {
      const client = appleClient()
      const getAppleToken = jest.fn(async () => ({ identityToken: 'id-tok', nonce: 'raw-nonce' }))
      await createSupabaseAuth(client, { getAppleToken }).signInWithApple()
      expect(client.auth.updateUser).not.toHaveBeenCalled()
    })

    it('surfaces the supabase error', async () => {
      const client = appleClient({
        signInWithIdToken: jest.fn(async () => ({ data: {}, error: { message: 'Bad token' } })),
      })
      const getAppleToken = jest.fn(async () => ({ identityToken: 'id-tok', nonce: 'raw-nonce' }))
      expect(await createSupabaseAuth(client, { getAppleToken }).signInWithApple()).toEqual({
        ok: false,
        error: 'Bad token',
      })
    })

    it('treats a cancelled sheet as a silent no-op', async () => {
      const client = appleClient()
      const getAppleToken = jest.fn(async () => {
        throw { code: 'ERR_REQUEST_CANCELED' }
      })
      const r = await createSupabaseAuth(client, { getAppleToken }).signInWithApple()
      expect(r).toEqual({ ok: false, error: '', cancelled: true })
      expect(client.auth.signInWithIdToken).not.toHaveBeenCalled()
    })

    it('returns a friendly error when the native flow throws', async () => {
      const client = appleClient()
      const getAppleToken = jest.fn(async () => {
        throw new Error('Native crash')
      })
      expect(await createSupabaseAuth(client, { getAppleToken }).signInWithApple()).toEqual({
        ok: false,
        error: 'Native crash',
      })
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
      if (result.ok && 'account' in result) {
        expect(result.account.name).toBe('Anna')
        expect(result.account.email).toBe('anna@example.com')
      }
    })

    it('derives name from local part of email', async () => {
      const result = await stubAuth.signIn('john.doe@example.com', 'pass123')
      expect(result.ok).toBe(true)
      if (result.ok && 'account' in result) {
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
    it('resolves ok with pending and the email on success', async () => {
      const result = await stubAuth.signUp('newuser@example.com', 'password123')
      expect(result).toEqual({ ok: true, pending: true, email: 'newuser@example.com' })
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
      if (result.ok && 'account' in result) {
        expect(result.account.name).toBe('Anna')
        expect(result.account.email).toBe('anna@icloud.com')
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

  describe('completeFromUrl', () => {
    it('returns the account for a url with a code param', async () => {
      const result = await stubAuth.completeFromUrl('batch://auth-callback?code=abc123')
      expect(result).toEqual({ ok: true, account: { name: 'Anna', email: 'anna@icloud.com' } })
    })

    it('returns an error for a url without a code param', async () => {
      const result = await stubAuth.completeFromUrl('batch://auth-callback')
      expect(result).toEqual({ ok: false, error: 'Invalid confirmation link.' })
    })
  })
})
