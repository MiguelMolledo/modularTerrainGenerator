# Map Designer

The core interface for creating modular terrain maps using drag-and-drop interactions on a 2D canvas.

## User Capabilities

- Users can create new maps with custom dimensions (width x height in inches)
- Users can drag pieces from the sidebar onto the canvas to place them
- Users can select placed pieces by clicking on them
- Users can multi-select pieces using Shift+click or box selection
- Users can move pieces by dragging them to new positions
- Users can rotate pieces using rotation controls or keyboard shortcuts
- Users can delete selected pieces using the Delete key or toolbar button
- Users can zoom in/out using mouse wheel or toolbar controls
- Users can pan the canvas by holding Space and dragging
- Users can toggle grid visibility and snap-to-grid behavior
- Users can work on multiple levels (basement, ground, floors)
- Users can switch between terrain and props editing modes
- Users can use the radial menu (Q key) to quickly access recently used pieces
- Users can see a summary panel with piece counts by type

## Constraints

- Pieces cannot overlap with each other (collision detection enforced)
- Pieces must stay within map boundaries
- Grid alignment is optional but defaults to on
- Maximum map size is limited by browser performance
- Zoom range is bounded to maintain usability

## Related Specs

- [Collision Detection](./collision-detection.md) - prevents piece overlap
- [Grid System](./grid-system.md) - snap-to-grid behavior
- [Inventory Management](./inventory.md) - available pieces
- [Undo/Redo](./undo-redo.md) - action history
- [3D Viewer](./3d-viewer.md) - 3D visualization

## Source

- [src/components/map-designer/MapDesigner.tsx](../src/components/map-designer/MapDesigner.tsx)
- [src/components/map-designer/MapCanvas.tsx](../src/components/map-designer/MapCanvas.tsx)
- [src/components/map-designer/Sidebar.tsx](../src/components/map-designer/Sidebar.tsx)
- [src/components/map-designer/Toolbar.tsx](../src/components/map-designer/Toolbar.tsx)
- [src/store/mapStore.ts](../src/store/mapStore.ts)
