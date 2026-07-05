# Code sweep 2026-07-04 — fix list

Scope swept: App.tsx, all of src/services + src/utils + hooks, AddItemSheet/NutritionFields.
Large screens (Onboarding/Settings/Pantry/Timeline/ItemDetail/AuthSheet) only pattern-grepped.
Each item: fix + regression test where testable. Don't touch anything else.

1. **App.tsx:367-369** — after each sync pass, triple full-array `JSON.stringify` compare to
   decide setState. O(dataset) on the JS thread per sync. Replace with a cheap check
   (e.g. reference/length/updatedAt-based, or have `syncTable` report whether merge changed
   anything).

2. **Sign-out leaves sync metadata behind** (App.tsx:1069 `onSignOut`). Cursors + dirty queue +
   `ADOPTED_KEY` persist, so signing into a different account skips pulling rows older than the
   old cursor and skips adoption. Call `clearSyncMetadata(AsyncStorage)` on sign-out (as
   delete-account already does).

3. **App.tsx:806-815 `handleClearAll`** — hard-wipes synced arrays (violates soft-delete
   invariant) and leaves queue/cursors, so a signed-in "clear all" partially resurrects from
   remote on next sync. Minimal fix: also `clearSyncMetadata`; decide + document whether clear-all
   while signed in should also sign out (recommended: yes, sign out first).

4. **App.tsx:819-824 `handleDeleteAccount`** — `authService.deleteAccount()` not awaited, errors
   swallowed; local data is wiped even if the cloud delete failed. Await it and only wipe on
   success (alert on failure).

5. **sync-queue.ts read-modify-write race** — concurrent `markDirty` calls (fire-and-forget) and
   `clear` during a sync pass can interleave and drop a dirty id (change then never syncs).
   Serialize ops through a simple promise chain inside `makeQueue`.

6. **foodApi.ts `searchProductsByName` + usda.ts `usdaSearchByName` use raw fetch with no
   timeout** — a hung request never resolves, `useFoodSearch.loading` sticks true, Add-sheet
   shows "Searching…" forever and custom-add card never appears. Route both through
   `fetchWithRetry` (http.ts) like `lookupProductByBarcode`.

7. **ReceiptReviewSheet.tsx:116-117 `parseInt` on weight/kcal** — truncates decimal input
   (same bug class fixed elsewhere 2026-07-01). Use `parseFloat` (+ round kcal).
   Same for ExtraMealSheet.tsx:49 kcal.

Constraints: Expo SDK 54 RN app. Keep `npx tsc --noEmit` + `npx jest` green. Follow AGENTS.md
invariants (soft-delete only, markDirty after synced mutations, prefs stay device-local).
Working tree already has unrelated uncommitted changes — do NOT commit, do NOT revert them.
