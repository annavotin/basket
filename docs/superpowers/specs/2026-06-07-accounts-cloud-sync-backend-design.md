# Accounts + Cloud Sync — Backend Design

Date: 2026-06-07
Status: Design (backend only; frontend/UI to be designed separately via Claude Design)

## Context

"Basket" is currently a **local-only** Expo/React Native app. All data lives in
`AsyncStorage` behind a clean per-key service (`src/services/storage.ts`): cycles, extras,
pantry, daily goal, and (planned) a `preferences` object. The user wants **sign-in + cloud
sync** so data follows them across devices. This is the deferred, backend-heavy half of the
Settings work. The Settings UI and auth screens are being designed elsewhere; this document
specifies the **backend, data model, auth, and client sync architecture** only.

Design priorities, in order: **local-first (app keeps working offline)**, simple to operate,
cheap at small scale, and App Store compliant (Apple requires in-app account deletion and a
"Sign in with Apple" option when other social logins are offered).

## Recommended stack: Supabase

**Recommendation: Supabase** (managed Postgres + Auth + Row Level Security + optional
Realtime). Rationale:
- First-class Expo/React Native SDK (`@supabase/supabase-js`), email/password + OAuth
  (Apple, Google) + magic links out of the box.
- Row Level Security lets us enforce "a user only sees their own rows" at the database,
  so the client only ever uses the public anon key — no custom server needed.
- Postgres gives real relational queries and `updated_at`/`deleted_at` columns for sync.
- Realtime channels available later for live cross-device updates.
- Generous free tier; predictable pricing.

**Alternative:** Firebase (Auth + Firestore) — also viable and offline-capable, but the
data model is document-based and security rules are clunkier for relational data. Choose
Supabase unless there's a reason to prefer Firebase.

No bespoke backend server is required for v1 — Supabase + RLS is the backend.

## Auth

- **Methods:** email/password, **Sign in with Apple** (mandatory for iOS), **Google**.
  Magic-link optional.
- **Session storage:** persist the Supabase session in `expo-secure-store` (NOT
  AsyncStorage) so tokens are encrypted at rest. Configure the supabase client with a
  SecureStore adapter and `autoRefreshToken`.
- **Account management (required):** change email/password, and **delete account**
  (server-side cascade delete of all the user's rows) — Apple App Store requirement.
- New `src/services/auth.ts`: `signUp`, `signInWithPassword`, `signInWithApple`,
  `signInWithGoogle`, `signOut`, `deleteAccount`, `getSession`, `onAuthStateChange`.

## Data model (Postgres, all RLS-protected)

One row-owner column `user_id uuid` on every table, defaulting to `auth.uid()`. RLS policy
on each table: `user_id = auth.uid()` for select/insert/update/delete.

- `profiles` — `user_id (PK)`, `display_name`, `avatar_url`, timestamps.
- `preferences` — `user_id (PK)`, `default_days`, `units` (jsonb), `theme`,
  `macro_targets` (jsonb), `daily_goal`, `updated_at`.
- `cycles` — `id (uuid PK)`, `user_id`, `start_date`, `end_date`, `items` (jsonb),
  `pantry_overrides` (jsonb), `updated_at`, `deleted_at`.
- `extra_meals` — `id (uuid PK)`, `user_id`, `date`, `name`, `kcal`, `updated_at`,
  `deleted_at`.
- `pantry_items` — `id (uuid PK)`, `user_id`, `name`, `emoji`, `kcal_per_100g`,
  `daily_g`, `updated_at`, `deleted_at`.

Notes:
- `items`/`pantry_overrides` stay as JSONB to mirror the current `MealPrepCycle` shape and
  avoid a premature line-item table; can normalize later if needed.
- Every syncable table carries `updated_at` (for last-write-wins) and a nullable
  `deleted_at` (soft delete, so deletions propagate to other devices).

## ID strategy

Current IDs are time-based strings (`cycle-${Date.now()}`, `extra-${Date.now()}`,
`pantry-${Date.now()}`). For multi-device these can collide. **Switch new IDs to UUIDs**
(`crypto.randomUUID()` / `expo-crypto`). On first sync, existing local string IDs are
preserved as-is (they're still unique per that device) and uploaded; only newly created
records use UUIDs going forward.

## Client sync architecture (local-first)

Keep `AsyncStorage` as the **local cache / source of truth for the UI**. Add a remote
repository and a sync coordinator on top; the existing `storage.ts` interface stays stable
so the UI layer barely changes.

New modules:
- `src/services/remote.ts` — typed CRUD against Supabase tables (pull-since, upsert,
  soft-delete).
- `src/services/sync.ts` — the coordinator:
  - **Pull:** `select * where updated_at > lastPulledAt` per table; merge into local cache.
  - **Push:** upsert locally-changed records (track a dirty set / `pendingChanges` queue in
    AsyncStorage); send soft-deletes for removed records.
  - **Conflict resolution:** **last-write-wins by `updated_at`** at the record level
    (cycles/extras/pantry) and field-document level for `preferences`. Simple and adequate
    for a single-user-multi-device app.
  - **Triggers:** on sign-in, on app foreground, after any local mutation (debounced), and
    on reconnect.
  - **Offline:** mutations always write locally first and enqueue; the queue flushes when
    online. The app is fully usable offline (preserves today's behavior).
- Store `lastPulledAt` per table and the pending-change queue in AsyncStorage.

## First-login migration (existing local-only users)

On the first successful sign-in for a device that already has local data:
1. Detect "local data exists but no remote rows for this user."
2. **Upload/merge** local cycles/extras/pantry/preferences to the account.
3. Then pull to reconcile (LWW). Show a one-time "Syncing your data…" state.

This guarantees no data loss when a returning local user creates an account.

## Phasing (each independently shippable)

1. **Auth foundation** — supabase client + SecureStore session, sign up/in/out, session
   restore on launch, auth state wired into app.
2. **Schema + RLS** — create tables, policies, `updated_at`/`deleted_at`, triggers for
   `updated_at`. (SQL migration checked into the repo.)
3. **Remote repository** — `remote.ts` CRUD with tests against a Supabase test project (or
   mocked client).
4. **Sync coordinator** — push/pull, dirty queue, soft deletes, LWW, triggers, offline.
5. **First-login migration** — merge local → remote on initial sign-in.
6. **Account management** — change email/password, **delete account** (cascade).
7. **(Optional) Realtime** — Supabase Realtime channels for live cross-device updates.

## Security & compliance

- Client uses only the **anon key**; all access controlled by **RLS** (`user_id = auth.uid()`).
- Service-role key never ships in the app.
- **Account deletion** must cascade-remove all user rows (Postgres `ON DELETE CASCADE`
  from `auth.users`, plus an RPC the client can call).
- **Privacy Policy + Terms** required once accounts collect emails (link from Settings →
  About).

## Out of scope

- Subscriptions / billing.
- Sharing data between users / multi-user features.
- Full per-food macro nutrition tracking (separate feature).

## Verification

- **Unit tests:** `auth.ts` (mock supabase client) for each method's success/error paths;
  `sync.ts` for push/pull merge, LWW resolution, soft-delete propagation, and offline-queue
  flush; `remote.ts` CRUD shape.
- **Integration (against a Supabase test project):** sign up → create data on device A →
  sign in on device B → data appears; edit on B → reflects on A after sync; delete on A →
  removed on B; offline edits flush on reconnect; delete-account wipes all rows.
- **Manual:** the offline-first guarantee — airplane mode, mutate freely, reconnect, confirm
  convergence and no data loss.
