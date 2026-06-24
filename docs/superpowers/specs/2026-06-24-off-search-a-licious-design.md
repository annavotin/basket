# Reliable OFF autocomplete (Search-a-licious) — Design

**Date:** 2026-06-24

## Problem
Manual-add already has food autocomplete: the search bar's `useFoodSearch` hook queries the
user's saved foods + a curated local list + **Open Food Facts** (`searchProductsByName`) + USDA,
debounced, and renders results tagged "· OFF". But OFF results never appear, because
`searchProductsByName` calls OFF's legacy **`cgi/search.pl`** endpoint, which is chronically
overloaded and currently returns **HTTP 503** (an HTML error page) → `!res.ok` → `[]`.

Verified live (2026-06-24):
- `cgi/search.pl` → 503.
- `api/v2/search?search_terms=` → 200 but poor relevance ("oat milk" → water, French dairy).
- **`search.openfoodfacts.org/search?q=` (Search-a-licious)** → 200, fast (~0.4s), excellent
  relevance ("oat milk" → *Boring Oat Milk, Oat Milk, Barista Oat Milk, Latte d'avena*), and each
  hit carries `product_name` + `nutriments` (energy-kcal_100g, proteins/carbs/fat_100g).

## Goal
Make the *existing* OFF autocomplete actually return results, by pointing `searchProductsByName`
at Search-a-licious. No new UI, no behavior change elsewhere.

## Change (one function)
`src/services/foodApi.ts` → `searchProductsByName(query, deps)`:
- **URL:** `https://search.openfoodfacts.org/search?q=<enc(query)>&fields=product_name,nutriments,product_quantity&page_size=15`
  (keep the existing `offHeaders` User-Agent).
- **Response:** read `json.hits` (array) instead of `json.products`.
- **Mapping:** unchanged — for each hit, the same extraction already in place:
  `name` (string `product_name`, trimmed), `kcalPer100g = roundTenth(nutriments['energy-kcal_100g'])`
  (skip if not a positive number or no name), `packageWeightG = packageWeightFrom(hit)` (often
  absent in SAL → `undefined`, which is fine), `macrosPer100g = macrosFrom(hit.nutriments)`,
  `emoji: '🛒'`, `source: 'off'`. Same `try/catch → []` and `!res.ok → []` guards.
- Replace the now-unused `SEARCH_BASE`/`SEARCH_FIELDS` constants with the new URL (inline or a
  `SEARCH_URL` builder).

## Unchanged (explicitly)
- `useFoodSearch`: 300 ms debounce, `MIN_REMOTE_LEN = 2`, parallel USDA query, and the **merge
  order** — the user's saved foods + curated local list first, then OFF + USDA (deduped by name).
  Your own staples and common foods still lead; OFF fills the long tail.
- The `AddItemSheet` suggestion list UI, testIDs, and the "· OFF" tag.
- `lookupProductByBarcode` (the v2 *product* endpoint) — untouched; only name-search moves.

## Testing
- `__tests__/foodApi.test.ts` `searchProductsByName` block: change the fetch mocks from
  `{ products: [...] }` to `{ hits: [...] }`, and the URL assertion from `search_terms=hummus`
  (cgi) to the Search-a-licious URL (`search.openfoodfacts.org` + `q=hummus`). The rounding test
  and the not-ok/error tests carry over with the `hits` shape.
- Live reliability/relevance is device/manual-verified (jest mocks the network).

## Out of scope
- Ranking OFF above local (kept local-first per design).
- USDA changes, new search filters, caching, offline.
