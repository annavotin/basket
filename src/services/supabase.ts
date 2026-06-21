import 'react-native-url-polyfill/auto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { retryingFetch } from './http'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/** True when the EXPO_PUBLIC_SUPABASE_* env vars are present. When false the app runs
 *  fully local-only (no auth, no sync) — the existing offline behaviour. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Encrypted-at-rest session storage (tokens never touch AsyncStorage). */
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

/** The shared Supabase client, or null when unconfigured (local-only mode). */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      // Retry transient iOS connection drops (-1005) so sync/auth don't fail on a blip.
      global: { fetch: (input, init) => retryingFetch(input, init) },
    })
  : null
