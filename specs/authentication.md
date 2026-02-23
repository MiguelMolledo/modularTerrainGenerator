# Authentication

Authentication system for Modular Terrain Creator using Supabase Auth with Google OAuth and role-based access control.

## Technical Stack

- **Auth provider**: Supabase Auth (Google OAuth)
- **Database**: Supabase (PostgreSQL) — already in use
- **Sessions**: Supabase session management (JWT via `@supabase/ssr`)
- **Deployment**: Vercel free tier + Supabase free tier

## User Capabilities

### All Active Users
- Users can sign in with Google OAuth
- Users can sign out
- Users can view and edit only their own maps
- Users can access all app features (designer, inventory, 3D viewer, AI, export) when active

### Admins
- Admins can ban/unban users by toggling `is_active` in Supabase dashboard
- Admins can promote users to admin by changing `role` in Supabase dashboard
- Admins have full access regardless of `is_active` status

### Banned Users
- Banned users see a "Your account has been suspended" page
- Banned users cannot access any app functionality
- Ban status is checked on every page load via middleware

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full access, manages users via Supabase dashboard |
| `user` | Standard access to all features when active |

- New users default to `user` role
- Admins are promoted manually in Supabase dashboard

## Database Schema

### Profiles Table (new)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- Auto-created via database trigger when a user signs up through Supabase Auth
- `id` matches the Supabase `auth.users` UUID

### Maps Table Changes

- Add `user_id UUID REFERENCES profiles(id)` column
- Delete all existing maps (fresh start)
- Update RLS policies for user isolation

### RLS Policies

**Profiles:**
- Users can SELECT their own profile
- Admins can SELECT and UPDATE all profiles

**Maps:**
- Users can SELECT, INSERT, UPDATE, DELETE only rows where `user_id = auth.uid()`
- INSERT must set `user_id = auth.uid()`

## Authentication Flows

### Sign In
1. User clicks "Sign in with Google" on landing page
2. Supabase redirects to Google OAuth consent screen
3. Google redirects back to `/auth/callback`
4. Supabase creates session, trigger creates profile row
5. Middleware checks `is_active` on profile
6. If active → redirect to main app (`/`)
7. If banned → redirect to `/suspended`

### Sign Out
1. User clicks sign out
2. Supabase session destroyed
3. Redirect to landing page

### Session Check (every page load)
1. Middleware reads Supabase session from cookies
2. No session → redirect to `/login`
3. Session exists → fetch profile, check `is_active`
4. `is_active = false` → redirect to `/suspended`
5. `is_active = true` → allow access

## Routes

| Route | Access |
|-------|--------|
| `/login` | Public — landing page with Google sign-in |
| `/auth/callback` | Public — OAuth callback handler |
| `/suspended` | Authenticated but banned users only |
| All other routes | Authenticated + active users only |

## Landing Page

- App name and brief tagline
- Google sign-in button (Supabase OAuth)
- Clean, minimal design using existing Tailwind setup
- Redirect to app if already authenticated

## Supabase Client Setup

Two clients needed:
- **Browser client** (`createBrowserClient`) — for client components
- **Server client** (`createServerClient`) — for server components and middleware

Both from `@supabase/ssr` package for proper cookie handling with Next.js.

## Constraints

- Google OAuth only (no email/password)
- Free tier limits: 50,000 monthly active users (Supabase), sufficient for this app
- Admin management is dashboard-only (no admin UI in the app for now)
- All existing maps will be deleted when auth migration runs

## Related Specs

- [Map Persistence](./map-persistence.md) — maps now scoped to authenticated user
- [API Keys](./api-keys.md) — external API keys for AI services

## Source

- `src/lib/supabase.ts` — Supabase client (to be updated)
- `src/lib/supabase/` — new: browser + server clients
- `src/app/login/` — landing/login page
- `src/app/auth/callback/` — OAuth callback route
- `src/app/suspended/` — suspended account page
- `src/middleware.ts` — route protection + session refresh
