# Elevation System

Per-piece 3D elevation configuration for slopes and terrain height variations.

## User Capabilities

- Users can set corner elevations for each piece type (nw, ne, sw, se)
- Users can create sloped terrain by varying corner heights
- Users can see elevation applied in 3D viewer
- Users can reset elevation to flat (all zeros)
- Users can edit elevation for any terrain/shape combination

## Elevation Model

Each piece can have independent height values at:
- **NW** - Northwest corner
- **NE** - Northeast corner
- **SW** - Southwest corner
- **SE** - Southeast corner

Setting different values creates slopes and ramps.

## Constraints

- Elevation stored per terrain-shape combination (e.g., "desert-6x6")
- Flat elevations (all zeros) are automatically removed from storage
- Elevation data persists in localStorage
- Only affects 3D view rendering

## Related Specs

- [3D Viewer](./3d-viewer.md) - renders elevation
- [Inventory Management](./inventory.md) - elevation per piece type

## Source

- [src/store/elevationStore.ts](../src/store/elevationStore.ts)
- [src/components/inventory/ElevationEditor.tsx](../src/components/inventory/ElevationEditor.tsx)
