# Sign in with Apple — manual setup checklist

The app code for native Apple sign-in is done and tested. What remains is the account/dashboard
configuration that cannot be done from the repo, plus a native rebuild. Work through the steps
in order. Where a real value is already known it is pre-filled.

(Google sign-in was scrapped for now — the code, native package, and config plugin for it were
removed. If you want it back later, `git log` for "Sign in with Apple and Google" to find the
prior implementation to revive.)

Known project values:

| Thing | Value |
| --- | --- |
| iOS bundle identifier | `com.annavotin.batchapp` |
| Supabase project | `batch` |
| Supabase project ref | `ezbmagbhgyqodsykatoa` |
| Supabase auth callback URL | `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback` |

---

## 1. Apple Developer (developer.apple.com)

Apple's native flow needs (a) the capability on the App ID and (b) a Services ID + signing
key so Supabase can validate the identity token.

### 1a. Enable the capability on the App ID
1. Apple Developer > **Certificates, Identifiers & Profiles** > **Identifiers**.
2. Open the App ID for `com.annavotin.batchapp`.
3. Tick **Sign in with Apple**, save. (Leave it as a primary App ID.)

### 1b. Create a Services ID (this becomes Supabase's Apple "Client ID")
1. Identifiers > **+** > **Services IDs** > Continue.
2. Description: `Batch Web Auth`; Identifier: `com.annavotin.batchapp.signin`
   (any reverse-DNS string that is NOT the bundle ID — record whatever you choose).
3. After creating, open it, tick **Sign in with Apple**, click **Configure**:
   - Primary App ID: `com.annavotin.batchapp`.
   - **Domains and Subdomains:** `ezbmagbhgyqodsykatoa.supabase.co`
   - **Return URLs:** `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback`
   - Save / Continue.

### 1c. Create a Sign in with Apple key (.p8)
1. **Keys** > **+**.
2. Name: `Batch Sign in with Apple`; tick **Sign in with Apple**; Configure > primary App ID
   `com.annavotin.batchapp`; Continue > Register.
3. **Download the `.p8` file now** (one download only) and note the **Key ID**.

### 1d. Collect these values for Supabase
- **Team ID** — top-right of the Apple Developer portal (membership page), 10 chars.
- **Key ID** — from step 1c.
- **Services ID** — `com.annavotin.batchapp.signin` from step 1b.
- The **.p8** file contents.

---

## 2. Supabase dashboard (Auth > Providers)

Project `batch` (ref `ezbmagbhgyqodsykatoa`) > **Authentication > Providers** > **Apple**.

1. Enable **Apple**.
2. **Client IDs:** add both the bundle ID `com.annavotin.batchapp` (native app) and the
   Services ID `com.annavotin.batchapp.signin` (comma-separated).
3. **Secret Key (for OAuth):** paste in the Team ID, Key ID, Services ID, and the `.p8` file
   contents from step 1 — Supabase generates and rotates the signed JWT for you from those,
   you don't need to hand-craft it yourself.
4. Confirm the callback URL shown matches
   `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback`. Save.

> Native `signInWithIdToken` on iOS presents an Apple-issued nonce we hash locally — no extra
> Supabase nonce configuration is needed.

---

## 3. Native rebuild + resubmit

`expo-apple-authentication` is a **native module**. It does NOT activate under Expo Go or a
hot reload — you must regenerate the native project and rebuild:

1. Bump `ios.buildNumber` in `app.json` (currently `"2"` — App Review rejects a duplicate).
2. Rebuild:
   ```
   npx expo run:ios --configuration Release
   ```
   (If codegen/autolinking complains, clean `ios/`/DerivedData and re-run.)
3. On device, verify:
   - Continue with Apple → name captured on first sign-in, session persists after relaunch.
   - Cancel the sheet → no scary error, you stay on the screen.
   - A forced failure surfaces a visible message (not a dead button).
4. Archive and resubmit to App Review. In the review notes, mention that the previously dead
   "Continue with Apple" button now performs real native sign-in (and that "Continue with
   Google" has been removed rather than left broken).

---

## Where the code lives (for reference)

- `src/services/auth.ts` — `createSupabaseAuth(client, { getAppleToken })`. The native call is
  injected (defaulting to the real `expo-apple-authentication` call) so it's mockable in Jest.
- `src/components/settings/AuthSheet.tsx` — surfaces errors, Apple button iOS-only.
- `src/components/OnboardingScreen.tsx` + `App.tsx` — onboarding's social button calls the
  real flow and drops into the app signed in.
- `app.json` — `ios.usesAppleSignIn` and the `expo-apple-authentication` config plugin.
