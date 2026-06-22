import { loadKeepScanning, saveKeepScanning, STORAGE_KEY_KEEP_SCANNING } from '../src/services/storage'

function mockStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v }),
    removeItem: jest.fn(async (k: string) => { delete store[k] }),
  }
}

describe('keepScanning persistence', () => {
  it('defaults to false when unset', async () => {
    const storage = mockStorage()
    expect(await loadKeepScanning({ storage })).toBe(false)
  })

  it('round-trips true', async () => {
    const storage = mockStorage()
    await saveKeepScanning(true, { storage })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY_KEEP_SCANNING, 'true')
    expect(await loadKeepScanning({ storage })).toBe(true)
  })

  it('returns false on malformed json', async () => {
    const storage = mockStorage({ [STORAGE_KEY_KEEP_SCANNING]: '{bad' })
    expect(await loadKeepScanning({ storage })).toBe(false)
  })
})
