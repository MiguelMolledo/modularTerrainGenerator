# Template Engine

System for placing predefined collections of pieces as templates onto the map.

## User Capabilities

- Users can select from predefined templates (castle, village, dungeon, etc.)
- Users can apply templates to place multiple pieces at once
- Users can see template previews before placement
- Users can create custom templates from selected pieces
- Users can apply shape templates to terrains to add piece sets

## Template Structure

Each template contains:
- Template name and description
- List of template pieces with:
  - Shape reference (width x height)
  - Relative position offset
  - Rotation
  - Terrain type association

## Placement Logic

- Templates placed relative to cursor position
- Collision detection prevents invalid placements
- Pieces that collide are skipped
- User notified of partial placements

## Constraints

- Templates stored in localStorage
- Template pieces must match available inventory
- Collision may prevent some pieces from placing

## Related Specs

- [Map Designer](./map-designer.md) - template placement
- [Inventory Management](./inventory.md) - template definitions
- [Collision Detection](./collision-detection.md) - placement validation

## Source

- [src/lib/templateEngine.ts](../src/lib/templateEngine.ts)
- [src/config/pieceTemplates.ts](../src/config/pieceTemplates.ts)
- [src/types/templates.ts](../src/types/templates.ts)
- [src/components/inventory/TemplateFormDialog.tsx](../src/components/inventory/TemplateFormDialog.tsx)
- [src/components/inventory/TemplatesList.tsx](../src/components/inventory/TemplatesList.tsx)
