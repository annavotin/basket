# Batch — Roadmap

New features and larger improvements, curated from a full code review (2026-07-01) and the
product shape. Ordered roughly by value-to-effort within each section. This is a menu, not a
commitment. See `CODE-REVIEW-2026-07-01.md` for the small bug/cleanup backlog.

---

## Features

### High leverage (some scaffolding already exists)

1. **Macro tracking, surfaced.** `Preferences.macroTargets` and per-item/meal `macros` already
   exist in the data model, and `utils/nutrition.ts` has **unused `ringArcs` / `itemSharePct`
   exports** that look built for exactly this. Wire up protein/carb/fat progress against targets
   (rings or bars) on the home surface and in item detail. *Low-ish effort, high perceived value —
   this is the most "already half-built" feature.*

2. **Complete Sign in with Apple.** `services/auth.ts` has deferred Apple/Google stubs. Apple
   Sign-In is commonly expected for App Store apps that offer any social/third-party login and is a
   smoother onboarding than email+password. *Medium effort; check App Store guideline 4.8 implications.*

3. **Cycle templates / recurring prep.** Let a user save a cycle as a template and auto-roll it into
   the next period (carry-over already exists as the manual version). Reduces the main recurring
   chore. *Medium effort.*

4. **Period summary & insights.** End-of-cycle recap: average daily kcal vs goal, adherence, macro
   split, trend across recent cycles. The data is all there; this is presentation. *Medium effort.*

### Platform integration

5. **Apple Health (HealthKit).** Write logged calories/macros to Health; optionally read body weight.
   Strong fit for an iOS calorie app. *Medium–large effort (native module + permissions + privacy labels).*

6. **Home-screen / Lock-screen widget + Live Activity.** "Calories remaining today" at a glance is a
   top-requested pattern for trackers. *Large effort (WidgetKit).*

7. **Reminders / notifications.** Prep-day reminder, "log your extras" nudge, end-of-cycle summary.
   *Medium effort; needs a notification-permission + settings toggle.*

### Product differentiators (lean into "track by the shop, not the spoonful")

8. **Cost tracking.** Receipts already carry prices — capture spend per cycle and cost-per-calorie.
   Ties directly to Batch's positioning and nothing else in the category does it well. *Medium effort.*

9. **Shopping list / plan export.** Turn a planned cycle into a shareable shopping list or PDF.
   *Small–medium effort.*

10. **Offline receipt queue.** If a receipt scan fails (offline / edge-function error), queue the
    image and retry on reconnect instead of dropping to manual entry. *Small–medium effort.*

### Considered but with caveats

- **TDEE / goal calculator in onboarding.** Today the user types their own goal (and the App Store
  data-collection posture reflects "no recommendations"). Adding a height/weight/activity calculator
  would change that posture and the privacy labels — worth it, but do it deliberately, and keep it
  optional. *Medium effort + store-metadata update.*
- **iPad support.** Currently iPhone-only (`TARGETED_DEVICE_FAMILY = "1"`). Re-enabling means an iPad
  layout pass and iPad screenshots. Defer unless there's demand.

---

## Technical improvements (areas to improve)

### Correctness & robustness
- **Sync conflict story.** The engine is wall-clock LWW with no sequence numbers and no user-visible
  conflict/error surfacing (see the "known limitations" in the code review). If multi-device becomes a
  priority, add a monotonic per-record counter and a real sync-status/error state in the UI (offline
  vs. auth-expired vs. schema error are currently indistinguishable to the user).
- **Real macro data for pantry staples.** Currently kcal-derived estimates (already in `TODO.md`).
- **Midnight/date-rollover** and **`runSync` re-entrancy** — small correctness fixes (tracked in the
  code review; in progress).

### Architecture & maintainability
- **Split `App.tsx` (~1180 lines).** Extract the sync orchestration into a hook (`useSync`), the
  derived-state block into `useMemo`/a hook, and the handler cluster into feature modules. Biggest
  single readability win.
- **Shared `<BottomSheet>`.** 7+ sheets duplicate the modal/scrim/grab-handle skeleton — extract one
  wrapper (verify on-device; sheet layout is fragile). Then dedupe the **three stepper**
  implementations onto `settings/Stepper`.
- **Design-token migration.** `ReceiptReviewSheet`, `AddFab`, `ExtraMealSheet` still use legacy
  palette tokens / no `fonts.*`; bring them onto current tokens.
- **Dead code cleanup.** Remove unused font deps + `expo-status-bar` (in progress); relocate
  `mockReceipts`/`mockProducts` data to test fixtures; resolve the unused `ringArcs`/`itemSharePct`/
  `dateToIndex` exports (wire into feature #1 or delete).

### Quality bar
- **Accessibility pass** — VoiceOver labels on icon-only buttons, Dynamic Type, contrast on the
  faint-moss text, larger hit targets.
- **Empty / offline / error states** — first-run empty states, offline banners, retry affordances.
- **Test coverage** — App.tsx integration flows and sync edge cases (tie/merge/tombstone) are
  thin relative to their risk.
- **Debug logging** — gate `console.log('[sync] …')` behind `__DEV__` and stop logging the account
  email.
