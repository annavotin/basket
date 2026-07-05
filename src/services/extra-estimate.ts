export type EstimateResult = { kcal: number; protein: number; carbs: number; fat: number }

/** Sanitize the estimate-extra edge function's response into a well-formed EstimateResult,
 *  or null if the payload is missing/malformed. Mirrors parseReceiptResponse's defensiveness. */
export function parseEstimateResponse(data: unknown): EstimateResult | null {
  const d = data as Record<string, unknown> | null | undefined
  if (!d || typeof d !== 'object') return null
  const kcal = Number(d.kcal)
  const protein = Number(d.protein)
  const carbs = Number(d.carbs)
  const fat = Number(d.fat)
  if (![kcal, protein, carbs, fat].every((n) => Number.isFinite(n))) return null
  return {
    kcal: Math.max(0, Math.round(kcal)),
    protein: Math.max(0, Math.round(protein * 10) / 10),
    carbs: Math.max(0, Math.round(carbs * 10) / 10),
    fat: Math.max(0, Math.round(fat * 10) / 10),
  }
}

type Invoke = (body: { description: string }) => Promise<unknown>

/** Ask the backend to estimate calories/macros for a described dish. Offline/error-safe:
 *  any thrown error (network, missing backend) resolves to null rather than rejecting. */
export async function estimateExtra(description: string, invoke: Invoke): Promise<EstimateResult | null> {
  try {
    const data = await invoke({ description })
    return parseEstimateResponse(data)
  } catch {
    return null
  }
}
