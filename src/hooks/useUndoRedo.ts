/**
 * useUndoRedo Hook
 * Provides undo/redo functionality for map operations
 * Integrates historyStore with mapStore
 */

import { useCallback, useEffect } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useHistoryStore, HistoryActionType } from '@/store/historyStore';
import { PlacedPiece } from '@/types';

export function useUndoRedo() {
  const {
    placedPieces,
    addPlacedPiece,
    removePlacedPiece,
    updatePlacedPiece,
    updatePlacedPieces,
    addPlacedPieces,
  } = useMapStore();

  const {
    pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
    setRecording,
    getUndoDescription,
    getRedoDescription,
    clearHistory,
  } = useHistoryStore();

  // Execute undo operation
  const undo = useCallback(() => {
    const entry = undoHistory();
    if (!entry) return;

    // Disable recording while applying undo
    setRecording(false);

    try {
      switch (entry.type) {
        case 'ADD_PIECE':
          // Undo add = remove the piece
          if (entry.undo.pieceId) {
            removePlacedPiece(entry.undo.pieceId);
          }
          break;

        case 'REMOVE_PIECE':
          // Undo remove = add the piece back
          if (entry.undo.piece) {
            addPlacedPiece(entry.undo.piece);
          }
          break;

        case 'MOVE_PIECE':
        case 'ROTATE_PIECE':
          // Undo move/rotate = restore previous position/rotation
          if (entry.undo.pieceId && entry.undo.updates) {
            updatePlacedPiece(entry.undo.pieceId, entry.undo.updates);
          }
          break;

        case 'MOVE_PIECES':
          // Undo bulk move = restore previous positions
          if (entry.undo.bulkUpdates) {
            updatePlacedPieces(entry.undo.bulkUpdates);
          }
          break;

        case 'ADD_PIECES':
          // Undo add multiple = remove all added pieces
          if (entry.undo.pieceIds) {
            entry.undo.pieceIds.forEach((id) => removePlacedPiece(id));
          }
          break;

        case 'REMOVE_PIECES':
          // Undo remove multiple = add all pieces back
          if (entry.undo.pieces) {
            addPlacedPieces(entry.undo.pieces);
          }
          break;

        case 'CLEAR_MAP':
          // Undo clear = restore all pieces
          if (entry.undo.previousState) {
            addPlacedPieces(entry.undo.previousState);
          }
          break;
      }
    } finally {
      setRecording(true);
    }
  }, [undoHistory, setRecording, removePlacedPiece, addPlacedPiece, updatePlacedPiece, updatePlacedPieces, addPlacedPieces]);

  // Execute redo operation
  const redo = useCallback(() => {
    const entry = redoHistory();
    if (!entry) return;

    // Disable recording while applying redo
    setRecording(false);

    try {
      switch (entry.type) {
        case 'ADD_PIECE':
          // Redo add = add the piece
          if (entry.redo.piece) {
            addPlacedPiece(entry.redo.piece);
          }
          break;

        case 'REMOVE_PIECE':
          // Redo remove = remove the piece
          if (entry.redo.pieceId) {
            removePlacedPiece(entry.redo.pieceId);
          }
          break;

        case 'MOVE_PIECE':
        case 'ROTATE_PIECE':
          // Redo move/rotate = apply the new position/rotation
          if (entry.redo.pieceId && entry.redo.updates) {
            updatePlacedPiece(entry.redo.pieceId, entry.redo.updates);
          }
          break;

        case 'MOVE_PIECES':
          // Redo bulk move = apply new positions
          if (entry.redo.bulkUpdates) {
            updatePlacedPieces(entry.redo.bulkUpdates);
          }
          break;

        case 'ADD_PIECES':
          // Redo add multiple = add all pieces
          if (entry.redo.pieces) {
            addPlacedPieces(entry.redo.pieces);
          }
          break;

        case 'REMOVE_PIECES':
          // Redo remove multiple = remove all pieces
          if (entry.redo.pieceIds) {
            entry.redo.pieceIds.forEach((id) => removePlacedPiece(id));
          }
          break;

        case 'CLEAR_MAP':
          // Redo clear = remove all pieces
          if (entry.redo.pieceIds) {
            entry.redo.pieceIds.forEach((id) => removePlacedPiece(id));
          }
          break;
      }
    } finally {
      setRecording(true);
    }
  }, [redoHistory, setRecording, addPlacedPiece, removePlacedPiece, updatePlacedPiece, updatePlacedPieces, addPlacedPieces]);

  // Record adding a piece
  const recordAddPiece = useCallback((piece: PlacedPiece) => {
    pushHistory({
      type: 'ADD_PIECE',
      undo: { pieceId: piece.id },
      redo: { piece },
    });
  }, [pushHistory]);

  // Record removing a piece
  const recordRemovePiece = useCallback((piece: PlacedPiece) => {
    pushHistory({
      type: 'REMOVE_PIECE',
      undo: { piece },
      redo: { pieceId: piece.id },
    });
  }, [pushHistory]);

  // Record moving a piece
  const recordMovePiece = useCallback((
    pieceId: string,
    previousPosition: { x: number; y: number },
    newPosition: { x: number; y: number }
  ) => {
    pushHistory({
      type: 'MOVE_PIECE',
      undo: { pieceId, updates: previousPosition },
      redo: { pieceId, updates: newPosition },
    });
  }, [pushHistory]);

  // Record rotating a piece
  const recordRotatePiece = useCallback((
    pieceId: string,
    previousRotation: number,
    newRotation: number
  ) => {
    pushHistory({
      type: 'ROTATE_PIECE',
      undo: { pieceId, updates: { rotation: previousRotation } },
      redo: { pieceId, updates: { rotation: newRotation } },
    });
  }, [pushHistory]);

  // Record moving multiple pieces (supports position and rotation)
  const recordMovePieces = useCallback((
    moves: Array<{
      id: string;
      from: { x: number; y: number; rotation?: number };
      to: { x: number; y: number; rotation?: number };
    }>
  ) => {
    pushHistory({
      type: 'MOVE_PIECES',
      undo: { bulkUpdates: moves.map((m) => ({ id: m.id, updates: m.from })) },
      redo: { bulkUpdates: moves.map((m) => ({ id: m.id, updates: m.to })) },
    });
  }, [pushHistory]);

  // Record adding multiple pieces
  const recordAddPieces = useCallback((pieces: PlacedPiece[]) => {
    pushHistory({
      type: 'ADD_PIECES',
      undo: { pieceIds: pieces.map((p) => p.id) },
      redo: { pieces },
    });
  }, [pushHistory]);

  // Record removing multiple pieces
  const recordRemovePieces = useCallback((pieces: PlacedPiece[]) => {
    pushHistory({
      type: 'REMOVE_PIECES',
      undo: { pieces },
      redo: { pieceIds: pieces.map((p) => p.id) },
    });
  }, [pushHistory]);

  // Record clearing the map
  const recordClearMap = useCallback((previousPieces: PlacedPiece[]) => {
    if (previousPieces.length === 0) return; // Don't record if already empty
    pushHistory({
      type: 'CLEAR_MAP',
      undo: { previousState: previousPieces },
      redo: { pieceIds: previousPieces.map((p) => p.id) },
    });
  }, [pushHistory]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    // Actions
    undo,
    redo,
    clearHistory,

    // State
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoDescription: getUndoDescription(),
    redoDescription: getRedoDescription(),

    // Recording functions
    recordAddPiece,
    recordRemovePiece,
    recordMovePiece,
    recordRotatePiece,
    recordMovePieces,
    recordAddPieces,
    recordRemovePieces,
    recordClearMap,
  };
}
