# Radial Menu

Quick-access circular menu for recently used pieces, activated by keyboard shortcut.

## User Capabilities

- Users can press Q key to open radial menu at cursor position
- Users can see recently used pieces arranged in a circle
- Users can click a piece in the menu to select it for placement
- Users can quickly access frequently used pieces without sidebar navigation
- Users can close the menu by clicking outside or pressing Escape

## Menu Contents

- Shows last N recently used pieces
- Pieces displayed with terrain color and shape preview
- Updates automatically as user places different pieces

## Constraints

- Menu appears at current cursor position
- Limited to most recent pieces (configurable limit)
- Menu closes after selection
- Only available in map designer view

## Related Specs

- [Map Designer](./map-designer.md) - radial menu integration
- [Inventory Management](./inventory.md) - piece data

## Source

- [src/components/map-designer/RadialMenu.tsx](../src/components/map-designer/RadialMenu.tsx)
- [src/store/mapStore.ts](../src/store/mapStore.ts) - recently used tracking
