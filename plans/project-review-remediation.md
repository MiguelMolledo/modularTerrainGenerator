# Project Review Remediation Implementation Plan

## Summary

Address all findings from the July 2026 project review, in four sequential phases ordered by risk: (1) close the security holes (unauthenticated paid API routes, open redirect, test user in production, allow-all RLS, exposed test endpoints), (2) performance wins (code-split the designer, `next/image`, config hardening), (3) code quality (lint errors, duplicated persistence, unvalidated casts, MapCanvas hot paths), and (4) testing/CI and repo hygiene. Key decisions: auth is enforced per-route via a shared `requireUser()` helper (middleware keeps skipping `/api`); user API keys stay client-side for now but move to per-session entry is deferred; RLS scoping requires adding `user_id` columns to inventory tables, done as a single migration.

## Phase 1: Security

- [ ] Create `src/lib/api/auth.ts` with a `requireUser()` helper (Supabase server client + `auth.getUser()`, returns 401 response if unauthenticated)
- [ ] Add the `requireUser()` check to every paid API route: `api/chat`, `api/fill-gaps`, `api/image/generate`, `api/image/generate-prompt`, and all `api/llm/*` routes
- [ ] Fix open redirect in `src/app/auth/callback/route.ts`: only accept `next` values that start with `/` and not `//`, fall back to `/dashboard`
- [ ] Gate `api/test/openrouter` and `api/test/falai` behind `NODE_ENV !== 'production'` (return 404 in production)
- [ ] Remove the test user block (UUID `00000000-...-0001`, lines ~617-668) from `PRODUCTION_MIGRATIONS.sql`; verify whether it was applied to the hosted project and delete the user there if so
- [ ] Delete `get-keys.js` from the repo (local-dev JWT generator with the default Supabase demo secret; unneeded)
- [ ] Write a migration adding `user_id` (default `auth.uid()`) to user-owned inventory tables (`terrain_types`, `terrain_pieces`, `terrain_objects`, `custom_pieces`, `piece_templates`, `piece_variants`) and replace the `USING (true)` RLS policies with owner-scoped ones; keep genuinely shared reference tables (e.g. `piece_shapes`) read-only for authenticated users
- [ ] Update inventory queries/stores to work with user-scoped rows (inserts must not break; existing rows need a backfill decision)
- [ ] Add basic per-user rate limiting to the LLM/image routes (simple in-memory or Upstash sliding window; decide based on Vercel deployment)

## Phase 2: Performance

- [ ] Load `MapDesigner` via `next/dynamic` with `ssr: false` and a loading skeleton in `src/app/designer/page.tsx` so three.js/konva leave the initial bundle
- [ ] Audit other entry points that pull in konva/three eagerly (inventory editors, 3D viewer) and dynamic-import where it cuts the shared bundle
- [ ] Replace the 12 raw `<img>` usages with `next/image` (`dashboard/page.t