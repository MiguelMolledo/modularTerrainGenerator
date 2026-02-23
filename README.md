# Modular Terrain Generator

A web application for designing modular terrain maps for tabletop games (wargames, RPGs, etc.). Create, save, and manage maps using a drag-and-drop interface with support for multiple terrain types, custom pieces, and multi-level designs.

## Features

- **Visual Map Designer**: Drag-and-drop canvas with real-time preview
- **Multi-level Support**: Design maps with basement, ground floor, and upper levels
- **Terrain Types**: Desert, Forest, Arid, Water, Swamp, Lava (customizable)
- **Piece Shapes**: Squares, rectangles, strips, and diagonal triangles
- **Custom Pieces**: Create pieces with custom sizes (0.5" increments) and dual-color split support
- **Inventory Management**: Track quantities, create custom terrain types
- **Map Library**: Save, load, and manage multiple map designs
- **Smart Placement**: Grid snapping, collision detection, magnetic alignment
- **Radial Menu**: Quick-access to recently used pieces (hold `Q`)

## Tech Stack

### Frontend Framework
- **Next.js 16** - React framework with App Router, server components, and optimized builds
- **React 19** - Latest React with improved concurrent features
- **TypeScript 5** - Type safety across the entire codebase

### Styling
- **Tailwind CSS 4** - Utility-first CSS with new CSS-native features
- **Radix UI** - Accessible, unstyled component primitives (Dialog, Tabs, Tooltips, etc.)
- **Lucide React** - Consistent icon library

### Canvas & Graphics
- **Konva.js** + **react-konva** - High-performance 2D canvas rendering
  - Chosen for: Layer management, built-in transformations, touch support
  - Enables smooth zoom/pan, piece rotation, and real-time drag previews

### State Management
- **Zustand 5** - Minimal, performant state management
  - Three stores: `mapStore` (designer), `inventoryStore` (pieces/terrains), `mapInventoryStore` (saved maps)
  - Chosen for: Simple API, no boilerplate, TypeScript-first design

### Database
- **Supabase** (PostgreSQL) - Backend-as-a-service
  - Local development with `supabase start`
  - Row Level Security (RLS) enabled
  - JSONB for flexible data (placed pieces, grid config)
  - Tables: `maps`, `piece_shapes`, `terrain_types`, `terrain_pieces`, `terrain_objects`, `custom_pieces`

### Development Tools
- **Playwright** - E2E testing
- **ESLint** - Code linting with Next.js config

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home
│   ├── designer/           # Map designer canvas
│   ├── inventory/          # Terrain & piece management
│   ├── maps/               # Saved maps library
│   └── settings/           # App settings
├── components/
│   ├── map-designer/       # Canvas, Sidebar, Toolbar, RadialMenu
│   ├── inventory/          # TerrainEditor, PiecesGrid, CustomPiecesList
│   ├── maps/               # MapCard with flip animation
│   ├── layout/             # TopNav
│   └── ui/                 # Radix-based primitives
├── store/
│   ├── mapStore.ts         # Designer state
│   ├── inventoryStore.ts   # Terrain & pieces CRUD
│   └── mapInventoryStore.ts # Saved maps
├── types/
│   └── index.ts            # TypeScript interfaces
├── lib/
│   ├── supabase.ts         # Supabase client & DB types
│   ├── collisionUtils.ts   # Piece overlap detection
│   ├── thumbnailUtils.ts   # Map snapshot generation
│   └── templateEngine.ts   # Template placement logic
└── config/
    └── terrain.ts          # Default configurations
```

## Getting Started

### Prerequisites
- Node.js 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Step 1: Install dependencies

```bash
git clone git@github.com:MiguelMolledo/modularTerrainGenerator.git
cd modularTerrainGenerator
npm install
```

### Step 2: Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copied from `supabase start` output>

# Google OAuth (see Step 3)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# AI features (optional)
OPENROUTER_API_KEY=<your-openrouter-key>
FAL_KEY=<your-fal-key>

# 3D Viewer Settings
NEXT_PUBLIC_DISABLE_3D_EDITING=true
```

### Step 3: Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Go to **APIs & Services > OAuth consent screen**
   - Choose "External" user type
   - Add scopes: `email`, `profile`, `openid`
   - Add your email as a test user (required while app is in testing mode)
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     - `http://localhost:4200`
     - `http://127.0.0.1:54321`
   - **Authorized redirect URIs:**
     - `http://127.0.0.1:54321/auth/v1/callback` (local)
     - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (production)
5. Copy the **Client ID** and **Client Secret** into your `.env.local`

### Step 4: Start Docker

Open Docker Desktop and wait for it to be ready.

### Step 5: Start Supabase

```bash
supabase start
```

This spins up local Postgres, Auth, Storage, and other services in Docker.

### Step 6: Apply database migrations

```bash
supabase db reset
```

This resets the local database and applies all migrations from `supabase/migrations/`.

### Step 7: Start the app

```bash
npm run dev
```

Open [http://localhost:4200](http://localhost:4200) — you'll be redirected to the login page.

### Quick start (returning developers)

```bash
# Open Docker Desktop first, then:
supabase start
npm run dev
```

### Local URLs

| Service | URL |
|---|---|
| App | http://localhost:4200 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio (DB UI) | http://127.0.0.1:54323 |
| Mailpit (email testing) | http://127.0.0.1:54324 |

### Admin & User Management

All user management is done through **Supabase Studio** (http://127.0.0.1:54323) in the `profiles` table:

- **Make admin:** Set `role` to `admin`
- **Ban user:** Set `is_active` to `false` (user sees `/suspended` page)
- **Unban user:** Set `is_active` back to `true`

Or via SQL in Supabase Studio > SQL Editor:

```sql
-- Make a user admin
UPDATE profiles SET role = 'admin' WHERE email = 'user@gmail.com';

-- Ban a user
UPDATE profiles SET is_active = false WHERE email = 'user@gmail.com';
```

### Stopping services

```bash
supabase stop    # Stop Supabase containers
# Close Docker Desktop when done
```

### Production deployment

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in the hosted DB (SQL Editor or `supabase db push`)
3. Enable Google provider in **Supabase Dashboard > Authentication > Providers** with your Client ID and Secret
4. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` = your hosted Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your hosted anon key
5. Update Google OAuth redirect URI to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. Publish your Google OAuth app (OAuth consent screen > Publish) to allow all users

## Usage

### Map Designer (`/designer`)
1. Select pieces from the sidebar (organized by terrain type)
2. Drag onto the canvas to place
3. Press `R` to rotate before placing
4. Hold `Q` to open radial menu for recent pieces
5. Click placed pieces to select, then rotate or delete
6. Save map with custom name and thumbnail

### Inventory (`/inventory`)
1. Create/edit terrain types with custom colors and icons
2. Set piece quantities per terrain
3. Create custom pieces with any size (0.5" increments)
4. Add dual-color split pieces (horizontal/vertical)

### Maps Library (`/maps`)
1. View saved maps as flip cards (thumbnail front, details back)
2. Load maps into designer for editing
3. Delete unwanted maps

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Konva over SVG** | Better performance with many pieces, built-in transformations |
| **Zustand over Redux** | Simpler API, less boilerplate, sufficient for this use case |
| **Supabase local-first** | Easy setup, built-in REST API, scales to production |
| **Piece sizes in inches** | Matches physical terrain piece measurements |
| **1.5" grid cells** | Standard modular terrain grid unit |
| **Separate custom_pieces table** | Keeps predefined shapes immutable |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Migrations

```bash
# Apply migrations
npx supabase db reset --local

# Create new migration
npx supabase migration new <name>
```

## License

MIT
