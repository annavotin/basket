import { loadCycles, saveCycles, STORAGE_KEY, loadExtras, saveExtras, STORAGE_KEY_EXTRAS, loadDailyGoal, saveDailyGoal, STORAGE_KEY_DAILY_GOAL, loadPantry, savePantry, STORAGE_KEY_PANTRY, loadPrefs, savePrefs, STORAGE_KEY_PREFS } from '../src/services/storage'
import { MealPrepCycle, ExtraMeal, PantryItem, Preferences } from '../src/types'
import { DEFAULT_PREFERENCES } from '../src/data'

function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial }
  return {
    data,
    getItem: jest.fn(async (k: string) => (k in data ? data[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      data[k] = v
    }),
  }
}

const sampleCycles: MealPrepCycle[] = [
  {
    id: 'cycle-1',
    startDate: '2026-05-31',
    endDate: '2026-06-04',
    items: [{ name: 'Eggs', weightG: 600, kcal: 800, emoji: '🥚' }],
  },
]

describe('storage', () => {
  it('round-trips cycles through save then load', async () => {
    const storage = fakeStorage()
    await saveCycles(sampleCycles, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))
    const loaded = await loadCycles({ storage })
    expect(loaded).toEqual(sampleCycles)
  })

  it('returns null when getItem returns null (nothing stored)', async () => {
    const storage = fakeStorage()
    expect(await loadCycles({ storage })).toBeNull()
  })

  it('returns null on corrupt JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{not valid json' })
    expect(await loadCycles({ storage })).toBeNull()
  })

  it('returns null when stored JSON is not an array', async () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{}' })
    expect(await loadCycles({ storage })).toBeNull()
  })

  it('resolves without throwing when setItem rejects', async () => {
    const storage = {
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => {
        throw new Error('disk full')
      }),
    }
    await expect(saveCycles(sampleCycles, { storage })).resolves.toBeUndefined()
  })
})

describe('extras storage', () => {
  const extras: ExtraMeal[] = [{ id: 'x', date: '2026-06-02', name: 'Bar', kcal: 220 }]

  it('round-trips saved extras', async () => {
    const storage = fakeStorage()
    await saveExtras(extras, { storage })
    expect(await loadExtras({ storage })).toEqual(extras)
  })
  it('returns null when nothing is stored', async () => {
    expect(await loadExtras({ storage: fakeStorage() })).toBeNull()
  })
  it('returns null on corrupt JSON', async () => {
    const storage = fakeStorage()
    await storage.setItem(STORAGE_KEY_EXTRAS, 'not json')
    expect(await loadExtras({ storage })).toBeNull()
  })
  it('returns null on non-array JSON', async () => {
    const storage = fakeStorage()
    await storage.setItem(STORAGE_KEY_EXTRAS, '{}')
    expect(await loadExtras({ storage })).toBeNull()
  })
  it('saveExtras swallows setItem errors', async () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(async () => { throw new Error('full') }) }
    await expect(saveExtras(extras, { storage })).resolves.toBeUndefined()
  })
})

describe('pantry storage', () => {
  const pantryItems: PantryItem[] = [
    { id: 'pantry-oats', name: 'Oats', emoji: '🌾', kcalPer100g: 379, dailyG: 40 },
  ]

  it('round-trips saved pantry items', async () => {
    const storage = fakeStorage()
    await savePantry(pantryItems, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY_PANTRY, expect.any(String))
    expect(await loadPantry({ storage })).toEqual(pantryItems)
  })

  it('returns null when nothing is stored', async () => {
    expect(await loadPantry({ storage: fakeStorage() })).toBeNull()
  })

  it('returns null on corrupt JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_PANTRY]: '{not valid json' })
    expect(await loadPantry({ storage })).toBeNull()
  })

  it('returns null on non-array JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_PANTRY]: '{}' })
    expect(await loadPantry({ storage })).toBeNull()
  })

  it('savePantry swallows setItem errors', async () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(async () => { throw new Error('full') }) }
    await expect(savePantry(pantryItems, { storage })).resolves.toBeUndefined()
  })
})

describe('preferences storage', () => {
  const fullPrefs: Preferences = {
    name: 'Anna',
    defaultDays: 7,
    units: { weight: 'oz', energy: 'kJ' },
    theme: 'dark',
    accent: ['#111111', '#222222', '#333333'],
    macroTargets: { protein: 150, carbs: 200, fat: 60 },
  }

  it('round-trips a full Preferences object through save→load', async () => {
    const storage = fakeStorage()
    await savePrefs(fullPrefs, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY_PREFS, expect.any(String))
    const loaded = await loadPrefs({ storage })
    expect(loaded).toEqual(fullPrefs)
  })

  it('returns DEFAULT_PREFERENCES when nothing stored', async () => {
    const storage = fakeStorage()
    expect(await loadPrefs({ storage })).toEqual(DEFAULT_PREFERENCES)
  })

  it('deep-merges partial stored prefs over defaults', async () => {
    const storage = fakeStorage()
    await storage.setItem(STORAGE_KEY_PREFS, JSON.stringify({ name: 'Anna' }))
    const loaded = await loadPrefs({ storage })
    expect(loaded.name).toBe('Anna')
    expect(loaded.defaultDays).toBe(DEFAULT_PREFERENCES.defaultDays)
    expect(loaded.units.energy).toBe(DEFAULT_PREFERENCES.units.energy)
    expect(loaded.macroTargets.protein).toBe(DEFAULT_PREFERENCES.macroTargets.protein)
  })

  it('returns DEFAULT_PREFERENCES on corrupt JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_PREFS]: '{not valid json' })
    expect(await loadPrefs({ storage })).toEqual(DEFAULT_PREFERENCES)
  })

  it('savePrefs swallows setItem errors', async () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(async () => { throw new Error('full') }) }
    await expect(savePrefs(fullPrefs, { storage })).resolves.toBeUndefined()
  })
})

describe('daily goal storage', () => {
  it('round-trips a number through saveDailyGoal then loadDailyGoal', async () => {
    const storage = fakeStorage()
    await saveDailyGoal(1800, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY_DAILY_GOAL, expect.any(String))
    expect(await loadDailyGoal({ storage })).toBe(1800)
  })

  it('returns null when nothing is stored', async () => {
    expect(await loadDailyGoal({ storage: fakeStorage() })).toBeNull()
  })

  it('returns null on corrupt JSON', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_DAILY_GOAL]: '{not json' })
    expect(await loadDailyGoal({ storage })).toBeNull()
  })

  it('returns null when stored value is a non-number string', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_DAILY_GOAL]: '"x"' })
    expect(await loadDailyGoal({ storage })).toBeNull()
  })

  it('returns null when stored number is 0 (not > 0)', async () => {
    const storage = fakeStorage({ [STORAGE_KEY_DAILY_GOAL]: '0' })
    expect(await loadDailyGoal({ storage })).toBeNull()
  })

  it('saveDailyGoal swallows setItem errors', async () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(async () => { throw new Error('full') }) }
    await expect(saveDailyGoal(2000, { storage })).resolves.toBeUndefined()
  })
})
