---
name: local-dev-guide
description: Quick reference for local development commands
disable-model-invocation: true
---

## Build & Run

- **Install deps:** `npm install`
- **Dev server:** `npm run dev` (runs on http://localhost:4200)
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Tests

- **Run Playwright tests:** `npx playwright test`
- **Run with UI:** `npx playwright test --ui`
- Tests expect dev server on port 3000 (auto-starts via playwright config)

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `OPENROUTER_API_KEY` - For AI prop generation
- `FAL_KEY` - For AI image generation

## Manual Checks

- Open http://localhost:4200 to verify the app loads
- Navigate to /designer to test the map designer
- Check /settings to configure API keys in-app
