# Collision Detection

System for detecting piece overlaps and validating placements within map boundaries.

## User Capabilities

- Users see visual feedback when placement would cause overlap
- Users cannot place pieces that would overlap existing pieces
- Users cannot place pieces outside map boundaries
- Users can enable/disable snap-to-grid for alignment
- Users can use magnetic snap for diagonal pieces

## Detection Types

### Piece Overlap
- Rectangular pieces use axis-aligned bounding boxes
- Diagonal/triangular pieces use vertex-based collision
- Rotation is accounted for in collision calculations

### Boundary Checking
- Pieces must be fully within map dimensions
- Accounts for piece size and rotation

### Grid Alignment
- Optional snapping to grid cells
- Magnetic snap for diagonal alignment

## Constraints

- Collision checked on every placement attempt
- Performance optimized for large maps
- Diagonal pieces require vertex calculations

## Related Specs

- [Map Designer](./map-designer.md) - uses collision for placement
- [Grid System](./grid-system.md) - alignment options

## Source

- [src/lib/collisionUtils.ts](../src/lib/collisionUtils.ts)
- [src/lib/gridUtils.ts](../src/lib/gridUtils.ts)
