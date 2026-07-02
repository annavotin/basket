# Working on Batch — read this first

Batch is an **Expo SDK 54** React Native app (RN 0.81, React 19, TypeScript). Before writing
code that touches Expo/React Native APIs, read the **exact versioned docs** for the SDK this
app is pinned to:

**https://docs.expo.dev/versions/v54.0.0/**

(Confirm the version against `package.json` — `expo: ~54.0.0` — before trusting any doc URL.
Expo's API surface changes between SDKs; the wrong version will send you down a dead end.)

## Orient yourself
- **`docs/ARCHITECTURE.md`** — the data model, storage keys, sync flow, layers, build/test. Start here.
- **`docs/CODE-REVIEW-2026-07-01.md`** — current known bugs, cleanups, and dead code.
- **`docs/ROADMAP.md`** — planned features and larger improvements.
- **`TODO.md`** — the live task list (release, native-rebuild, backend, on-device checks).

## Non-negotiable invariants (breaking these corrupts user data)
1. **Never rename an AsyncStorage `basket:*:v1` key** — it orphans existing users. Add a new key + migration.
2. **`FoodItem.weightG` / `.kcal` are per-unit**; `quantity` is a separate multiplier. Scale both sides.
3. **`prefs` are device-local** — never sync name/units/theme/goal to the server. Only `cycles`,
   `extra_meals`, `pantry_items` sync.
4. **Soft-delete only** for synced records: set `deletedAt` + `touch()`; never splice a synced row out.
5. **After any mutation to a synced type, call `markDirty(table, id)`** or the change never syncs.

## Conventions
- No modal library and **no `react-native-safe-area-context`** — sheets are hand-rolled; home-indicator
  clearance is a hardcoded `paddingBottom: 50`.
- Fonts via `src/styles/fonts.ts` (Hanken Grotesk = UI, Space Grotesk = numbers); colours via `palette.ts`.
- Use `src/components/settings/ConfirmDialog.tsx` for every destructive action.
- Keep `npx tsc --noEmit` and `npm test` green. Native modules are mocked in `jest-setup.js`; sync is
  tested against `InMemoryRemote`.
- **No em dashes in user-facing copy** (app strings, store listing, website).
