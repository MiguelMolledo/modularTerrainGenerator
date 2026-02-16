# Undo/Redo

Command pattern-based history system for reversible map editing operations.

## User Capabilities

- Users can undo the last action using Ctrl/Cmd+Z or toolbar button
- Users can redo undone actions using Ctrl/Cmd+Shift+Z or toolbar button
- Users can see undo/redo buttons disabled when unavailable
- Users can undo/redo multiple actions in sequence

## Supported Actions

- Add piece to map
- Remove piece from map
- Move piece (single or multiple)
- Rotate piece
- Add multiple pieces (batch)
- Remove multiple pieces (batch)
- Clear entire map

## Constraints

- History stack limited to 50 entries
- Recording disabled during undo/redo operations to prevent loops
- History cleared when loading a new map
- Each action stores before/after state for reversal

## Related Specs

- [Map Designer](./map-designer.md) - records actions during editing

## Source

- [src/store/historyStore.ts](../src/store/historyStore.ts)
- [src/hooks/useUndoRedo.ts](../src/hooks/useUndoRedo.ts)
