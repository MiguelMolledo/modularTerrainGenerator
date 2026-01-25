# Modular Terrain Generator - Design Document

## Overview

This document captures the current state of the application, architectural decisions, implementation details, and pending work to enable continuity across development sessions.

---

## 1. Application Purpose

A tool for tabletop gaming enthusiasts to design terrain layouts using modular pieces. Users can:
- Build maps by placing terrain pieces on a grid-based canvas
- Track physical piece inventory (what they own)
- Create custom pieces with non-standard sizes
- Save and load map designs
- Plan multi-level terrain (basements, floors)

---

## 2. Architecture Overview

### 2.1 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  MapStore   │    │InventoryStore│   │MapInventoryStore│ │
│  │  (Zustand)  │    │  (Zustand)   │   │    (Zustand)    │ │
│  └──────┬──────┘    └──────┬───────┘   └────────┬────────┘ │
│         │                  │                    │           │
│         v                  v                    v           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              React Components (Next.js)                 ││
│  │  - MapCanvas (Konva)  - Sidebar  - Inventory Pages      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│  ┌─────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐ │
│  │  maps   │ │terrain_types │ │piece_shapes│ │custom_pieces││
│  └─────────┘ └──────────────┘ └────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Store Responsibilities

| Store | Purpose | Key State |
|-------|---------|-----------|
| `mapStore` | Current map being edited | `placedPieces`, `availablePieces`, `zoom`, `selectedPieceId` |
| `inventoryStore` | Terrain & piece definitions | `terrainTypes`, `shapes`, `customPieces` |
| `mapInventoryStore` | Saved maps CRUD | `maps`, `isLoading`, `error` |

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- Saved map designs
maps (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  map_width INTEGER DEFAULT 72,    -- inches
  map_height INTEGER DEFAULT 45,   -- inches
  levels INTEGER[],                -- e.g., [-1, 0, 1, 2]
  placed_pieces JSONB,             -- array of PlacedPiece
  grid_config JSONB,
  thumbnail TEXT,                  -- base64 image
  snapshot TEXT,                   -- full-res base64
  is_custom_thumbnail BOOLEAN,
  created_at, updated_at
)

-- Predefined piece shapes (immutable)
piece_shapes (
  id UUID PRIMARY KEY,
  shape_key TEXT UNIQUE,           -- e.g., '3x3', 'diagonal-tl'
  name TEXT,
  width DECIMAL(5,2),
  height DECIMAL(5,2),
  is_diagonal BOOLEAN,
  default_rotation INTEGER,
  display_order INTEGER
)

-- Terrain type definitions
terrain_types (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  color TEXT,                      -- hex color
  icon TEXT,                       -- emoji
  is_default BOOLEAN,
  display_order INTEGER
)

-- Terrain-to-shape mapping with quantities
terrain_pieces (
  terrain_type_id UUID FK,
  shape_id UUID FK,
  quantity INTEGER                 -- how many user owns
)

-- User-created custom pieces
custom_pieces (
  id UUID PRIMARY KEY,
  name TEXT,
  width DECIMAL(5,2),              -- 0.5 to 12 inches
  height DECIMAL(5,2),
  is_split BOOLEAN,
  split_direction TEXT,            -- 'horizontal' | 'vertical'
  primary_terrain_type_id UUID FK,
  secondary_terrain_type_id UUID FK,
  quantity INTEGER
)
```

### 3.2 Design Decisions

1. **JSONB for placed_pieces**: Flexible schema for piece positions, allows easy evolution
2. **Separate custom_pieces table**: Predefined shapes in `piece_shapes` stay immutable
3. **Dual terrain references**: `custom_pieces` can have two terrain colors for split pieces
4. **Size constraints**: Custom pieces limited to 0.5" increments via CHECK constraints

---

## 4. Key Components

### 4.1 MapCanvas (`src/components/map-designer/MapCanvas.tsx`)

The main canvas using Konva.js. Responsibilities:
- Render grid lines
- Render placed pieces (rectangles, triangles, split pieces)
- Handle drag preview during sidebar drag
- Mouse/keyboard event handling (zoom, pan, placement)
- Collision detection before placement

**Key interactions:**
```
User drags from sidebar → isSidebarDragging = true → DragPreview follows mouse
User releases on canvas → Piece placed at snapped position
User presses R → currentRotation rotates 90°
User scrolls → zoom changes
User middle-clicks → pan mode
```

### 4.2 Sidebar (`src/components/map-designer/Sidebar.tsx`)

Piece selector organized by terrain type tabs. Features:
- Terrain type tabs with color indicators
- Piece cards showing name, size, quantity available
- Visual size representation (small rectangles/triangles)
- "Custom" tab for custom pieces
- Collapsible design

### 4.3 Inventory System (`src/components/inventory/`)

CRUD interfaces for managing:
- `TerrainEditor`: Edit terrain properties, assign piece quantities
- `CustomPiecesList`: Grid of custom pieces with create/edit/delete
- `CustomPieceFormDialog`: Form for custom piece with size inputs, split options
- `ShapesOverview`: Read-only view of all predefined shapes

### 4.4 MapCard (`src/components/maps/MapCard.tsx`)

Flip card component for maps library:
- Front: Thumbnail image
- Back: Details (name, date, piece count) + actions (Load, Delete)
- CSS 3D transform for flip animation

---

## 5. Key Algorithms

### 5.1 Collision Detection (`src/lib/collisionUtils.ts`)

Rectangle-based intersection check with rotation support:
```typescript
function checkCollision(pieceA, pieceB): boolean {
  // Get rotated bounding boxes
  // Check axis-aligned bounding box intersection
  // For diagonal pieces: use polygon intersection
}
```

### 5.2 Grid Snapping

Pieces snap to 1.5" grid cells:
```typescript
const snappedX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
const snappedY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;
```

### 5.3 Thumbnail Generation (`src/lib/thumbnailUtils.ts`)

Uses Konva's `toDataURL()` to capture canvas state:
```typescript
async function generateThumbnail(stage: Konva.Stage): Promise<string> {
  // Temporarily hide grid and selection
  // Export to data URL at reduced size
  // Restore UI elements
}
```

---

## 6. Current State

### 6.1 Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| Map canvas with zoom/pan | Done | Scroll zoom, middle-click pan |
| Piece placement from sidebar | Done | Drag-drop with preview |
| Piece rotation | Done | R key, 90° increments |
| Multi-terrain support | Done | 6 default terrains |
| Grid snapping | Done | 1.5" cells |
| Collision detection | Done | Prevents overlaps |
| Save/load maps | Done | Full persistence |
| Thumbnail generation | Done | Separate snapshot for high-res |
| Custom thumbnail support | Done | Upload or auto-generate |
| Map library with flip cards | Done | 3D flip animation |
| Inventory management | Done | CRUD for terrains, quantities |
| Custom pieces | Done | Any size, dual-color split |
| Radial quick-access menu | Done | Hold Q, 8 recent pieces |
| Multi-level support | Done | Basement to floor 2 |
| Diagonal pieces | Done | 4 orientations per terrain |

### 6.2 Known Limitations

1. **No authentication**: All data is shared (RLS allows all)
2. **No undo/redo**: Would need history stack in mapStore
3. **No export formats**: Only saves to DB, no PDF/image export
4. **No piece rotation after placement**: Must delete and re-place
5. **No template library**: Templates exist in code but no UI
6. **Performance with 100+ pieces**: Not heavily tested

---

## 7. Potential Next Features

### 7.1 High Priority (UX improvements)

| Feature | Complexity | Notes |
|---------|------------|-------|
| Undo/Redo | Medium | Zustand middleware or custom history |
| Export to PNG/PDF | Medium | Konva export + jsPDF |
| Keyboard shortcuts | Low | Already have R and Q |
| Mobile touch support | Medium | Konva supports touch, needs UI |
| Search/filter pieces | Low | Filter sidebar by name |

### 7.2 Medium Priority (New capabilities)

| Feature | Complexity | Notes |
|---------|------------|-------|
| Template library UI | Medium | Select and place pre-built patterns |
| Piece cloning/duplication | Low | Clone selected piece |
| Multi-select pieces | Medium | Box select, group move |
| Layers/groups | Medium | Group pieces, toggle visibility |
| Import/export JSON | Low | Download/upload map data |

### 7.3 Low Priority (Nice to have)

| Feature | Complexity | Notes |
|---------|------------|-------|
| User authentication | Medium | Supabase auth integration |
| Collaborative editing | High | Real-time sync |
| 3D preview | High | Three.js integration |
| Piece images/textures | Medium | Image upload for pieces |
| Print layout | Medium | Generate print-ready pages |

---

## 8. Technical Debt

1. **Demo pieces in mapStore**: Hardcoded pieces should load from inventoryStore
2. **Type inconsistencies**: Some places use `terrainTypeId`, others `terrainId`
3. **Duplicate terrain definitions**: `config/terrain.ts` vs database seeds
4. **Missing tests**: No unit or integration tests yet
5. **No error boundaries**: React errors crash the whole app

---

## 9. Development Workflow

### Starting Development

```bash
# 1. Start Supabase
npx supabase start

# 2. Check database is migrated
npx supabase db reset --local  # if needed

# 3. Start dev server
npm run dev
```

### Adding a Migration

```bash
npx supabase migration new <name>
# Edit the new file in supabase/migrations/
npx supabase db reset --local  # apply
```

### Building for Production

```bash
npm run build
# Check for TypeScript errors
# Check for missing dependencies
```

---

## 10. File Reference

### Stores
- `src/store/mapStore.ts` - Designer state (pieces, zoom, selection)
- `src/store/inventoryStore.ts` - Terrain/piece definitions + custom pieces CRUD
- `src/store/mapInventoryStore.ts` - Saved maps CRUD

### Key Components
- `src/components/map-designer/MapCanvas.tsx` - Main Konva canvas (~800 lines)
- `src/components/map-designer/Sidebar.tsx` - Piece selector (~350 lines)
- `src/components/inventory/CustomPieceFormDialog.tsx` - Custom piece form

### Types
- `src/types/index.ts` - All TypeScript interfaces
- `src/lib/supabase.ts` - Database types (DbMap, DbCustomPiece, etc.)

### Config
- `src/config/terrain.ts` - Default values, terrain colors
- `src/types/templates.ts` - Map template definitions

---

## 11. Conventions

### Naming
- Component files: PascalCase (`MapCanvas.tsx`)
- Utility files: camelCase (`collisionUtils.ts`)
- Types: PascalCase interfaces (`PlacedPiece`)
- Store slices: camelCase functions (`addPlacedPiece`)

### Units
- All piece sizes in **inches**
- Grid cell size: 1.5 inches
- Default map: 72" x 45" (6ft x 3.75ft table)

### Colors
- Terrain colors defined in DB (`terrain_types.color`)
- UI uses Tailwind gray scale (`gray-800`, `gray-700`, etc.)

---

*Last updated: January 2026*
*Version: 0.1.0*
