import AsyncStorage from '@react-native-async-storage/async-storage'
import { MealPrepCycle, ExtraMeal, PantryItem, Preferences, CustomFood } from '../types'
import { DEFAULT_PREFERENCES } from '../data'

export const STORAGE_KEY = 'basket:cycles:v1'

export const STORAGE_KEY_CUSTOM_FOODS = 'basket:customFoods:v1'

export async function loadCustomFoods(
  deps: StorageDeps = defaultDeps
): Promise<CustomFood[] | null> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_CUSTOM_FOODS)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CustomFood[]) : null
  } catch {
    return null
  }
}

export async function saveCustomFoods(
  foods: CustomFood[],
  deps: StorageDeps = defaultDeps
): Promise<void> {
  try {
    await deps.storage.setItem(STORAGE_KEY_CUSTOM_FOODS, JSON.stringify(foods))
  } catch {
    // Persistence must never crash the app.
  }
}

type StorageDeps = {
  storage: {
    getItem(k: string): Promise<string | null>
    setItem(k: string, v: string): Promise<void>
    removeItem(k: string): Promise<void>
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

export const STORAGE_KEY_PREFS = 'basket:prefs:v1'

export async function loadPrefs(deps: StorageDeps = defaultDeps): Promise<Preferences> {
  try {
    const raw = await deps.storage.getItem(STORAGE_KEY_PREFS)
    if (raw == null) return DEFAULT_PREFERENCES
    const p = JSON.parse(raw)
    if (typeof p !== 'object' || p == null) return DEFAULT_PREFERENCES
    return {
      ...DEFAULT_PREFERENCES,
      ...p,
      units: { ...DEFAULT_PREFERENCES.units, ...(p.units ?? {}) },
      macroTargets: { ...DEFAULT_PREFERENCES.macroTargets, ...(p.macroTargets ?? {}) },
      accent: Array.isArray(p.accent) && p.accent.length === 3 ? p.accent : DEFAULT_PREFERENCES.accent,
    }
  } catch { return DEFAULT_PREFERENCES }
}

export async function savePrefs(prefs: Preferences, deps: StorageDeps = defaultDeps): Promise<void> {
  try { await deps.storage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs)) } catch {}
}

const ALL_KEYS = [STORAGE_KEY, STORAGE_KEY_EXTRAS, STORAGE_KEY_DAILY_GOAL, STORAGE_KEY_PANTRY, STORAGE_KEY_PREFS]

export async function exportAll(deps: StorageDeps = defaultDeps): Promise<string> {
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() }
  const map: Record<string, string> = {
    [STORAGE_KEY]: 'cycles',
    [STORAGE_KEY_EXTRAS]: 'extras',
    [STORAGE_KEY_DAILY_GOAL]: 'dailyGoal',
    [STORAGE_KEY_PANTRY]: 'pantry',
    [STORAGE_KEY_PREFS]: 'preferences',
  }
  for (const k of ALL_KEYS) {
    try {
      const raw = await deps.storage.getItem(k)
      out[map[k]] = raw == null ? null : JSON.parse(raw)
    } catch {
      out[map[k]] = null
    }
  }
  return JSON.stringify(out, null, 2)
}

export async function clearAll(deps: StorageDeps = defaultDeps): Promise<void> {
  for (const k of ALL_KEYS) {
    try { await deps.storage.removeItem(k) } catch {}
  }
}
