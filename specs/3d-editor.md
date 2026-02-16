# 3D Editor

Sistema de edición interactiva en el visor 3D con controles estilo Unity para navegación de cámara y gizmos de transformación para manipular piezas directamente en el espacio tridimensional.

## User Capabilities

### Navegación de Cámara (Estilo Unity)
- Users can look around by holding right-click and dragging the mouse
- Users can fly through the scene using WASD keys while holding right-click
- Users can move up/down using E/Q keys while holding right-click
- Users can zoom in/out using the scroll wheel
- Users can move faster by holding Shift while flying
- Users can navigate freely without affecting selected pieces

### Selección
- Users can select pieces and props by clicking on them in 3D view
- Users can multi-select using Shift+click to add/remove from selection
- Users can see selected objects highlighted with a white outline
- Users can deselect all by clicking on empty space

### Transformación - Mover (Move Mode)
- Users can press W to activate translation (move) mode
- Users can drag axis arrows (X/Y/Z) to move pieces along that axis
- Users can move pieces up and down between different levels using the Y axis
- Users can see a green preview box showing the final position while dragging
- Users can move multiple selected pieces together as a group

### Transformación - Rotar (Rotate Mode)
- Users can press E to activate rotation mode
- Users can rotate pieces in 90° increments (matching 2D behavior)
- Users can rotate multiple selected pieces together around their group center

### Movimiento en Altura (Level Changes)
- Users can move pieces between levels by dragging the Y axis handle
- Users can move pieces from basement (-1) to level 2
- Users can see the piece automatically update to the correct level based on height:
  - Y around -2.5": Level -1 (Basement)
  - Y around 0": Level 0 (Ground)
  - Y around 2.5": Level 1
  - Y around 5": Level 2
- Users can see changes reflected in 2D view immediately

### Snap y Límites
- Users can benefit from automatic grid snap (same behavior as 2D)
- Users can only move pieces within Y range -2.5" to 6" (all available levels)
- Users can see 2.5" as the height per layer/level

### Feedback Visual
- Users can see collision warnings when pieces overlap (red tint on pieces)
- Users can temporarily place pieces in collision state (soft constraint)
- Users can see changes reflected in 2D view in real-time

### Undo/Redo
- Users can undo 3D transformations with Ctrl+Z
- Users can redo with Ctrl+Shift+Z
- Users can see 3D actions in the same history as 2D actions

## Constraints

- TransformControls from three-stdlib library used for gizmos
- Rotation is restricted to 90° increments only
- Height movement limited to -2.5" to 6" (covers all 4 levels)
- Collisions show warning but don't block placement (soft constraint)
- All transformations sync immediately with 2D view and map state
- Props and terrain pieces use the same transform controls
- Camera controls are disabled while dragging pieces (prevents accidental movement)
- WASD/QE keys only move camera when right-click is held (prevents conflict with W/E transform mode keys)

## Camera Controls Summary

| Action | Control |
|--------|---------|
| Look around | Right-click + drag |
| Fly forward/back/left/right | Hold right-click + W/A/S/D |
| Fly up/down | Hold right-click + E/Q |
| Zoom | Scroll wheel |
| Move faster | Hold Shift |

## Piece Controls Summary

| Action | Control |
|--------|---------|
| Select piece | Left-click |
| Multi-select | Shift + left-click |
| Move mode | W key |
| Rotate mode | E key |
| Toggle 2D/3D | V key |

## Related Specs

- [3D Viewer](./3d-viewer.md) - base 3D rendering system
- [Map Designer](./map-designer.md) - 2D editing and state management
- [Collision Detection](./collision-detection.md) - overlap detection logic
- [Undo/Redo](./undo-redo.md) - history integration
- [Grid System](./grid-system.md) - snap behavior

## Source

- [src/components/map-designer/three/Map3DViewer.tsx](../src/components/map-designer/three/Map3DViewer.tsx)
- [src/components/map-designer/three/Scene3D.tsx](../src/components/map-designer/three/Scene3D.tsx)
- [src/components/map-designer/three/UnityCameraController.tsx](../src/components/map-designer/three/UnityCameraController.tsx)
- [src/components/map-designer/three/TransformGizmo3D.tsx](../src/components/map-designer/three/TransformGizmo3D.tsx)
- [src/components/map-designer/three/SelectionGroup3D.tsx](../src/components/map-designer/three/SelectionGroup3D.tsx)
- [src/hooks/use3DTransform.ts](../src/hooks/use3DTransform.ts)
- [src/store/mapStore.ts](../src/store/mapStore.ts)
