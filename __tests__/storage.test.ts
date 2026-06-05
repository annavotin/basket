import { loadCycles, saveCycles, STORAGE_KEY, loadExtras, saveExtras, STORAGE_KEY_EXTRAS } from '../src/services/storage'
import { MealPrepCycle, ExtraMeal } from '../src/types'

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
