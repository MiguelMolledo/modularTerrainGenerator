import { create } from 'zustand';
import {
  supabase,
  isSupabaseConfigured,
  DbPieceShape,
  DbTerrainType,
  DbTerrainPiece,
  DbTerrainObject,
  DbCustomPiece,
} from '@/lib/supabase';
import {
  PieceShape,
  TerrainPieceConfig,
  TerrainObject,
  TerrainTypeWithInventory,
  ModularPiece,
  CustomPiece,
  SplitDirection,
} from '@/types';

interface InventoryState {
  shapes: PieceShape[];
  terrainTypes: TerrainTypeWithInventory[];
  customPieces: CustomPiece[];
  isLoading: boolean;
  error: string | null;

  // Actions - Shapes
  fetchShapes: () => Promise<void>;

  // Actions - Terrain Types
  fetchTerrainTypes: () => Promise<void>;
  createTerrainType: (data: {
    slug: string;
    name: string;
    color: string;
    icon: string;
    description?: string;
  }) => Promise<TerrainTypeWithInventory | null>;
  updateTerrainType: (
    id: string,
    data: Partial<{
      name: string;
      color: string;
      icon: string;
      description: string;
    }>
  ) => Promise<boolean>;
  deleteTerrainType: (id: string) => Promise<boolean>;

  // Actions - Terrain Pieces
  updateTerrainPieces: (
    terrainTypeId: string,
    pieces: { shapeId: string; quantity: number }[]
  ) => Promise<boolean>;

  // Actions - 3D Objects
  createTerrainObject: (data: Omit<TerrainObject, 'id'>) => Promise<TerrainObject | null>;
  updateTerrainObject: (id: string, data: Partial<TerrainObject>) => Promise<boolean>;
  deleteTerrainObject: (id: string) => Promise<boolean>;

  // Actions - Custom Pieces
  fetchCustomPieces: () => Promise<void>;
  createCustomPiece: (data: {
    name: string;
    width: number;
    height: number;
    isSplit: boolean;
    splitDirection?: SplitDirection;
    primaryTerrainTypeId: string;
    secondaryTerrainTypeId?: string;
    quantity: number;
  }) => Promise<CustomPiece | null>;
  updateCustomPiece: (id: string, data: Partial<CustomPiece>) => Promise<boolean>;
  deleteCustomPiece: (id: string) => Promise<boolean>;

  // Utilities
  clearError: () => void;
  getModularPieces: () => ModularPiece[];
}

// Convert DB types to app types
function dbToPieceShape(db: DbPieceShape): PieceShape {
  return {
    id: db.id,
    shapeKey: db.shape_key,
    name: db.name,
    width: Number(db.width),
    height: Number(db.height),
    isDiagonal: db.is_diagonal,
    defaultRotation: db.default_rotation,
    displayOrder: db.display_order,
  };
}

function dbToTerrainObject(db: DbTerrainObject): TerrainObject {
  return {
    id: db.id,
    terrainTypeId: db.terrain_type_id,
    name: db.name,
    width: Number(db.width),
    height: Number(db.height),
    depth: Number(db.depth),
    emoji: db.emoji,
    description: db.description || undefined,
    quantity: db.quantity,
  };
}

function dbToCustomPiece(db: DbCustomPiece): CustomPiece {
  return {
    id: db.id,
    name: db.name,
    width: Number(db.width),
    height: Number(db.height),
    isSplit: db.is_split,
    splitDirection: db.split_direction || undefined,
    primaryTerrainTypeId: db.primary_terrain_type_id,
    secondaryTerrainTypeId: db.secondary_terrain_type_id || undefined,
    quantity: db.quantity,
    displayOrder: db.display_order,
  };
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  shapes: [],
  terrainTypes: [],
  customPieces: [],
  isLoading: false,
  error: null,

  fetchShapes: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('piece_shapes')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const shapes = (data as DbPieceShape[]).map(dbToPieceShape);
      set({ shapes, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shapes';
      set({ error: message, isLoading: false });
    }
  },

  fetchTerrainTypes: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Fetch terrain types
      const { data: terrainData, error: terrainError } = await supabase
        .from('terrain_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (terrainError) throw terrainError;

      // Fetch all terrain pieces with shape data
      const { data: piecesData, error: piecesError } = await supabase
        .from('terrain_pieces')
        .select('*, piece_shapes(*)');

      if (piecesError) throw piecesError;

      // Fetch all terrain objects
      const { data: objectsData, error: objectsError } = await supabase
        .from('terrain_objects')
        .select('*');

      if (objectsError) throw objectsError;

      // Group pieces by terrain type
      const piecesByTerrain = new Map<string, TerrainPieceConfig[]>();
      for (const piece of piecesData || []) {
        const terrainId = piece.terrain_type_id;
        if (!piecesByTerrain.has(terrainId)) {
          piecesByTerrain.set(terrainId, []);
        }
        piecesByTerrain.get(terrainId)!.push({
          id: piece.id,
          terrainTypeId: piece.terrain_type_id,
          shapeId: piece.shape_id,
          quantity: piece.quantity,
          shape: piece.piece_shapes ? dbToPieceShape(piece.piece_shapes) : undefined,
        });
      }

      // Group objects by terrain type
      const objectsByTerrain = new Map<string, TerrainObject[]>();
      for (const obj of (objectsData || []) as DbTerrainObject[]) {
        const terrainId = obj.terrain_type_id;
        if (!objectsByTerrain.has(terrainId)) {
          objectsByTerrain.set(terrainId, []);
        }
        objectsByTerrain.get(terrainId)!.push(dbToTerrainObject(obj));
      }

      // Combine into TerrainTypeWithInventory
      const terrainTypes: TerrainTypeWithInventory[] = (terrainData as DbTerrainType[]).map(
        (t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          color: t.color,
          icon: t.icon,
          description: t.description || undefined,
          isDefault: t.is_default,
          displayOrder: t.display_order,
          pieces: piecesByTerrain.get(t.id) || [],
          objects: objectsByTerrain.get(t.id) || [],
        })
      );

      set({ terrainTypes, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch terrain types';
      set({ error: message, isLoading: false });
    }
  },

  createTerrainType: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const { data: result, error } = await supabase
        .from('terrain_types')
        .insert({
          slug: data.slug,
          name: data.name,
          color: data.color,
          icon: data.icon,
          description: data.description || null,
          is_default: false,
          display_order: get().terrainTypes.length + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const newTerrain: TerrainTypeWithInventory = {
        id: result.id,
        slug: result.slug,
        name: result.name,
        color: result.color,
        icon: result.icon,
        description: result.description || undefined,
        isDefault: result.is_default,
        displayOrder: result.display_order,
        pieces: [],
        objects: [],
      };

      set((state) => ({
        terrainTypes: [...state.terrainTypes, newTerrain],
        isLoading: false,
      }));

      return newTerrain;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create terrain type';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateTerrainType: async (id, data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('terrain_types')
        .update({
          ...(data.name && { name: data.name }),
          ...(data.color && { color: data.color }),
          ...(data.icon && { icon: data.icon }),
          ...(data.description !== undefined && { description: data.description || null }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) =>
          t.id === id ? { ...t, ...data } : t
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update terrain type';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteTerrainType: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    // Don't allow deleting default terrain types
    const terrain = get().terrainTypes.find((t) => t.id === id);
    if (terrain?.isDefault) {
      set({ error: 'Cannot delete default terrain types' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('terrain_types').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.filter((t) => t.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete terrain type';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateTerrainPieces: async (terrainTypeId, pieces) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Upsert all pieces
      for (const piece of pieces) {
        const { error } = await supabase.from('terrain_pieces').upsert(
          {
            terrain_type_id: terrainTypeId,
            shape_id: piece.shapeId,
            quantity: piece.quantity,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'terrain_type_id,shape_id',
          }
        );

        if (error) throw error;
      }

      // Refetch terrain types to get updated data
      await get().fetchTerrainTypes();

      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pieces';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  createTerrainObject: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const { data: result, error } = await supabase
        .from('terrain_objects')
        .insert({
          terrain_type_id: data.terrainTypeId,
          name: data.name,
          width: data.width,
          height: data.height,
          depth: data.depth,
          emoji: data.emoji,
          description: data.description || null,
          quantity: data.quantity,
        })
        .select()
        .single();

      if (error) throw error;

      const newObject = dbToTerrainObject(result as DbTerrainObject);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) =>
          t.id === data.terrainTypeId
            ? { ...t, objects: [...t.objects, newObject] }
            : t
        ),
        isLoading: false,
      }));

      return newObject;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create object';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateTerrainObject: async (id, data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.width !== undefined) updateData.width = data.width;
      if (data.height !== undefined) updateData.height = data.height;
      if (data.depth !== undefined) updateData.depth = data.depth;
      if (data.emoji !== undefined) updateData.emoji = data.emoji;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;

      const { error } = await supabase
        .from('terrain_objects')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          objects: t.objects.map((o) => (o.id === id ? { ...o, ...data } : o)),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update object';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteTerrainObject: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('terrain_objects').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          objects: t.objects.filter((o) => o.id !== id),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete object';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  fetchCustomPieces: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('custom_pieces')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const customPieces = (data as DbCustomPiece[]).map(dbToCustomPiece);
      set({ customPieces, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch custom pieces';
      set({ error: message, isLoading: false });
    }
  },

  createCustomPiece: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const { data: result, error } = await supabase
        .from('custom_pieces')
        .insert({
          name: data.name,
          width: data.width,
          height: data.height,
          is_split: data.isSplit,
          split_direction: data.splitDirection || null,
          primary_terrain_type_id: data.primaryTerrainTypeId,
          secondary_terrain_type_id: data.secondaryTerrainTypeId || null,
          quantity: data.quantity,
          display_order: get().customPieces.length + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const newPiece = dbToCustomPiece(result as DbCustomPiece);

      set((state) => ({
        customPieces: [...state.customPieces, newPiece],
        isLoading: false,
      }));

      return newPiece;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create custom piece';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateCustomPiece: async (id, data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.width !== undefined) updateData.width = data.width;
      if (data.height !== undefined) updateData.height = data.height;
      if (data.isSplit !== undefined) updateData.is_split = data.isSplit;
      if (data.splitDirection !== undefined) updateData.split_direction = data.splitDirection || null;
      if (data.primaryTerrainTypeId !== undefined) updateData.primary_terrain_type_id = data.primaryTerrainTypeId;
      if (data.secondaryTerrainTypeId !== undefined) updateData.secondary_terrain_type_id = data.secondaryTerrainTypeId || null;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;

      const { error } = await supabase
        .from('custom_pieces')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        customPieces: state.customPieces.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update custom piece';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteCustomPiece: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('custom_pieces').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        customPieces: state.customPieces.filter((p) => p.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete custom piece';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // Generate ModularPiece[] for mapStore compatibility
  getModularPieces: (): ModularPiece[] => {
    const { shapes, terrainTypes, customPieces } = get();
    const pieces: ModularPiece[] = [];

    // Add predefined terrain pieces
    for (const terrain of terrainTypes) {
      for (const pieceConfig of terrain.pieces) {
        if (pieceConfig.quantity <= 0) continue;

        const shape = pieceConfig.shape || shapes.find((s) => s.id === pieceConfig.shapeId);
        if (!shape) continue;

        pieces.push({
          id: `${terrain.slug}-${shape.shapeKey}`,
          name: `${terrain.name} ${shape.name}`,
          terrainTypeId: terrain.slug,
          size: {
            width: shape.width,
            height: shape.height,
            label: shape.name,
          },
          isDiagonal: shape.isDiagonal,
          quantity: pieceConfig.quantity,
          defaultRotation: shape.defaultRotation,
        });
      }
    }

    // Add custom pieces
    for (const custom of customPieces) {
      if (custom.quantity <= 0) continue;

      const primaryTerrain = terrainTypes.find((t) => t.id === custom.primaryTerrainTypeId);
      if (!primaryTerrain) continue;

      const secondaryTerrain = custom.secondaryTerrainTypeId
        ? terrainTypes.find((t) => t.id === custom.secondaryTerrainTypeId)
        : undefined;

      pieces.push({
        id: `custom-${custom.id}`,
        name: custom.name,
        terrainTypeId: primaryTerrain.slug,
        size: {
          width: custom.width,
          height: custom.height,
          label: `${custom.width}" x ${custom.height}"`,
        },
        isDiagonal: false,
        quantity: custom.quantity,
        isCustom: true,
        isSplit: custom.isSplit,
        splitDirection: custom.splitDirection,
        secondaryTerrainTypeId: secondaryTerrain?.slug,
      });
    }

    return pieces;
  },
}));
