import { supabase, isSupabaseConfigured } from './supabase'
import * as Crypto from 'expo-crypto'

export type Account = { name: string; email: string }
export type AuthResult = { ok: true; account: Account } | { ok: false; error: string; cancelled?: boolean }

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(email: string, password: string): Promise<AuthResult>
  signInWithApple(): Promise<AuthResult>
  signInWithGoogle(): Promise<AuthResult>
  resetPassword(email: string): Promise<{ ok: boolean; error?: string }>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
  /** Restore the signed-in account from a persisted session, or null if none. */
  getCurrentAccount(): Promise<Account | null>
  /** Set a new password for the signed-in user (no current password needed). */
  changePassword(newPassword: string): Promise<{ ok: boolean; error?: string }>
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

/** Result of a native Apple identity-token request, injected so it's mockable in tests. */
export type AppleTokenResult = {
  identityToken: string
  nonce: string
  fullName?: string | null
}

/** Generates a random nonce, hashes it, runs the native Apple sign-in sheet, and returns the
 * identity token + raw nonce for the supabase exchange. Throws with code `ERR_REQUEST_CANCELED`
 * if the user dismisses the sheet (matches expo-apple-authentication's error shape). */
async function requestAppleToken(): Promise<AppleTokenResult> {
  const AppleAuthentication = require('expo-apple-authentication')
  const rawNonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  })

  const fullName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : undefined

  return {
    identityToken: credential.identityToken,
    nonce: rawNonce,
    fullName: fullName || undefined,
  }
}

/** Result of a native Google identity-token request, injected so it's mockable in tests. */
export type GoogleTokenResult = { idToken: string }

/** Configures Google Sign-In from env-provided client IDs and runs the native flow. */
async function requestGoogleToken(): Promise<GoogleTokenResult> {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  if (!iosClientId || !webClientId) {
    throw new Error('Google sign-in is not configured.')
  }

  const { GoogleSignin } = require('@react-native-google-signin/google-signin')
  GoogleSignin.configure({ iosClientId, webClientId })
  await GoogleSignin.hasPlayServices()
  const result = await GoogleSignin.signIn()
  const idToken = result?.data?.idToken ?? result?.idToken
  if (!idToken) {
    throw new Error('Google sign-in did not return a token.')
  }
  return { idToken }
}

export function createSupabaseAuth(
  client: any,
  deps: { getAppleToken?: () => Promise<AppleTokenResult>; getGoogleToken?: () => Promise<GoogleTokenResult> } = {}
): AuthService {
  const getAppleToken = deps.getAppleToken ?? requestAppleToken
  const getGoogleToken = deps.getGoogleToken ?? requestGoogleToken

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
      let token: AppleTokenResult
      try {
        token = await getAppleToken()
      } catch (err: any) {
        if (err?.code === 'ERR_REQUEST_CANCELED') {
          return { ok: false, error: '', cancelled: true }
        }
        return { ok: false, error: friendlyError(err) }
      }

      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'apple',
        token: token.identityToken,
        nonce: token.nonce,
      })
      if (error) return { ok: false, error: friendlyError(error) }

      // Apple only sends the name on first sign-in; persist it into user metadata so
      // toAccount() can read it back on later sessions.
      if (token.fullName) {
        await client.auth.updateUser({ data: { name: token.fullName } })
      }

      const user = data.user
      const name = token.fullName || user?.user_metadata?.name
      return { ok: true, account: { email: user?.email ?? '', name: name || capitalize(user?.email ?? '') } }
    },

    async signInWithGoogle(): Promise<AuthResult> {
      let token: GoogleTokenResult
      try {
        token = await getGoogleToken()
      } catch (err: any) {
        if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '-5') {
          return { ok: false, error: '', cancelled: true }
        }
        return { ok: false, error: friendlyError(err) }
      }

      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'google',
        token: token.idToken,
      })
      if (error) return { ok: false, error: friendlyError(error) }
      return { ok: true, account: toAccount(data.user) }
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

    async getCurrentAccount(): Promise<Account | null> {
      const { data } = await client.auth.getSession()
      const user = data?.session?.user
      return user ? toAccount(user) : null
    },

    async changePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
      const { error } = await client.auth.updateUser({ password: newPassword })
      return { ok: !error, error: error ? friendlyError(error) : undefined }
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

  async getCurrentAccount(): Promise<Account | null> {
    // local-only mode has no persisted session
    return null
  },

  async changePassword(_newPassword: string): Promise<{ ok: boolean; error?: string }> {
    return { ok: true }
  },
}

export const auth: AuthService =
  isSupabaseConfigured && supabase ? createSupabaseAuth(supabase) : stubAuth
