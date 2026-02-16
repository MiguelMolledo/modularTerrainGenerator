# 3D Viewer

Three.js-based 3D visualization and editing of maps with elevation support and Unity-style camera controls.

## User Capabilities

### Visualization
- Users can toggle between 2D and 3D view modes with V key
- Users can see pieces rendered with their elevation data (slopes, heights)
- Users can view props as 3D objects with depth
- Users can see lighting and shadows on the terrain
- Users can set reference levels to view specific floor heights
- Users can see diagonal pieces rendered as triangular prisms
- Users can see pieces at different levels (basement, ground, level 1, level 2)

### Camera Navigation (Unity-style Fly Mode)
- Users can look around by holding right-click and dragging
- Users can fly through the scene using WASD while holding right-click
- Users can move up/down using E/Q while holding right-click
- Users can zoom using the scroll wheel
- Users can move faster by holding Shift

### Editing
- Users can select and manipulate pieces directly in 3D view
- Users can move pieces along X, Y, and Z axes
- Users can rotate pieces in 90° increments
- Users can change piece levels by moving them vertically
- Users can see real-time sync with 2D view

## Constraints

- 3D view is lazy-loaded to improve initial page load
- Performance depends on number of placed pieces
- Elevation data must be configured per piece type
- Camera controls disabled while transforming pieces

## Related Specs

- [Map Designer](./map-designer.md) - main editing interface
- [3D Editor](./3d-editor.md) - piece transformation controls
- [Elevation System](./elevation.md) - piece height configuration

## Source

- [src/components/map-designer/three/Map3DViewer.tsx](../src/components/map-designer/three/Map3DViewer.tsx)
- [src/components/map-designer/three/Scene3D.tsx](../src/components/map-designer/three/Scene3D.tsx)
- [src/components/map-designer/three/UnityCameraController.tsx](../src/components/map-designer/three/UnityCameraController.tsx)
- [src/components/map-designer/three/PlacedPiece3D.tsx](../src/components/map-designer/three/PlacedPiece3D.tsx)
- [src/components/map-designer/three/Prop3D.tsx](../src/components/map-designer/three/Prop3D.tsx)
