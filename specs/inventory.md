# Inventory Management

System for managing all terrain types, piece shapes, props, custom pieces, and templates available for map creation.

## User Capabilities

### Terrain Types
- Users can view all terrain types (Desert, Forest, Water, Swamp, Lava, Arid, custom)
- Users can create custom terrain types with name, color, icon, and AI description
- Users can edit existing terrain types
- Users can delete custom terrain types
- Users can assign pieces and objects to each terrain type

### Piece Shapes
- Users can view all available shapes (3x1.5, 6x1.5, 3x3, 3x6, etc.)
- Users can create new shapes with dimensions, diagonal flag, and magnet positions
- Users can set base height and default rotation for shapes
- Users can edit and delete shapes

### Custom Pieces
- Users can create multi-colored grid-based custom pieces
- Users can paint individual cells with different terrain colors
- Users can preview custom pieces before saving
- Users can edit and delete custom pieces

### Piece Variants
- Users can create variants of standard pieces with custom cell colors
- Users can modify existing variants

### Templates
- Users can create piece templates (collections of shapes)
- Users can apply templates to terrains to quickly add piece sets
- Users can edit and delete templates

### Terrain Objects (Props)
- Users can add 3D objects to terrains (furniture, NPCs, creatures)
- Users can set object dimensions (width, height, depth) and emoji
- Users can categorize objects (furniture, npc, creature, hero, boss, item)

### Quantities
- Users can set available quantity per piece/terrain combination
- Users can enable/disable pieces for specific terrains

## Constraints

- All data persists in browser localStorage
- Terrain type slugs must be unique
- Shape keys must be unique (derived from dimensions)
- Default terrains cannot be deleted

## Related Specs

- [Map Designer](./map-designer.md) - uses inventory for available pieces
- [Template Engine](./templates.md) - template placement logic

## Source

- [src/store/inventoryStore.ts](../src/store/inventoryStore.ts)
- [src/lib/localStorage.ts](../src/lib/localStorage.ts)
- [src/components/inventory/PropsInventory.tsx](../src/components/inventory/PropsInventory.tsx)
- [src/components/inventory/TerrainEditor.tsx](../src/components/inventory/TerrainEditor.tsx)
- [src/components/inventory/CustomPieceFormDialog.tsx](../src/components/inventory/CustomPieceFormDialog.tsx)
- [src/config/terrain.ts](../src/config/terrain.ts)
- [src/config/props.ts](../src/config/props.ts)
