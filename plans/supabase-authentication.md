# Supabase Authentication Implementation Plan

## Summary

Add Google OAuth authentication via Supabase Auth to the Modular Terrain Creator. Users sign in with Google, get their own isolated maps, and can be banned by admins via the Supabase dashboard. Deployed on Vercel + Supabase free tiers.

([spec: Authentication](../specs/authentication.md))

## Phase 1: Database & Supabase Configuration

- [x] Create migration: `profiles` table with `id` (UUID, PK, references `auth.users`), `email`, `display_name`, `avatar_url`, `role` (default `'user'`), `is_active` (default `true`), `created_at`, `updated_at` ([spec: Database Schema](../specs/authentication.md#database-schema))
- [x] Create database trigger function `handle_new_user()` that auto-inserts a profile row when a new user signs up via `auth.users` (copies email, display_name from `raw_user_meta_data`, avatar_url from Google metadata)
- [x] Create migration: delete all existing maps, add `user_id UUID NOT NULL REFERENCES profiles(id)` column to `maps` table, drop the old "allow all" RLS policy
- [x] Create RLS policies for `profiles`: users can `SELECT` their own row (`id = auth.uid()`), admins can `SELECT`/`UPDATE` all rows (check role via subquery on profiles) ([spec: RLS Policies](../specs/authentication.md#rls-policies))
- [x] Create RLS policies for `maps`: users can `SELECT`, `INSERT`, `UPDATE`, `DELETE` only where `user_id = auth.uid()`; `INSERT` must enforce `user_id = auth.uid()` via `WITH CHECK`
- [ ] **Manual step (documented):** Enable Google OAuth provider in Supabase Dashboard → Authentication → Providers → Google. Configure OAuth credentials from Google Cloud Console. Set redirect URL to `<SUPABASE_URL>/auth/v1/callback`

## Phase 2: Supabase Client Refactor

- [x] Install `@supabase/ssr` package
- [x] Create `src/lib/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] Create `src/lib/supabase/server.ts` — server client using `createServerClient` from `@supabase/ssr` with cookie read/write handling for Next.js App Router
- [x] Update `src/lib/supabase.ts` — keep type exports (`DbMap`, `DbPieceShape`, etc.) but re-export client from new `client.ts` for backward compatibility. Add `user_id` field to `DbMap` interface
- [x] Find and update all files importing the Supabase client to ensure they work with the new setup (search for `import.*supabase`)

## Phase 3: Middleware & Auth Routes

- [x] Create `src/middleware.ts` — on every request: refresh Supabase session from cookies, if no session redirect to `/login`, if session exists fetch profile and check `is_active`, if banned redirect to `/suspended`. Exclude `/login`, `/auth/callback`, `/suspended`, and static assets from protection ([spec: Session Check](../specs/authentication.md#session-check-every-page-load))
- [x] Create `src/app/auth/callback/route.ts` — `GET` handler that exchanges the OAuth `code` query param for a Supabase session using `supabase.auth.exchangeCodeForSession(code)`, then redirects to `/` ([spec: Sign In](../specs/authentication.md#sign-in))
- [x] Create `src/app/login/page.tsx` — simple landing page with app name, brief tagline, and "Sign in with Google" button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })` ([spec: Landing Page](../specs/authentication.md#landing-page))
- [x] Create `src/app/suspended/page.tsx` — "Your account has been suspended" message with sign-out button ([spec: Banned Users](../specs/authentication.md#banned-users))

## Phase 4: App Integration

- [x] Create `src/hooks/useAuth.ts` — hook returning `{ user, profile, isLoading, signOut }`. Uses browser Supabase client to get session and fetch profile from `profiles` table. Listens to `onAuthStateChange` for real-time session updates
- [x] Update map save/load logic to include `user_id = auth.uid()` — update the store or service that calls `supabase.from('maps').insert(...)` and `supabase.from('maps').select(...)` to include `user_id`. RLS handles filtering, but `INSERT` must include the field
- [x] Add user info display (avatar + name) and sign-out button to the app header/navigation area
- [x] Update `src/app/layout.tsx` or top-level layout to wrap app in auth context if needed, or ensure `useAuth` hook is available throughout the app

## Build Verification

- [x] Project builds successfully with `npm run build` — no TypeScript errors, all pages compile

## Verification (requires live Supabase + Google OAuth configured)

- [ ] Unauthenticated user visiting any route gets redirected to `/login`
- [ ] Google OAuth sign-in flow works end-to-end (click → Google → callback → app)
- [ ] New user gets a `profiles` row auto-created with role `user` and `is_active = true`
- [ ] User can create a map and it's saved with their `user_id`
- [ ] User only sees their own maps (not maps from other users)
- [ ] Setting `is_active = false` in Supabase dashboard causes user to see suspended page
- [ ] Sign-out works and redirects to login page
- [ ] App works correctly on Vercel deployment (cookies, OAuth redirect URLs)
- [ ] RLS policies block direct API access to other users' maps
