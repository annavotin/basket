# Batch — TODO

The live task list. Deeper backlogs live in:
- **`docs/CODE-REVIEW-2026-07-01.md`** — bugs, cleanups, dead code, known limitations
- **`docs/ROADMAP.md`** — new features and larger improvements
- **`docs/ARCHITECTURE.md`** — how the app is put together (read before big changes)

---

## 🚀 App Store / release
- [ ] Submit build to App Store (TestFlight first)
- [ ] App Store listing: name collision on "Batch: …" — using `Batch` as name + subtitle for keywords
- [ ] Verify privacy + terms pages load: https://annavotin.github.io/batch-app/privacy.html and .../terms.html
- [ ] Deep-link email confirmation flow (Supabase email confirmation is OFF for testing; needs a real redirect URL before launch)
- [ ] Primary language: add English (U.S.) localization fully, then switch primary, then remove English (Australia)

## 🔨 Native rebuild needed
One `npx expo run:ios --configuration Release` clears all of these:
- [ ] Frosted nav blur (`expo-blur` — currently a plain translucent View; reverted after a hot-reload crash)
- [ ] Receipt image downscaling (`expo-image-manipulator` — installed, native module needs a rebuild to activate)

## 🐛 Code-review fixes (2026-07-01)
Details + status in `docs/CODE-REVIEW-2026-07-01.md`.
- [x] `carriedItem` kcal inflated for quantity>1
- [x] `ALL_KEYS` dropped custom foods + keep-scanning from export/clear
- [x] `mergeLWW` deterministic tie-break
- [x] Fractional grams truncated (`parseInt` → `parseFloat`); weight-0 save guard; confirm-before-delete saved foods
- [x] Test suite restored (`expo-haptics` mock) + stale tests refreshed
- [x] Remove unused deps (4 fonts + `expo-status-bar`)
- [x] App.tsx: `runSync` re-entrancy guard, midnight refresh, keep-scanning `setTimeout` cleanup
- [ ] App.tsx: stale item-index edit/delete — data-model change, **deferred** pending App-Store-timing decision
- [ ] (deferred) `foodApi` partial-macros, USDA barcode fallback, remove `@react-native-community/slider`, relocate mock data, delete dead `BasketOptionsSheet` + `ExtraMealDetail`

## ☁️ Supabase / backend
- [x] Run SQL migration in Supabase dashboard (`supabase/migrations/0001_init.sql`)
- [x] Run `alter table public.extra_meals add column macros jsonb;` if the DB already exists
- [x] Set server secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
- [x] Deploy receipt-scan edge function: `supabase functions deploy scan-receipt`
- [x] Deploy extras-estimate edge function: `supabase functions deploy estimate-extra`
- [ ] Add `EXPO_PUBLIC_USDA_API_KEY` to `.env.local` (free key from api.data.gov — falls back to rate-limited DEMO_KEY without it)

## 📱 On-device verification (can't test camera/native scroll in simulator/jest)
- [ ] Onboarding "You're all set" — logo/circle sizing after the latest tweak
- [ ] Scan-while-shopping loop — keep-scanning toggle reopens camera cleanly, remember-off skips My Foods save
- [ ] Unified home scroll — whole page scrolls as one, nav + FAB stay pinned
- [ ] "Link a barcode" from inside the Add sheet — confirm the native scanner launches over the still-open sheet without an iOS "presentation in progress" conflict (see nutrition-entry plan, Task 8). If it conflicts, switch that one flow to CameraView's inline scanner.

## 🔭 Nice to have / deferred
See `docs/ROADMAP.md` for the full feature list. Near-term:
- [ ] Real macro data for pantry staples (currently kcal-derived estimates)
- [ ] In-app change email/password UI + account-delete confirmation
- [ ] Surface macro tracking (data + `ringArcs`/`itemSharePct` already exist)
