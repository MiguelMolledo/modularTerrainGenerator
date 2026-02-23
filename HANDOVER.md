# Handover - Supabase Authentication Setup

## Current Status
Google OAuth authentication is **fully implemented and working locally**. All code is done, build passes.

## What's Working
- Google OAuth sign-in via Supabase Auth
- Auto-creation of user profile on first sign-in (via DB trigger)
- Middleware redirects unauthenticated users to `/login`
- Banned users (`is_active = false`) get redirected to `/suspended`
- User sees only their own maps (RLS policies)
- User avatar + name displayed in app header with sign-out button

## Google OAuth Config
- **Google Cloud Console project** with OAuth client
- OAuth consent screen is in **testing mode** (only test users can sign in)
- Active OAuth Client ID: `789365929645-li20plmedctu64bmjgvimtqvuq6avofa.apps.googleusercontent.com`

### Google OAuth Credentials (in Google Cloud Console)
- **Authorized JavaScript origins:** `http://127.0.0.1:54321`
- **Authorized redirect URIs:**
  - `http://127.0.0.1:54321/auth/v1/callback` (local)
  - `https://zgvteidzhuysujeuampp.supabase.co/auth/v1/callback` (production)

## How to Start Locally

```bash
# 1. Open Docker Desktop and wait for it to be ready

# 2. Start Supabase
supabase start

# 3. Apply migrations (required after supabase stop, or first time)
supabase db reset

# 4. Start the app
npm run dev
```

App runs at **http://localhost:4200**

## Local URLs
| Service | URL |
|---|---|
| App | http://localhost:4200 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio (DB UI) | http://127.0.0.1:54323 |
| Mailpit (email testing) | http://127.0.0.1:54324 |

## Admin & User Management
Done via **Supabase Studio** (http://127.0.0.1:54323) > Table Editor > `profiles`:
- **Make admin:** Set `role` to `admin`
- **Ban user:** Set `is_active` to `false`
- **Unban user:** Set `is_active` back to `true`

## Key Config Files
| File | Purpose |
|---|---|
| `.env.local` | Google OAuth credentials, Supabase URL, API keys |
| `supabase/config.toml` | Local Supabase config, Google provider setup, `site_url` |
| `supabase/migrations/` | All DB migrations (profiles, maps user_id, RLS policies) |
| `plans/supabase-authentication.md` | Full implementation plan with checklist |

## Gotchas / Lessons Learned
- `supabase stop` **wipes the database** — always run `supabase db reset` after restarting
- `config.toml` had default `site_url` on port 3000 — changed to `http://localhost:4200`
- Google OAuth redirect URI **must use `127.0.0.1`** not `localhost` (that's what Supabase sends)
- There's a first OAuth client that was created by mistake — the second one is the active one

## What's Left (Production)
1. Push migrations to hosted Supabase (`supabase db push` or run SQL in dashboard)
2. Enable Google provider in Supabase Dashboard > Authentication > Providers
3. Set Vercel environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Publish Google OAuth app (consent screen > Publish) to allow all users
5. Run through verification checklist in `plans/supabase-authentication.md`
