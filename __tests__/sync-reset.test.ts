import { clearSyncMetadata, SYNC_METADATA_KEYS } from '../src/services/sync-reset'

describe('clearSyncMetadata', () => {
  it('removes exactly the queue, cursors, and adopted-flag keys', async () => {
    const removed: string[] = []
    await clearSyncMetadata({ removeItem: async (k: string) => void removed.push(k) })
    expect(removed.sort()).toEqual([...SYNC_METADATA_KEYS].sort())
    expect(SYNC_METADATA_KEYS).toEqual([
      'basket:syncQueue:v1',
      'basket:syncCursors:v1',
      'basket:adopted:v1',
    ])
  })
})
