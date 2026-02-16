# 3D Editor

Sistema de edición interactiva en el visor 3D con gizmos de transformación estilo Unity/Unreal para manipular piezas y props directamente en el espacio tridimensional.

## User Capabilities

### Selección
- Users can select pieces and props by clicking on them in 3D view
- Users can multi-select using Shift+click to add/remove from selection
- Users can see selected objects highlighted with a bright outline/glow effect
- Users can deselect all by clicking on empty space

### Transformación - Mover
- Users can press W to activate translation (move) mode
- Users can drag axis arrows (X/Y/Z) to move pieces along that axis
- Users can see a preview of the final position while dragging
- Users can see the active axis highlighted during drag
- Users can move multiple selected pieces together as a group

### Transformación - Rotar
- Users can press E to activate rotation mode
- Users can rotate pieces in 90° increments (matching 2D behavior)
- Users can rotate multiple selected pieces together

### Snap y Límites
- Users can benefit from automatic grid snap (same behavior as 2D)
- Users can move pieces within height limits defined by layers:
  - Basement: 0" - 3"
  - Ground: 3" - 6"
  - Level 1: 6" - 9"
  - Level 2: 9" - 12"
- Users can see 3" as the default height per layer

### Feedback Visual
- Users can see collision warnings when pieces overlap (visual indicator)
- Users can temporarily place pieces in collision state (soft constraint)
- Users can see changes reflected in 2D view in real-time

### Undo/Redo
- Users can undo 3D transformations with Ctrl+Z
- Users can redo with Ctrl+Shift+Z
- Users can see 3D actions in the same history as 2D actions

## Constraints

- TransformControls from three-stdlib library must be used for gizmos
- Rotation is restricted to 90° increments only
- Height limits are enforced per layer (3" default per layer)
- Collisions show warning but don't block placement (soft constraint)
- All transformations sync immediately with 2D view and map state
- Props and terrain pieces use the same transform controls

## Related Specs

- [3D Viewer](./3d-viewer.md) - base 3D rendering system
- [Map Designer](./map-designer.md) - 2D editing and state management
- [Collision Detection](./collision-detection.md) - overlap detection logic
- [Undo/Redo](./undo-redo.md) - history integration
- [Grid System](./grid-system.md) - snap behavior

## Source

- [src/components/map-designer/three/Map3DViewer.tsx](../src/components/map-designer/three/Map3DViewer.tsx)
- [src/components/map-designer/three/TransformControls3D.tsx](../src/components/map-designer/three/TransformControls3D.tsx) *(new)*
- [src/components/map-designer/three/SelectionManager3D.tsx](../src/components/map-designer/three/SelectionManager3D.tsx) *(new)*
- [src/hooks/use3DTransform.ts](../src/hooks/use3DTransform.ts) *(new)*
- [src/store/mapStore.ts](../src/store/mapStore.ts)
