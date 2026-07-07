# Project Hardening Implementation Plan

## Status (2026-07-07)

- **Phase 1 — Critical Security: DONE** (commit `d528156`).
- **Phase 2 — Access Control & Abuse: DONE** except the API-key storage change, which the user chose to leave as-is (localStorage). Commit `be64790`.
- **Phase 3 — Performance: DONE** (commit `9167396`). The `<img>` migration turned out to be inapplicable — all flagged images are canvas data URLs — so they were documented with eslint-disable instead.
- **Phase 4 — Code Quality: PARTIAL** (commit `bc2933f`). Done: shared LLM JSON parser, `eslint --fix`. Deferred (risky refactors needing manual testing): React-Compiler "setState in effect" errors across ~10 dialogs, MapCanvas render memoization, store/localStorage de-duplication, toolExecutor cast validation.
- **Phase 5 — Testing/CI/Hygiene: PARTIAL** (commit `890b45a`). Done: untracked artifacts, moved scripts, CI workflow (tsc + build blocking, build verified). Deferred: making the Playwright specs assert real conditions and run against a seeded Supabase in CI.

## Summary

Address the findings from the full project review across four areas: **security** (unauthenticated paid API routes, open redirect, test user in production migrations, allow-all RLS policies, exposed test endpoints, weak API-key storage), **performance** (eager three.js/konva bundle, unoptimized images, bare next.config), **code quality** (43 lint errors, duplicated persistence logic, unvalidated casts, oversized MapCanvas), and **testing/hygiene** (no CI, no-op test assertions, tracked build artifacts).

Phases are ordered by risk and dependency: security first (it closes real cost/phishing holes and some fixes need to ship before the app is public), then a shared-infrastructure layer that later phases reuse, then performance, code quality, and finally CI/testing/hygiene. Each phase is independently shippable.

Key decisions:
- Centralize API auth in one reusable `requireUser()` helper in `src/lib/api/` rather than repeating `getUser()` in every route, since all 8 paid routes need identical treatment.
- Keep the test-user migration for local dev only; strip it from `PRODUCTION_MIGRATIONS.sql` rather than deleting the local migration.
- Treat `get-keys.js` as removable (it only prints the standard Supabase local demo JWT secret — not a production secret — but it has no reason to be in the repo).
- Rate limiting via a lightweight per-user/IP limiter (in-memory to start; note Upstash as the production upgrade) so it doesn't block shipping auth.

## Phase 1: Critical Security (ship before public traffic)

- [ ] Create `src/lib/api/auth.ts` with a `requireUser(request)` helper that builds the server Supabase client, calls `supabase.auth.getUser()`, and returns either the user or a 401 `NextResponse`.
- [ ] Add the `requireUser` guard to every paid route: `api/chat`, `api/fill-gaps`, `api/image/generate`, `api/image/generate-prompt`, `api/llm/suggest-layout`, `api/llm/describe-scene`, `api/llm/analyze-campaign`, `api/llm/generate-props`.
- [ ] Gate `api/test/openrouter` and `api/test/falai` behind `NODE_ENV !== 'production'` (return 404 in prod) — or delete them if only used during initial setup.
- [ ] Fix the open redirect in `src/app/auth/callback/route.ts`: only honor `next` when it starts with a single `/` (reject `//`, `/\`, and absolute URLs); otherwise fall back to `/dashboard`.
- [ ] Remove the test-user block (UUID `00000000-…-001`, password `test-password-dev-only`) from `PRODUCTION_MIGRATIONS.sql`, lines ~617-668; keep it only in `supabase/migrations/20260223000000_create_test_user.sql` for local dev.
- [ ] If `PRODUCTION_MIGRATIONS.sql` was already applied to the hosted Supabase, delete the test user there (Studio → Auth) and confirm it's gone.
- [ ] `git rm get-keys.js` and commit; it prints a JWT signed with the well-known local demo secret and doesn't belong in the repo.

## Phase 2: Access Control & Abuse Protection

- [ ] Audit each allow-all table (`piece_shapes`, `terrain_types`, `terrain_pieces`, `terrain_objects`, `custom_pieces`, `piece_templates`, `piece_variants`): decide per table whether it's shared reference data or per-user data.
- [ ] For per-user tables, add a `user_id uuid references auth.users default auth.uid()` column (migration) and replace `FOR ALL USING (true)` with owner-scoped policies (`USING (auth.uid() = user_id)`).
- [ ] For genuine reference tables, downgrade policies to read-only for authenticated users (no client writes).
- [ ] Write a new migration for the corrected policies and mirror it into `PRODUCTION_MIGRATIONS.sql`; verify with `supabase db reset` locally.
- [ ] Add a lightweight rate limiter (per user id, falling back to IP) to the paid API routes via a shared `src/lib/api/rateLimit.ts`; return 429 on exceed. Document Upstash/Redis as the production-grade upgrade.
- [ ] Move user API keys out of reversible localStorage obfuscation: either require re-entry per session, or store them server-side encrypted and keyed by user id. Update `src/store/apiKeysStore.ts` and `src/app/settings/page.tsx` accordingly.

## Phase 3: Performance

- [ ] Dynamically import the designer: wrap `MapDesigner` in `next/dynamic` with `ssr: false` and a skeleton loader in `src/app/designer/page.tsx`, so three.js/konva leave the initial bundle.
- [ ] Replace the 12 raw `<img>` tags with `next/image` (dashboard, `MapCard`, `PropsInventory`, `ExportReportDialog`, `MapCanvas` overlays), adding width/height or `fill`; add any needed hosts to `remotePatterns`.
- [ ] Flesh out `next.config.ts`: `reactStrictMode: true`, `poweredByHeader: false`, and review whether any three.js/konva webpack tweaks help bundle size.
- [ ] Spot-check the designer route bundle before/after (e.g. `npm run build` output or a quick Lighthouse pass) to confirm the initial JS payload dropped.

## Phase 4: Code Quality

- [ ] Fix the ~10 "setState synchronously within an effect" lint errors in the inventory/dialog components (initialize state from props, or defer with the pattern already used in the landing components).
- [ ] Run `npx eslint src --fix` for the auto-fixable rules (`prefer-const`, unused vars/imports) and clear the remaining manual ones.
- [ ] De-duplicate persistence: make `inventoryStore.ts` call the shared `localStorage.ts` helpers (e.g. `getTerrainTypesWithInventory`) instead of re-implementing them; establish localStorage as the single source of truth.
- [ ] Extract the repeated LLM JSON handling (markdown-strip + parse) into `src/lib/llm/parseJsonResponse.ts` and use it across the `api/llm/*` routes; standardize error responses with a `code` field.
- [ ] Replace the unvalidated `as unknown as X` casts in `src/lib/chat/toolExecutor.ts` with per-param type guards/validation.
- [ ] Type the Konva event handlers in `MapCanvas.tsx` (`KonvaEventObject`) instead of `e: any`; extract a `React.memo` `PlacedPieceGroup` for the three inline piece `.map()` loops to cut re-renders during drag/zoom.
- [ ] (Optional, when next touching them) extract a `useFormDialog` hook to collapse the repeated dialog boilerplate across inventory/map-designer dialogs.

## Phase 5: Testing, CI & Hygiene

- [ ] `git rm --cached Untitled screenshot.png after-login.png` and confirm `.gitignore` covers them; move loose root scripts (`test-auth.mjs`, `check-signout.mjs`, `test-with-auth.mjs`, `playwright-auth-setup.mjs`) into `scripts/`.
- [ ] Convert the no-op test assertions (`const hasX = await el.isVisible().catch(()=>false)` with no `expect`) into real `expect(...)` assertions, or delete specs that can't run headless.
- [ ] Add `.github/workflows/ci.yml` running `npm ci`, `npx tsc --noEmit`, `npm run lint`, and `npm run test` (playwright.config already handles CI workers/retries); decide how tests get a Supabase instance (service container or seeded test project).
- [ ] Refresh docs: update `specs/index.md` to reflect current state, prune the empty `plans/` legacy content, and confirm `DEPLOYMENT_GUIDE.md` matches the new auth/RLS setup.

## Verification

- [ ] `npx tsc --noEmit` and `npm run lint` pass with zero errors in `src/`.
- [ ] Security review: unauthenticated `curl` to each `/api/*` paid route returns 401; test endpoints return 404 in a production build; `next=//evil.com` on the OAuth callback lands on `/dashboard`.
- [ ] RLS check: a second test user cannot read or modify the first user's inventory rows.
- [ ] Rate limiting: rapid repeated calls to a paid route return 429.
- [ ] `git ls-files` no longer lists `get-keys.js`, `Untitled`, `screenshot.png`, `after-login.png`; `PRODUCTION_MIGRATIONS.sql` contains no test user.
- [ ] Designer route: three.js/konva no longer in the initial chunk (dynamic import confirmed); images served via `next/image`.
- [ ] CI workflow runs green on a pull request.
