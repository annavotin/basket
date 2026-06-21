/**
 * fetch with a per-attempt timeout and a retry on network failure/timeout. Returns the
 * Response (even non-2xx — the caller decides) or null if every attempt threw. Mobile
 * networks are flaky; one transient blip shouldn't read as "product not in the database".
 */
/**
 * A drop-in `fetch` that retries on network errors (re-throwing on final failure so the
 * caller's own error handling still runs). Injected into the Supabase client to ride out
 * iOS's spurious "-1005 network connection was lost" drops on reused keep-alive sockets.
 * Safe for our sync because every write is an idempotent upsert keyed by id.
 */
export async function retryingFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  { tries = 3, backoffMs = 400 }: { tries?: number; backoffMs?: number } = {},
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      // Respect a caller-initiated abort (unmount, timeout) — don't fight it.
      if (init?.signal?.aborted) throw err
      lastErr = err
      if (attempt < tries - 1) await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)))
    }
  }
  throw lastErr
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  doFetch: typeof fetch = globalThis.fetch,
  { tries = 2, timeoutMs = 7000 }: { tries?: number; timeoutMs?: number } = {},
): Promise<Response | null> {
  for (let attempt = 0; attempt < tries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      return await doFetch(url, { ...init, signal: ctrl.signal })
    } catch {
      // network error or timeout — fall through and retry
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}
