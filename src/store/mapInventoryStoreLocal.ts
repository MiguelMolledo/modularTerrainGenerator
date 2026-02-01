/**
 * Map Inventory Store - LocalStorage Version
 * Manages saved maps without Supabase dependency
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { SavedMap, SavedMapData, PlacedPiece, GridConfig } from '@/types';
import {
  getMaps,
  saveMaps,
  getMapById,
  saveMap as saveMapToStorage,
  deleteMap as deleteMapFromStorage,
  isLocalStorageAvailable,
} from '@/lib/localStorage';

interface MapInventoryState {
  savedMaps: SavedMap[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMaps: () => Promise<void>;
  saveMap: (mapData: SavedMapData, existingId?: string) => Promise<SavedMap | null>;
  loadMap: (id: string) => Promise<SavedMap | null>;
  deleteMap: (id: string) => Promise<boolean>;
  duplicateMap: (id: string, newName: string) => Promise<SavedMap | null>;
  renameMap: (id: string, name: string) => Promise<boolean>;
  uploadCustomThumbnail: (id: string, file: File) => Promise<boolean>;
  removeCustomThumbnail: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useMapInventoryStore = create<MapInventoryState>((set, get) => ({
  savedMaps: [],
  isLoading: false,
  error: null,

  fetchMaps: async () => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const maps = getMaps();
      // Sort by updated date, most recent first
      maps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ savedMaps: maps, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maps';
      set({ error: message, isLoading: false });
    }
  },

  saveMap: async (mapData: SavedMapData, existingId?: string) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      // Check if existing map has a custom thumbnail
      let existingMap: SavedMap | undefined;
      if (existingId) {
        existingMap = get().savedMaps.find((m) => m.id === existingId);
      }

      // Always save snapshot (auto-generated), only update thumbnail if not custom
      const hasCustomThumbnail = existingMap?.isCustomThumbnail;

      const now = new Date().toISOString();
      let savedMap: SavedMap;

      if (existingId && existingMap) {
        // Update existing map
        savedMap = {
          ...existingMap,
          name: mapData.name,
          description: mapData.description,
          mapWidth: mapData.mapWidth,
          mapHeight: mapData.mapHeight,
          levels: mapData.levels,
          placedPieces: mapData.placedPieces,
          gridConfig: mapData.gridConfig,
          snapshot: mapData.snapshot || existingMap.snapshot,
          // Only update thumbnail if not custom
          thumbnail: hasCustomThumbnail ? existingMap.thumbnail : (mapData.snapshot || existingMap.thumbnail),
          isCustomThumbnail: hasCustomThumbnail,
          updatedAt: now,
        };
      } else {
        // Create new map
        savedMap = {
          id: uuidv4(),
          name: mapData.name,
          description: mapData.description,
          mapWidth: mapData.mapWidth,
          mapHeight: mapData.mapHeight,
          levels: mapData.levels,
          placedPieces: mapData.placedPieces,
          gridConfig: mapData.gridConfig,
          thumbnail: mapData.snapshot || mapData.thumbnail,
          snapshot: mapData.snapshot,
          isCustomThumbnail: false,
          createdAt: now,
          updatedAt: now,
        };
      }

      // Save to localStorage
      const maps = getMaps();
      if (existingId) {
        const index = maps.findIndex(m => m.id === existingId);
        if (index !== -1) {
          maps[index] = savedMap;
        }
      } else {
        maps.unshift(savedMap);
      }
      saveMaps(maps);

      // Update local state
      set((state) => {
        const updatedMaps = existingId
          ? state.savedMaps.map((m) => (m.id === existingId ? savedMap : m))
          : [savedMap, ...state.savedMaps];
        return { savedMaps: updatedMaps, isLoading: false };
      });

      return savedMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  loadMap: async (id: string) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const map = getMapById(id);
      set({ isLoading: false });
      return map;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteMap: async (id: string) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const success = deleteMapFromStorage(id);
      if (success) {
        set((state) => ({
          savedMaps: state.savedMaps.filter((m) => m.id !== id),
          isLoading: false,
        }));
      }
      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete map';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  duplicateMap: async (id: string, newName: string) => {
    const { savedMaps, saveMap } = get();
    const original = savedMaps.find((m) => m.id === id);
    if (!original) {
      set({ error: 'Map not found' });
      return null;
    }

    const mapData: SavedMapData = {
      name: newName,
      description: original.description,
      mapWidth: original.mapWidth,
      mapHeight: original.mapHeight,
      levels: original.levels,
      placedPieces: original.placedPieces,
      gridConfig: original.gridConfig,
      thumbnail: original.thumbnail,
      snapshot: original.snapshot,
    };

    return saveMap(mapData);
  },

  renameMap: async (id: string, name: string) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const maps = getMaps();
      const index = maps.findIndex(m => m.id === id);
      if (index === -1) {
        set({ error: 'Map not found', isLoading: false });
        return false;
      }

      maps[index] = {
        ...maps[index],
        name,
        updatedAt: new Date().toISOString(),
      };
      saveMaps(maps);

      set((state) => ({
        savedMaps: state.savedMaps.map((m) =>
          m.id === id ? { ...m, name, updatedAt: new Date().toISOString() } : m
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename map';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  uploadCustomThumbnail: async (id: string, file: File) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Optimize image
      const optimizedDataUrl = await optimizeImage(file, 400, 300, 0.8);

      const maps = getMaps();
      const index = maps.findIndex(m => m.id === id);
      if (index === -1) {
        set({ error: 'Map not found', isLoading: false });
        return false;
      }

      maps[index] = {
        ...maps[index],
        thumbnail: optimizedDataUrl,
        isCustomThumbnail: true,
        updatedAt: new Date().toISOString(),
      };
      saveMaps(maps);

      set((state) => ({
        savedMaps: state.savedMaps.map((m) =>
          m.id === id
            ? { ...m, thumbnail: optimizedDataUrl, isCustomThumbnail: true, updatedAt: new Date().toISOString() }
            : m
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload thumbnail';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  removeCustomThumbnail: async (id: string) => {
    if (!isLocalStorageAvailable()) {
      set({ error: 'LocalStorage not available', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const maps = getMaps();
      const index = maps.findIndex(m => m.id === id);
      if (index === -1) {
        set({ error: 'Map not found', isLoading: false });
        return false;
      }

      const snapshotToRestore = maps[index].snapshot || undefined;
      maps[index] = {
        ...maps[index],
        thumbnail: snapshotToRestore,
        isCustomThumbnail: false,
        updatedAt: new Date().toISOString(),
      };
      saveMaps(maps);

      set((state) => ({
        savedMaps: state.savedMaps.map((m) =>
          m.id === id
            ? { ...m, thumbnail: m.snapshot, isCustomThumbnail: false, updatedAt: new Date().toISOString() }
            : m
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove thumbnail';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

// Helper function to optimize image
async function optimizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
