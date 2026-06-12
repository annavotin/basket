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

function capitalize(email: string): string {
  return email.split('@')[0].replace(/^\w/, (c) => c.toUpperCase())
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
