# Specs Index

Quick reference to all system specs for Modular Terrain Creator. Search-optimized with keywords.

---

## [Map Designer](./map-designer.md)

Map creation, piece placement, canvas, drag-drop, zoom, pan, grid, levels, 2D view, selection, rotation.

**Source**: `src/components/map-designer/`, `src/store/mapStore.ts`

---

## [3D Viewer](./3d-viewer.md)

Three.js, 3D rendering, elevation, camera, lighting, piece visualization, Unity camera, fly mode, WASD navigation, right-click look.

**Source**: `src/components/map-designer/three/`

---

## [3D Editor](./3d-editor.md)

Transform controls, gizmos, Unity-style, move pieces 3D, rotate 3D, height movement, level change, W key move mode, E key rotate mode, TransformControls, three-stdlib, selection outline, multi-select, axis handles, Y axis height, fly camera WASD, real-time sync, drag preview.

**Source**: `src/components/map-designer/three/`, `src/hooks/use3DTransform.ts`

---

## [Inventory Management](./inventory.md)

Terrains, pieces, shapes, props, custom pieces, variants, templates, terrain types, quantities.

**Source**: `src/store/inventoryStore.ts`, `src/components/inventory/`, `src/lib/localStorage.ts`

---

## [Map Persistence](./map-persistence.md)

Save maps, load maps, localStorage, thumbnails, map library, duplicate, rename, delete.

**Source**: `src/store/mapInventoryStore.ts`, `src/components/maps/`

---

## [AI Assistant](./ai-assistant.md)

Chat, OpenRouter, LLM, tool calls, generate props, suggest layout, describe scene, campaign analyzer.

**Source**: `src/store/chatStore.ts`, `src/lib/chat/`, `src/app/api/chat/`, `src/app/api/llm/`

---

## [Image Generation](./image-generation.md)

FAL.ai, FLUX, AI art, battle map generation, map to image, prompt generation.

**Source**: `src/app/api/image/`, `src/lib/falai.ts`, `src/components/map-designer/GenerateArtDialog.tsx`

---

## [Undo/Redo](./undo-redo.md)

History, undo, redo, command pattern, action recording, state restoration.

**Source**: `src/store/historyStore.ts`, `src/hooks/useUndoRedo.ts`

---

## [Collision Detection](./collision-detection.md)

Piece overlap, boundaries, grid alignment, magnetic snap, triangle vertices, rectangle vertices.

**Source**: `src/lib/collisionUtils.ts`, `src/lib/gridUtils.ts`

---

## [Elevation System](./elevation.md)

Corner heights, slopes, 3D terrain, piece elevation, nw/ne/sw/se corners.

**Source**: `src/store/elevationStore.ts`, `src/components/inventory/ElevationEditor.tsx`

---

## [Export System](./export.md)

PDF reports, map snapshots, piece inventory export, jsPDF, magnets table, magnet requirements per piece type, magnet summary, magnets by terrain.

**Source**: `src/lib/exportReport.ts`, `src/components/maps/ExportReportDialog.tsx`

---

## [Template Engine](./templates.md)

Piece templates, predefined layouts, castle, village, template placement, shape collections.

**Source**: `src/lib/templateEngine.ts`, `src/config/pieceTemplates.ts`, `src/types/templates.ts`

---

## [API Keys](./api-keys.md)

OpenRouter key, FAL.ai key, obfuscation, connection testing, settings.

**Source**: `src/store/apiKeysStore.ts`, `src/app/settings/`

---

## [Grid System](./grid-system.md)

Grid cells, snap-to-grid, magnetic snap, cell size, grid display, alignment.

**Source**: `src/lib/gridUtils.ts`, `src/config/terrain.ts`

---

## [Radial Menu](./radial-menu.md)

Quick access, recently used pieces, Q key shortcut, circular menu.

**Source**: `src/components/map-designer/RadialMenu.tsx`

---

## [Authentication](./authentication.md)

Login, logout, Google OAuth, Supabase Auth, sessions, roles, admin, user, ban, suspend, is_active, profiles, RLS, protected routes, access control, middleware, landing page.

**Source**: `src/lib/supabase/`, `src/app/login/`, `src/app/auth/callback/`, `src/app/suspended/`, `src/middleware.ts`

---
