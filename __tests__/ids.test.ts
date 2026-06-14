jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-2222-4333-8444-555555555555' }))
import { newId } from '../src/utils/ids'

describe('newId', () => {
  it('returns a uuid from expo-crypto', () => {
    expect(newId()).toBe('11111111-2222-4333-8444-555555555555')
  })
})
