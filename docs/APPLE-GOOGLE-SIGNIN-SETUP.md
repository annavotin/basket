# Sign in with Apple + Google — manual setup checklist

The app code for native Apple and Google sign-in is done and tested. What remains is the
account/dashboard configuration that cannot be done from the repo, plus a native rebuild.
Work through the steps in order. Where a real value is already known it is pre-filled.

Known project values:

| Thing | Value |
| --- | --- |
| iOS bundle identifier | `com.annavotin.batchapp` |
| Supabase project | `batch` |
| Supabase project ref | `ezbmagbhgyqodsykatoa` |
| Supabase auth callback URL | `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback` |
| App URL scheme (already in `app.json`) | `batch` |

> The **callback URL** above is the single redirect URI both Apple and Google need. Copy it
> exactly. It is also shown in the Supabase dashboard under each provider.

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

### 1d. Collect these three values for Supabase
- **Team ID** — top-right of the Apple Developer portal (membership page), 10 chars.
- **Key ID** — from step 1c.
- **Services ID** — `com.annavotin.batchapp.signin` from step 1b.
- The **.p8** file contents.

Supabase can generate the required client secret (a signed JWT) from those. See step 3.

---

## 2. Google Cloud (console.cloud.google.com)

You need **two** OAuth clients: an **iOS** client (used by the native SDK on device) and a
**Web** client (used by Supabase to verify the token, and passed to the SDK as `webClientId`).

### 2a. OAuth consent screen
1. Create/select a project (e.g. `Batch`).
2. **APIs & Services > OAuth consent screen** > External > fill app name, support email,
   developer email. Add yourself as a Test user while in testing. Save.

### 2b. iOS OAuth client
1. **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
2. Application type: **iOS**.
3. Bundle ID: `com.annavotin.batchapp`.
4. Create. Record the **iOS client ID** — it looks like
   `1234567890-abc123.apps.googleusercontent.com`.
   - This is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - Its **reversed** form is the URL scheme:
     `com.googleusercontent.apps.1234567890-abc123`
     (take the client ID, drop `.apps.googleusercontent.com`, prefix
     `com.googleusercontent.apps.`).

### 2c. Web OAuth client
1. Create Credentials > OAuth client ID > Application type: **Web application**.
2. Name: `Batch Web`.
3. **Authorized redirect URIs:** `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback`
4. Create. Record the **Web client ID** and **Web client secret**.
   - The Web client ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the native SDK needs it to mint
     an ID token Supabase will accept), and also goes into Supabase's Google provider.

---

## 3. Supabase dashboard (Auth > Providers)

Project `batch` (ref `ezbmagbhgyqodsykatoa`) > **Authentication > Providers**.

### 3a. Apple
1. Enable **Apple**.
2. **Client IDs:** add both the bundle ID `com.annavotin.batchapp` (native app) and the
   Services ID `com.annavotin.batchapp.signin` (comma-separated).
3. **Secret Key (for OAuth):** either paste a pre-generated JWT, or use Supabase's generator
   with Team ID, Key ID, Services ID, and the `.p8` contents from step 1.
4. Confirm the callback URL shown matches
   `https://ezbmagbhgyqodsykatoa.supabase.co/auth/v1/callback`. Save.

### 3b. Google
1. Enable **Google**.
2. **Client ID:** the **Web** client ID from step 2c.
3. **Client Secret:** the **Web** client secret from step 2c.
4. Under **Authorized Client IDs** (skip-nonce / native token verification), add BOTH the
   iOS client ID (2b) and the Web client ID (2c) so tokens minted on-device are accepted.
5. Save.

> Native `signInWithIdToken` on iOS presents an Apple-issued nonce we hash locally; no extra
> Supabase nonce config is needed for Apple. For Google the ID token is verified against the
> authorized client IDs above.

---

## 4. Environment variables

Add to `.env.local` (git-ignored — do NOT commit real IDs). Only the two Google IDs are read
by the app at runtime; the reversed iOS ID is a build-time value for `app.json`.

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-web456.apps.googleusercontent.com
```

Then edit **`app.json`** and replace the placeholder in the google-signin plugin's
`iosUrlScheme` with the **reversed iOS client ID** from step 2b:

```jsonc
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.1234567890-abc123" }
]
```

(`iosUrlScheme` is baked into the native project at prebuild time, so it must be a literal
string in `app.json`, not an env var. It is not a secret.)

Apple needs no client-side env vars — everything Apple lives in the Apple Developer portal and
Supabase.

---

## 5. Native rebuild + resubmit

The two new packages (`expo-apple-authentication`,
`@react-native-google-signin/google-signin`) are **native modules**. They do NOT activate under
Expo Go or a hot reload — you must regenerate the native project and rebuild:

1. Bump `ios.buildNumber` in `app.json` (currently `"2"` — App Review rejects a duplicate).
2. Rebuild:
   ```
   npx expo run:ios --configuration Release
   ```
   (If codegen/autolinking complains, clean `ios/`/DerivedData and re-run — see MEMORY iOS
   build gotchas.)
3. On device, verify:
   - Continue with Apple → name captured on first sign-in, session persists after relaunch.
   - Continue with Google → signs in, session persists.
   - Cancel each sheet → no scary error, you stay on the screen.
   - A forced failure surfaces a visible message (not a dead button).
4. Archive and resubmit to App Review. In the review notes, mention that the previously dead
   social buttons now perform real native sign-in.

---

## Where the code lives (for reference)

- `src/services/auth.ts` — `createSupabaseAuth(client, { getAppleToken, getGoogleToken })`.
  Native calls are injected (defaulting to the real `expo-apple-authentication` /
  `@react-native-google-signin` calls) so they are mockable in Jest.
- `src/components/settings/AuthSheet.tsx` — surfaces errors, Apple button iOS-only.
- `src/components/OnboardingScreen.tsx` + `App.tsx` — onboarding social buttons now call the
  real flows and drop into the app signed-in.
- `app.json` — `ios.usesAppleSignIn`, top-level `scheme: "batch"`, and both config plugins.
