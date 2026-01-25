import { create } from 'zustand';
import { supabase, DbMap, isSupabaseConfigured } from '@/lib/supabase';
import { SavedMap, SavedMapData, PlacedPiece, GridConfig } from '@/types';

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

// Convert database row to SavedMap
function dbToSavedMap(db: DbMap): SavedMap {
  return {
    id: db.id,
    name: db.name,
    description: db.description || undefined,
    mapWidth: db.map_width,
    mapHeight: db.map_height,
    levels: db.levels,
    placedPieces: db.placed_pieces as PlacedPiece[],
    gridConfig: db.grid_config as GridConfig | undefined,
    thumbnail: db.thumbnail || undefined,
    snapshot: db.snapshot || undefined,
    isCustomThumbnail: db.is_custom_thumbnail || false,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const useMapInventoryStore = create<MapInventoryState>((set, get) => ({
  savedMaps: [],
  isLoading: false,
  error: null,

  fetchMaps: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured. Please add credentials to .env.local', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const maps = (data as DbMap[]).map(dbToSavedMap);
      set({ savedMaps: maps, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maps';
      set({ error: message, isLoading: false });
    }
  },

  saveMap: async (mapData: SavedMapData, existingId?: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured. Please add credentials to .env.local', isLoading: false });
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

      const dbData: Record<string, unknown> = {
        name: mapData.name,
        description: mapData.description || null,
        map_width: mapData.mapWidth,
        map_height: mapData.mapHeight,
        levels: mapData.levels,
        placed_pieces: mapData.placedPieces,
        grid_config: mapData.gridConfig || null,
        updated_at: new Date().toISOString(),
      };

      // Always save snapshot (the auto-generated canvas image)
      if (mapData.snapshot) {
        dbData.snapshot = mapData.snapshot;
      }

      // Only update thumbnail if there's no custom thumbnail
      if (!hasCustomThumbnail && mapData.snapshot) {
        dbData.thumbnail = mapData.snapshot;
        dbData.is_custom_thumbnail = false;
      }

      let result;
      if (existingId) {
        // Update existing map
        result = await supabase
          .from('maps')
          .update(dbData)
          .eq('id', existingId)
          .select()
          .single();
      } else {
        // Create new map
        result = await supabase
          .from('maps')
          .insert(dbData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const savedMap = dbToSavedMap(result.data as DbMap);

      // Update local state
      set((state) => {
        const maps = existingId
          ? state.savedMaps.map((m) => (m.id === existingId ? savedMap : m))
          : [savedMap, ...state.savedMaps];
        return { savedMaps: maps, isLoading: false };
      });

      return savedMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  loadMap: async (id: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ isLoading: false });
      return dbToSavedMap(data as DbMap);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteMap: async (id: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
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
    const { savedMaps } = get();
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
    };

    return get().saveMap(mapData);
  },

  renameMap: async (id: string, name: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('maps')
        .update({ name, updated_at: new Date().toISOString() })
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
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Optimize image: resize and compress
      const optimizedDataUrl = await optimizeImage(file, 400, 300, 0.8);

      const { error } = await supabase
        .from('maps')
        .update({
          thumbnail: optimizedDataUrl,
          is_custom_thumbnail: true,
          updated_at: new Date().toISOString(),
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
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Get the existing map to restore snapshot as thumbnail
      const existingMap = get().savedMaps.find((m) => m.id === id);
      const snapshotToRestore = existingMap?.snapshot || null;

      const { error } = await supabase
        .from('maps')
        .update({
          thumbnail: snapshotToRestore,
          is_custom_thumbnail: false,
          updated_at: new Date().toISOString(),
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
