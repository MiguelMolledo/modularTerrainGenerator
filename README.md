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
- Docker (for local Supabase)

### Installation

```bash
# Clone the repository
git clone git@github.com:MiguelMolledo/modularTerrainGenerator.git
cd modularTerrainGenerator

# Install dependencies
npm install

# Start Supabase (requires Docker)
npx supabase start

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-start>
```

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
