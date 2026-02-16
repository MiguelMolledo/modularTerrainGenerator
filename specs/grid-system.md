# Grid System

Configurable grid overlay with snap-to-grid and magnetic snap functionality for precise piece placement.

## User Capabilities

- Users can toggle grid visibility on/off
- Users can toggle snap-to-grid on/off
- Users can enable magnetic snap for diagonal pieces
- Users can see grid lines on the canvas
- Users can adjust grid cell size (default 0.5 inches)

## Grid Configuration

- **Cell Size**: Default 0.5 inches (half-inch grid)
- **Show Grid**: Visual grid overlay toggle
- **Snap to Grid**: Pieces align to grid intersections
- **Magnetic Snap**: Enhanced snapping for diagonal alignments

## Measurements

- Grid uses inches as base unit
- 20 pixels per inch (configurable)
- Standard piece sizes: 3x1.5, 6x1.5, 3x3, 3x6, 6x6 inches
- Default map size: 60x60 inches

## Constraints

- Grid performance affected by zoom level
- Snap behavior can be toggled per-session
- Grid settings not persisted with map data

## Related Specs

- [Map Designer](./map-designer.md) - grid display and controls
- [Collision Detection](./collision-detection.md) - uses grid for alignment

## Source

- [src/lib/gridUtils.ts](../src/lib/gridUtils.ts)
- [src/config/terrain.ts](../src/config/terrain.ts)
- [src/store/mapStore.ts](../src/store/mapStore.ts) - grid config state
