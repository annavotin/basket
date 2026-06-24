# Reliable OFF Autocomplete (Search-a-licious) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing manual-add OFF autocomplete actually return results by repointing `searchProductsByName` from OFF's 503-ing legacy `cgi/search.pl` to Search-a-licious (`search.openfoodfacts.org/search`).

**Architecture:** Single-function change in `src/services/foodApi.ts` — new URL + read `json.hits` instead of `json.products`; the existing name/kcal/macro/weight mapping, guards, and `useFoodSearch` merge behaviour are unchanged.

**Tech Stack:** TypeScript, Jest. Network is mocked in tests; live relevance/reliability is device-verified.

**Conventions:** TDD; `npx jest` (NEVER `npx expo start`); commit to `main`.

---

## Task 1: Repoint `searchProductsByName` to Search-a-licious

**Files:**
- Modify: `src/services/foodApi.ts` (the `searchProductsByName` function + remove the now-unused `SEARCH_BASE`/`SEARCH_FIELDS` constants)
- Test: `__tests__/foodApi.test.ts` (the `searchProductsByName` describe block)

- [ ] **Step 1: Update the tests to the Search-a-licious shape (they will fail against the current cgi code)**

In `__tests__/foodApi.test.ts`, replace the first two `searchProductsByName` tests' fetch mocks (`{ products: [...] }` → `{ hits: [...] }`) and the URL assertion (`search_terms=hummus` → `q=hummus` + the new host). The two `returns []` tests are unchanged. Final block:

```ts
describe('searchProductsByName', () => {
  it('hits Search-a-licious with q= + User-Agent and maps hits', async () => {
    const fetchMock = fakeFetch({
      hits: [
        { product_name: 'Hummus', quantity: '200 g', nutriments: { 'energy-kcal_100g': 166 } },
        { product_name: 'No Energy', nutriments: {} },
        { product_name: '', nutriments: { 'energy-kcal_100g': 100 } },
      ],
    })
    const out = await searchProductsByName('hummus', { fetch: fetchMock })
    const [url, opts] = (fetchMock as jest.Mock).mock.calls[0]
    expect(url).toContain('search.openfoodfacts.org/search')
    expect(url).toContain('q=hummus')
    expect(opts.headers['User-Agent']).toBe(OFF_USER_AGENT)
    expect(out).toEqual([
      { name: 'Hummus', emoji: '🛒', kcalPer100g: 166, packageWeightG: 200, source: 'off' },
    ])
  })

  it('rounds search-result kcal/100g to the nearest tenth', async () => {
    const out = await searchProductsByName('x', {
      fetch: fakeFetch({ hits: [{ product_name: 'P', nutriments: { 'energy-kcal_100g': 166.64 } }] }),
    })
    expect(out[0].kcalPer100g).toBe(166.6)
  })

  it('returns [] when the response is not ok', async () => {
    expect(await searchProductsByName('x', { fetch: fakeFetch({}, false) })).toEqual([])
  })

  it('returns [] on a network/parse error', async () => {
    const fetchMock = jest.fn(async () => { throw new Error('down') }) as unknown as typeof fetch
    expect(await searchProductsByName('x', { fetch: fetchMock })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests — confirm they FAIL**

Run: `npx jest foodApi -t "searchProductsByName"`
Expected: the first two FAIL (current code reads `json.products` → empty `out`; URL has `search_terms`/`cgi`, not `q=`/`search.openfoodfacts.org`). The two `returns []` tests still pass.

- [ ] **Step 3: Repoint the function**

In `src/services/foodApi.ts`, replace the body of `searchProductsByName` with:

```ts
export async function searchProductsByName(
  query: string,
  deps: Deps = { fetch: globalThis.fetch }
): Promise<FoodSuggestion[]> {
  try {
    const url =
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}` +
      `&fields=product_name,nutriments,product_quantity&page_size=15`
    const res = await deps.fetch(url, { headers: offHeaders })
    if (!res || !res.ok) return []
    const json: any = await res.json()
    const hits: any[] = Array.isArray(json?.hits) ? json.hits : []
    const out: FoodSuggestion[] = []
    for (const p of hits) {
      const kcalPer100g = p?.nutriments?.['energy-kcal_100g']
      const name = typeof p?.product_name === 'string' ? p.product_name.trim() : ''
      if (typeof kcalPer100g !== 'number' || kcalPer100g <= 0 || !name) continue
      out.push({ name, emoji: '🛒', kcalPer100g: roundTenth(kcalPer100g), packageWeightG: packageWeightFrom(p), source: 'off', macrosPer100g: macrosFrom(p?.nutriments) })
    }
    return out
  } catch {
    return []
  }
}
```

Then delete the now-unused module constants `SEARCH_BASE` and `SEARCH_FIELDS` (near the top of the file). Leave `BASE`/`FIELDS` (used by the barcode lookup) and `offHeaders` intact.

- [ ] **Step 4: Run the tests — confirm they PASS**

Run: `npx jest foodApi`
Expected: all `foodApi` tests pass (the four `searchProductsByName` + the barcode/rounding ones).

- [ ] **Step 5: Full suite + tsc**

Run: `npx jest` → all green (391 tests).
Run: `npx tsc --noEmit 2>&1 | grep -E "foodApi" || echo clean` → `clean` (confirms no unused-const error from removing `SEARCH_BASE`/`SEARCH_FIELDS`).

- [ ] **Step 6: Commit**

```bash
git add src/services/foodApi.ts __tests__/foodApi.test.ts
git commit -m "feat: OFF autocomplete via Search-a-licious (reliable name search)"
```

- [ ] **Step 7: On-device check (network is mocked in jest)**

In manual-add, type a food (e.g. "oat milk", "hummus", a brand). Confirm OFF results now appear in the suggestion list with the "· OFF" tag, below your saved/common foods.

---

## Self-Review

**Spec coverage:** URL → Search-a-licious ✓ (Step 3); read `hits` ✓; mapping/guards/rounding/weight/macros unchanged ✓; remove `SEARCH_BASE`/`SEARCH_FIELDS` ✓; tests updated to `hits` + `q=` ✓ (Step 1); `useFoodSearch` merge/debounce + AddItemSheet UI untouched ✓ (not in scope of the change). Out-of-scope items (ranking, USDA, caching) — not touched ✓.

**Placeholder scan:** none — full code + exact commands.

**Type/name consistency:** `searchProductsByName(query, deps)` signature unchanged; returns `FoodSuggestion[]`; reuses existing `offHeaders`, `roundTenth`, `packageWeightFrom`, `macrosFrom`, `Deps`. Test helper `fakeFetch(payload, ok?)` already exists in the file and is reused.
