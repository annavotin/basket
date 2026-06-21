import { ReceiptLine } from '../types'
import { newId } from '../utils/ids'

/** Map the scan-receipt function's `{ lines: [...] }` payload into sanitized ReceiptLines.
 *  Pure + defensive: coerces numbers, defaults isFood to true, drops nameless rows. */
export function parseReceiptResponse(data: unknown): ReceiptLine[] {
  const lines = (data as { lines?: unknown })?.lines
  if (!Array.isArray(lines)) return []
  const out: ReceiptLine[] = []
  for (const raw of lines) {
    const l = raw as Record<string, unknown>
    const name = typeof l?.name === 'string' ? l.name.trim() : ''
    if (!name) continue
    out.push({
      id: newId(),
      name,
      weightG: Math.max(0, Math.round(Number(l?.weightG) || 0)),
      kcal: Math.max(0, Math.round(Number(l?.kcal) || 0)),
      isFood: l?.isFood !== false, // default to food unless explicitly false
    })
  }
  return out
}

type Invoke = (body: { image: string; mediaType: string }) => Promise<unknown>

/** Send the receipt image to the backend and return parsed lines. `invoke` is injected
 *  (wraps supabase.functions.invoke) so this is testable; offline/error → []. */
export async function extractReceiptLines(
  image: { base64: string; mediaType: string },
  invoke: Invoke,
): Promise<ReceiptLine[]> {
  try {
    const data = await invoke({ image: image.base64, mediaType: image.mediaType })
    return parseReceiptResponse(data)
  } catch {
    return []
  }
}
