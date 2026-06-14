import { supabase, isSupabaseConfigured } from './supabase'

export type Account = { name: string; email: string }
export type AuthResult = { ok: true; account: Account } | { ok: false; error: string }

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(email: string, password: string): Promise<AuthResult>
  signInWithApple(): Promise<AuthResult>
  signInWithGoogle(): Promise<AuthResult>
  resetPassword(email: string): Promise<{ ok: boolean; error?: string }>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
}

export function capitalize(email: string): string {
  return email.split('@')[0].replace(/^\w/, (c) => c.toUpperCase())
}

function toAccount(user: any): Account {
  return {
    email: user?.email ?? '',
    name: user?.user_metadata?.name || capitalize(user?.email ?? ''),
  }
}

function friendlyError(error: any): string {
  return error?.message || 'Something went wrong. Try again.'
}

export function createSupabaseAuth(client: any): AuthService {
  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) return { ok: false, error: friendlyError(error) }
      return { ok: true, account: toAccount(data.user) }
    },

    async signUp(email: string, password: string): Promise<AuthResult> {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) return { ok: false, error: friendlyError(error) }
      return { ok: true, account: toAccount(data.user) }
    },

    async signInWithApple(): Promise<AuthResult> {
      return { ok: false, error: 'Use email sign-in for now — Apple/Google coming soon.' }
    },

    async signInWithGoogle(): Promise<AuthResult> {
      return { ok: false, error: 'Use email sign-in for now — Apple/Google coming soon.' }
    },

    async resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
      if (!/\S+@\S+\.\S+/.test(email)) {
        return { ok: false, error: 'Enter a valid email.' }
      }
      const { error } = await client.auth.resetPasswordForEmail(email)
      return { ok: !error, error: error ? friendlyError(error) : undefined }
    },

    async signOut(): Promise<void> {
      await client.auth.signOut()
    },

    async deleteAccount(): Promise<void> {
      await client.rpc('delete_account')
      await client.auth.signOut()
    },
  }
}

export const stubAuth: AuthService = {
  async signIn(email: string, _password: string): Promise<AuthResult> {
    if (/fail@/.test(email)) {
      return { ok: false, error: "Those credentials didn't match. Try again." }
    }
    return { ok: true, account: { name: capitalize(email), email } }
  },

  async signUp(email: string, _password: string): Promise<AuthResult> {
    if (/fail@/.test(email)) {
      return { ok: false, error: "Those credentials didn't match. Try again." }
    }
    return { ok: true, account: { name: capitalize(email), email } }
  },

  async signInWithApple(): Promise<AuthResult> {
    return { ok: true, account: { name: 'Anna', email: 'anna@icloud.com' } }
  },

  async signInWithGoogle(): Promise<AuthResult> {
    return { ok: true, account: { name: 'Anna', email: 'anna@gmail.com' } }
  },

  async resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!/\S+@\S+\.\S+/.test(email)) {
      return { ok: false, error: 'Enter a valid email.' }
    }
    return { ok: true }
  },

  async signOut(): Promise<void> {
    // no-op stub
  },

  async deleteAccount(): Promise<void> {
    // no-op stub
  },
}

export const auth: AuthService =
  isSupabaseConfigured && supabase ? createSupabaseAuth(supabase) : stubAuth
