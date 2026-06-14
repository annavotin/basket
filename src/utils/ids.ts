import * as Crypto from 'expo-crypto'

/** A collision-safe id for new records (UUID v4). Time-based ids could collide across devices. */
export function newId(): string {
  return Crypto.randomUUID()
}
