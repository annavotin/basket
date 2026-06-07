import AsyncStorage from '@react-native-async-storage/async-storage'
import { MealPrepCycle, ExtraMeal, PantryItem } from '../types'

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

export const STORAGE_KEY_EXTRAS = 'basket:extras:v1'

export async function loadExtras(
  deps: StorageDeps = defaultDeps
): Promise<ExtraMeal[] | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_EXTRAS)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExtraMeal[]) : null
  } catch {
    return null
  }
}

export async function saveExtras(
  extras: ExtraMeal[],
  deps: StorageDeps = defaultDeps
): Promise<void> {
  try {
    await deps.storage.setItem(STORAGE_KEY_EXTRAS, JSON.stringify(extras))
  } catch {
    // Persistence must never crash the app.
  }
}

export const STORAGE_KEY_DAILY_GOAL = 'basket:dailyGoal:v1'

export async function loadDailyGoal(deps: StorageDeps = defaultDeps): Promise<number | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_DAILY_GOAL)
    if (raw == null) return null
    const n = JSON.parse(raw)
    return typeof n === 'number' && n > 0 ? n : null
  } catch { return null }
}

export async function saveDailyGoal(goal: number, deps: StorageDeps = defaultDeps): Promise<void> {
  try { await deps.storage.setItem(STORAGE_KEY_DAILY_GOAL, JSON.stringify(goal)) } catch {}
}

export const STORAGE_KEY_PANTRY = 'basket:pantry:v1'

export async function loadPantry(
  deps: StorageDeps = defaultDeps
): Promise<PantryItem[] | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_PANTRY)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PantryItem[]) : null
  } catch {
    return null
  }
}

export async function savePantry(
  items: PantryItem[],
  deps: StorageDeps = defaultDeps
): Promise<void> {
  try {
    await deps.storage.setItem(STORAGE_KEY_PANTRY, JSON.stringify(items))
  } catch {
    // Persistence must never crash the app.
  }
}
