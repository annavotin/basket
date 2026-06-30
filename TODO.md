# Batch — todo

## App Store / release
- [ ] Submit to App Store (TestFlight first)
- [ ] Verify privacy + terms pages load correctly: https://annavotin.github.io/batch-app/privacy.html and https://annavotin.github.io/batch-app/terms.html
- [ ] Deep-link email confirmation flow (Supabase email confirmation is currently OFF for testing; need a real redirect URL before going live)

## Native rebuild needed
One `npx expo run:ios --device <id> --configuration Release` clears all of these:
- [ ] New app icon + splash screen (files are ready, just need a rebuild)
- [ ] Frosted nav blur (`expo-blur` — currently a plain translucent View, reverted after hot-reload crash)
- [ ] Receipt image downscaling (`expo-image-manipulator` — installed but native module needs rebuild to activate)

## Supabase / backend
- [ ] Run SQL migration in Supabase dashboard (`supabase/migrations/0001_init.sql`)
- [ ] Run `alter table public.extra_meals add column macros jsonb;` if the DB already exists
- [ ] Set server secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Deploy receipt-scan edge function: `supabase functions deploy scan-receipt`
- [ ] Add `EXPO_PUBLIC_USDA_API_KEY` to `.env.local` (free key from api.data.gov — falls back to rate-limited DEMO_KEY without it)

## On-device verification needed
(Can't test camera/native scroll in simulator/jest)
- [ ] Scan-while-shopping loop — keep-scanning toggle reopens camera cleanly, remember-off skips My Foods save
- [ ] Unified home scroll — whole page scrolls as one, nav + FAB stay pinned, rows clear the pinned bar
- [ ] Basket Prototype redesign — eyeball fonts (Hanken Grotesk / Space Grotesk), colours, prep-selector pills, budget card

## Nice to have / deferred
- [ ] Task 12: in-app change email/password UI + account-delete confirmation
- [ ] Real macro data for pantry staples (currently kcal-derived estimates)
- [ ] Push local main to origin (`annavotin/batch-app` or `annavotin/basket` — confirm remote name first)
