# Email confirmation via deep-link auto-confirm

Date: 2026-07-08

## Problem

Today `AuthService.signUp()` returns an account and `AuthSheet` immediately calls
`onAuthed()`, treating the user as signed in. Once Supabase requires email
confirmation, `signUp` returns a **user with a null session** — the app would
believe it is signed in but hold no token, and sync would silently fail.

We need to (a) enable confirmation server-side, (b) make the client recognize the
"pending confirmation" state, and (c) handle the confirmation deep link that
returns the user with a real session.

## Flow (PKCE)

1. User taps "Create account" → `signUp(email, password)` which passes
   `emailRedirectTo: 'batch://auth-callback'`. Supabase stores a PKCE
   code-verifier in SecureStore and sends the confirmation email. No session yet.
2. `AuthSheet` shows a "Check your email" state (reuse the existing `sent` UI
   pattern) instead of calling `onAuthed`.
3. User taps the email link → Supabase `/verify` → redirects to
   `batch://auth-callback?code=…`.
4. App deep-link handler catches the URL, calls `exchangeCodeForSession(code)`,
   which mints a real session. Account is set and sync starts.

## Components

| File | Change |
|---|---|
| `src/services/supabase.ts` | Add `flowType: 'pkce'` to the client `auth` config |
| `src/services/auth.ts` | `signUp` passes `emailRedirectTo`; return a `pending: true` variant when the returned session is null. Add `completeFromUrl(url)` that parses `code` and calls `exchangeCodeForSession`. Mirror new shapes in `stubAuth`. |
| `src/components/settings/AuthSheet.tsx` | On a `pending` signup result, show the "check your email" state instead of `onAuthed`. |
| `App.tsx` | Deep-link listener (`Linking.getInitialURL` + `Linking.addEventListener('url')`) → `auth.completeFromUrl(url)` → refresh account. Add `supabase.auth.onAuthStateChange` to keep `account` in sync when confirmation completes. |
| `app.json` | Scheme `batch` already present — no change. |

## Type changes

`AuthResult` gains a pending variant for signup:

```ts
type AuthResult =
  | { ok: true; account: Account }
  | { ok: true; pending: true; email: string }   // confirmation email sent, no session
  | { ok: false; error: string; cancelled?: boolean }
```

`AuthService` gains:

```ts
completeFromUrl(url: string): Promise<AuthResult>
```

`signIn` should surface Supabase's "Email not confirmed" error verbatim via the
existing `friendlyError` path (no special handling needed).

## Invariants respected

- Device-local prefs untouched; only auth flow changes.
- No AsyncStorage key renames.
- Apple sign-in path unchanged (already returns a session).
- Soft-delete / markDirty rules untouched.

## Known limitation

The PKCE verifier lives on the device that started signup, so the confirmation
link must be opened on the **same device**. Standard for mobile-first apps.

## Testing

- Unit tests against `stubAuth` for the pending-signup and `completeFromUrl`
  paths (stub returns `pending` for a new email; `completeFromUrl` returns an
  account for a well-formed `code` URL, error otherwise).
- `npx tsc --noEmit` and `npm test` green.

## Supabase dashboard settings (manual, post-implementation)

- Authentication → Providers → Email: enable **Confirm email**.
- Authentication → URL Configuration → Redirect URLs: add `batch://auth-callback`.
- Authentication → Email Templates → Confirm signup: ensure the link uses
  `{{ .ConfirmationURL }}`.

## No em dashes in user-facing copy.
