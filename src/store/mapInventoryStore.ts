/**
 * Map Inventory Store - Supabase Version
 * Manages saved maps using Supabase with user authentication
 */

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { SavedMap, SavedMapData } from '@/types';
import type { DbMap } from '@/lib/supabase';

// Convert DB row to app SavedMap
function dbMapToSavedMap(row: DbMap): SavedMap {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    mapWidth: row.map_width,
    mapHeight: row.map_height,
    levels: row.levels,
    placedPieces: row.placed_pieces as SavedMap['placedPieces'],
    gridConfig: row.grid_config as SavedMap['gridConfig'],
    thumbnail: row.thumbnail ?? undefined,
    snapshot: row.snapshot ?? undefined,
    isCustomThumbnail: row.is_custom_thumbnail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

export const useMapInventoryStore = create<MapInventoryState>((set, get) => ({
  savedMaps: [],
  isLoading: false,
  error: null,

  fetchMaps: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const maps = (data as DbMap[]).map(dbMapToSavedMap);
      set({ savedMaps: maps, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maps';
      set({ error: message, isLoading: false });
    }
  },

  saveMap: async (mapData: SavedMapData, existingId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const userId = await getCurrentUserId();

      if (existingId) {
        // Check if existing map has a custom thumbnail
        const existingMap = get().savedMaps.find((m) => m.id === existingId);
        const hasCustomThumbnail = existingMap?.isCustomThumbnail;

        const updateData = {
          name: mapData.name,
          description: mapData.description || null,
          map_width: mapData.mapWidth,
          map_height: mapData.mapHeight,
          levels: mapData.levels,
          placed_pieces: mapData.placedPieces,
          grid_config: mapData.gridConfig || null,
          snapshot: mapData.snapshot || (existingMap?.snapshot ?? null),
          // Only update thumbnail if not custom
          ...(hasCustomThumbnail
            ? {}
            : { thumbnail: mapData.snapshot || (existingMap?.thumbnail ?? null) }),
        };

        const { data, error } = await supabase
          .from('maps')
          .update(updateData)
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;

        const savedMap = dbMapToSavedMap(data as DbMap);
        set((state) => ({
          savedMaps: state.savedMaps.map((m) => (m.id === existingId ? savedMap : m)),
          isLoading: false,
        }));
        return savedMap;
      } else {
        // Create new map
        const insertData = {
          user_id: userId,
          name: mapData.name,
          description: mapData.description || null,
          map_width: mapData.mapWidth,
          map_height: mapData.mapHeight,
          levels: mapData.levels,
          placed_pieces: mapData.placedPieces,
          grid_config: mapData.gridConfig || null,
          thumbnail: mapData.snapshot || mapData.thumbnail || null,
          snapshot: mapData.snapshot || null,
          is_custom_thumbnail: false,
        };

        const { data, error } = await supabase
          .from('maps')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        const savedMap = dbMapToSavedMap(data as DbMap);
        set((state) => ({
          savedMaps: [savedMap, ...state.savedMaps],
          isLoading: false,
        }));
        return savedMap;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  loadMap: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const map = dbMapToSavedMap(data as DbMap);
      set({ isLoading: false });
      return map;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteMap: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('maps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        savedMaps: state.savedMaps.filter((m) => m.id !== id),
        isLoading: false,
      }));
      return true;
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
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('maps')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

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
    set({ isLoading: true, error: null });
    try {
      const optimizedDataUrl = await optimizeImage(file, 400, 300, 0.8);

      const supabase = createClient();
      const { error } = await supabase
        .from('maps')
        .update({
          thumbnail: optimizedDataUrl,
          is_custom_thumbnail: true,
        })
        .eq('id', id);

      if (error) throw error;

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
    set({ isLoading: true, error: null });
    try {
      const existingMap = get().savedMaps.find((m) => m.id === id);
      if (!existingMap) {
        set({ error: 'Map not found', isLoading: false });
        return false;
      }

      const snapshotToRestore = existingMap.snapshot || null;

      const supabase = createClient();
      const { error } = await supabase
        .from('maps')
        .update({
          thumbnail: snapshotToRestore,
          is_custom_thumbnail: false,
        })
        .eq('id', id);

      if (error) throw error;

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
