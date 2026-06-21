# Account Management (Task 12) — Design

**Date:** 2026-06-15
**Plan:** continues `docs/superpowers/plans/2026-06-12-accounts-cloud-sync.md` (final task)

## Goal
Fill in the three stubbed account/about handlers in Settings so the app meets the
account-management bar for an App Store submission: change password, in-app account
deletion (that also wipes local data), and Privacy/Terms links.

The signed-in Settings UI already exists (avatar, name/email, a stubbed "Manage account"
row, a "Delete account" row wired to a `ConfirmDialog`, and About rows for Privacy/Terms
with empty `onPress`). This task wires those up; it does not redesign the screen.

## Scope decisions (confirmed)
- **Password only** for account changes — no in-app email change this round (it's tangled
  with the deferred email-confirmation flow).
- **Delete wipes local** — deleting the account resets the device to empty.
- **Placeholder URLs** for Privacy/Terms — real pages swapped in before submission.

## A. Change password
- New `AuthService.changePassword(newPassword: string): Promise<{ ok: boolean; error?: string }>`.
  - `createSupabaseAuth`: `await client.auth.updateUser({ password: newPassword })`; maps
    error via the existing `friendlyError`. Works against the active session; Supabase does
    not require the current password for `updateUser`.
  - `stubAuth`: returns `{ ok: true }` (local-only mode).
- New `src/components/settings/ChangePasswordSheet.tsx` — bottom sheet styled like
  `AuthSheet` (and using the same bottom-anchored scrim pattern):
  - Fields: **New password**, **Confirm password**; **Save** button.
  - Validation: min length 6; the two fields must match. Invalid → inline error, no network
    call.
  - Submit → `authService.changePassword`; on `ok` show a brief "Password updated" state then
    close; on error show the friendly message.
- `SettingsScreen`: rename the "Manage account" row to **"Change password"** (🔑) and open
  the sheet. Pass `authService` through (already threaded for `AuthSheet`).

## B. Delete account → wipe local
- The `ConfirmDialog` + `onDeleteAccount` already exist. The cloud side (`delete_account()`
  RPC + `signOut`) is in `auth.ts`.
- Extend `App.tsx`'s `onDeleteAccount` so after `authService.deleteAccount()` it resets the
  app to empty: clear cycles/extras/pantry/dailyGoal/prefs (reuse the existing `handleClearAll`
  reset path) **and** remove the sync metadata keys so a future sign-in starts clean:
  `basket:syncQueue:v1`, `basket:syncCursors:v1`, `basket:adopted:v1`.
- Add a small `clearSyncMetadata()` helper (AsyncStorage `multiRemove` of those keys) next to
  the sync services, so the key list lives with the code that owns it.

## C. Privacy / Terms links
- Wire both About rows to `Linking.openURL(...)` with placeholder constants
  (`PRIVACY_URL`, `TERMS_URL`, e.g. `https://basket.app/privacy`), marked `// TODO: real URL
  before submission`.

## Files
- `src/services/auth.ts` — `changePassword` on the interface, `createSupabaseAuth`, `stubAuth`.
- `src/components/settings/ChangePasswordSheet.tsx` — new sheet.
- `src/components/SettingsScreen.tsx` — row rename + sheet wiring + `Linking` handlers.
- `App.tsx` — delete handler also wipes local + sync metadata.
- `src/services/sync-cursors.ts` (or a small new helper) — `clearSyncMetadata()`.

## Testing
- `auth.test.ts`: `changePassword` success and error (mock `client.auth.updateUser`); stub returns ok.
- `ChangePasswordSheet.test.tsx`: rejects mismatch and too-short (no network call); valid input
  calls `changePassword` and closes on success; surfaces an error.
- `clearSyncMetadata` removes exactly the three keys.

## Out of scope
- In-app email change, re-authentication before sensitive actions, real Privacy/Terms content,
  Apple/Google social sign-in (still deferred stubs).
