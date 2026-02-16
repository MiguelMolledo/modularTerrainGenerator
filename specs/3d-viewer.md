# 3D Viewer

Three.js-based 3D visualization of maps with elevation support and interactive camera controls.

## User Capabilities

- Users can toggle between 2D and 3D view modes
- Users can rotate the 3D view by dragging with mouse
- Users can zoom in/out in 3D using mouse wheel
- Users can see pieces rendered with their elevation data (slopes, heights)
- Users can view props as 3D objects with depth
- Users can see lighting and shadows on the terrain
- Users can set reference levels to view specific floor heights
- Users can see diagonal pieces rendered as triangular prisms

## Constraints

- 3D view is lazy-loaded to improve initial page load
- Performance depends on number of placed pieces
- Elevation data must be configured per piece type
- 3D view is read-only (editing happens in 2D mode)

## Related Specs

- [Map Designer](./map-designer.md) - main editing interface
- [Elevation System](./elevation.md) - piece height configuration

## Source

- [src/components/map-designer/three/Map3DViewer.tsx](../src/components/map-designer/three/Map3DViewer.tsx)
- [src/components/map-designer/three/Scene3D.tsx](../src/components/map-designer/three/Scene3D.tsx)
- [src/components/map-designer/three/PlacedPiece3D.tsx](../src/components/map-designer/three/PlacedPiece3D.tsx)
- [src/components/map-designer/three/Prop3D.tsx](../src/components/map-designer/three/Prop3D.tsx)
