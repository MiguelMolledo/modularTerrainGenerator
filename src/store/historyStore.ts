/**
 * History Store - Undo/Redo System
 * Implements command pattern with history stack for map operations
 */

import { create } from 'zustand';
import { PlacedPiece } from '@/types';

// Types of actions that can be undone/redone
export type HistoryActionType =
  | 'ADD_PIECE'
  | 'REMOVE_PIECE'
  | 'MOVE_PIECE'
  | 'ROTATE_PIECE'
  | 'MOVE_PIECES'
  | 'ADD_PIECES'
  | 'REMOVE_PIECES'
  | 'CLEAR_MAP';

// History entry representing a single undoable action
export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  timestamp: number;
  // Data needed to undo the action
  undo: HistoryData;
  // Data needed to redo the action
  redo: HistoryData;
}

// Data structure for history entries
export interface HistoryData {
  pieces?: PlacedPiece[];
  piece?: PlacedPiece;
  pieceId?: string;
  pieceIds?: string[];
  updates?: Partial<PlacedPiece>;
  bulkUpdates?: Array<{ id: string; updates: Partial<PlacedPiece> }>;
  previousState?: PlacedPiece[];
}

interface HistoryState {
  // History stacks
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Max history size to prevent memory issues
  maxHistorySize: number;

  // Whether history recording is enabled (disabled during undo/redo)
  isRecording: boolean;

  // Actions
  pushHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  setRecording: (recording: boolean) => void;

  // Get current state for UI
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

// Helper to generate unique IDs
const generateId = () => crypto.randomUUID();

// Helper to get human-readable description
function getActionDescription(type: HistoryActionType, data: HistoryData): string {
  switch (type) {
    case 'ADD_PIECE':
      return 'Add piece';
    case 'REMOVE_PIECE':
      return 'Delete piece';
    case 'MOVE_PIECE':
      return 'Move piece';
    case 'ROTATE_PIECE':
      return 'Rotate piece';
    case 'MOVE_PIECES':
      return `Move ${data.bulkUpdates?.length || 0} pieces`;
    case 'ADD_PIECES':
      return `Add ${data.pieces?.length || 0} pieces`;
    case 'REMOVE_PIECES':
      return `Delete ${data.pieces?.length || 0} pieces`;
    case 'CLEAR_MAP':
      return 'Clear map';
    default:
      return 'Unknown action';
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  isRecording: true,

  pushHistory: (entry) => {
    const state = get();

    // Don't record if disabled (during undo/redo operations)
    if (!state.isRecording) return;

    const newEntry: HistoryEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };

    set((state) => {
      // Add to undo stack, trim if exceeds max size
      const newUndoStack = [...state.undoStack, newEntry];
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack.shift();
      }

      return {
        undoStack: newUndoStack,
        // Clear redo stack when new action is performed
        redoStack: [],
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const entry = state.undoStack[state.undoStack.length - 1];

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, entry],
    }));

    return entry;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const entry = state.redoStack[state.redoStack.length - 1];

    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, entry],
    }));

    return entry;
  },

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  setRecording: (recording) => set({ isRecording: recording }),

  getUndoDescription: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const entry = state.undoStack[state.undoStack.length - 1];
    return getActionDescription(entry.type, entry.undo);
  },

  getRedoDescription: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    const entry = state.redoStack[state.redoStack.length - 1];
    return getActionDescription(entry.type, entry.redo);
  },
}));
