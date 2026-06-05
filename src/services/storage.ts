import AsyncStorage from '@react-native-async-storage/async-storage'
import { MealPrepCycle } from '../types'

export const STORAGE_KEY = 'basket:cycles:v1'

type StorageDeps = {
  storage: {
    getItem(k: string): Promise<string | null>
    setItem(k: string, v: string): Promise<void>
  }
}

const defaultDeps: StorageDeps = { storage: AsyncStorage }

export async function loadCycles(
  deps: StorageDeps = defaultDeps
): Promise<MealPrepCycle[] | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MealPrepCycle[]) : null
  } catch {
    return null
  }
}

export async function saveCycles(
  cycles: MealPrepCycle[],
  deps: StorageDeps = defaultDeps
): Promise<void> {
  try {
    await deps.storage.setItem(STORAGE_KEY, JSON.stringify(cycles))
  } catch {
    // Persistence must never crash the app.
  }
}
