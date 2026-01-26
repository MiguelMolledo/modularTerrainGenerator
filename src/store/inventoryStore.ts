import { create } from 'zustand';
import {
  supabase,
  isSupabaseConfigured,
  DbPieceShape,
  DbTerrainType,
  DbTerrainPiece,
  DbTerrainObject,
  DbCustomPiece,
  DbPieceTemplate,
  DbPieceTemplateItem,
  DbPieceVariant,
} from '@/lib/supabase';
import {
  PieceShape,
  TerrainPieceConfig,
  TerrainObject,
  TerrainTypeWithInventory,
  ModularPiece,
  CustomPiece,
  CellColors,
  PieceTemplate,
  PieceTemplateItem,
  PieceVariant,
} from '@/types';
import { useElevationStore, createElevationKey } from './elevationStore';

interface InventoryState {
  shapes: PieceShape[];
  terrainTypes: TerrainTypeWithInventory[];
  customPieces: CustomPiece[];
  pieceTemplates: PieceTemplate[];
  isLoading: boolean;
  error: string | null;

  // Actions - Shapes
  fetchShapes: () => Promise<void>;
  createShape: (data: {
    shapeKey: string;
    name: string;
    width: number;
    height: number;
    isDiagonal: boolean;
    defaultRotation: number;
  }) => Promise<PieceShape | null>;
  updateShape: (id: string, data: Partial<{
    name: string;
    width: number;
    height: number;
    isDiagonal: boolean;
    defaultRotation: number;
  }>) => Promise<boolean>;
  deleteShape: (id: string) => Promise<boolean>;

  // Actions - Terrain Types
  fetchTerrainTypes: () => Promise<void>;
  createTerrainType: (data: {
    slug: string;
    name: string;
    color: string;
    icon: string;
    description?: string;
    templateId?: string;
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
    cellColors: CellColors;
    quantity: number;
  }) => Promise<CustomPiece | null>;
  updateCustomPiece: (id: string, data: Partial<CustomPiece>) => Promise<boolean>;
  deleteCustomPiece: (id: string) => Promise<boolean>;

  // Actions - Piece Templates
  fetchPieceTemplates: () => Promise<void>;
  createPieceTemplate: (data: {
    name: string;
    description?: string;
    icon: string;
    items: { shapeId: string; quantity: number }[];
  }) => Promise<PieceTemplate | null>;
  updatePieceTemplate: (
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      items?: { shapeId: string; quantity: number }[];
    }
  ) => Promise<boolean>;
  deletePieceTemplate: (id: string) => Promise<boolean>;

  // Actions - Piece Variants
  createPieceVariant: (data: {
    terrainTypeId: string;
    shapeId: string;
    name: string;
    tags: string[];
    cellColors: CellColors;
    quantity: number;
  }) => Promise<PieceVariant | null>;
  updatePieceVariant: (id: string, data: Partial<Omit<PieceVariant, 'id' | 'shape'>>) => Promise<boolean>;
  deletePieceVariant: (id: string) => Promise<boolean>;

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
    cellColors: db.cell_colors,
    quantity: db.quantity,
    displayOrder: db.display_order,
  };
}

function dbToPieceVariant(db: DbPieceVariant, shape?: PieceShape): PieceVariant {
  return {
    id: db.id,
    terrainTypeId: db.terrain_type_id,
    shapeId: db.shape_id,
    name: db.name,
    tags: db.tags || [],
    cellColors: db.cell_colors,
    quantity: db.quantity,
    displayOrder: db.display_order,
    shape,
  };
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  shapes: [],
  terrainTypes: [],
  customPieces: [],
  pieceTemplates: [],
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

  createShape: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    // Check if shape with same key already exists
    const existingShape = get().shapes.find(s => s.shapeKey === data.shapeKey);
    if (existingShape) {
      set({ error: `A piece type with dimensions ${data.width}"x${data.height}" ${data.isDiagonal ? '(diagonal)' : ''} already exists`, isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const { data: result, error } = await supabase
        .from('piece_shapes')
        .insert({
          shape_key: data.shapeKey,
          name: data.name,
          width: data.width,
          height: data.height,
          is_diagonal: data.isDiagonal,
          default_rotation: data.defaultRotation,
          display_order: get().shapes.length + 1,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error(`A piece type with key "${data.shapeKey}" already exists`);
        }
        throw error;
      }

      const newShape = dbToPieceShape(result as DbPieceShape);

      set((state) => ({
        shapes: [...state.shapes, newShape],
        isLoading: false,
      }));

      return newShape;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create shape';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateShape: async (id, data) => {
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
      if (data.isDiagonal !== undefined) updateData.is_diagonal = data.isDiagonal;
      if (data.defaultRotation !== undefined) updateData.default_rotation = data.defaultRotation;

      const { error } = await supabase
        .from('piece_shapes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        shapes: state.shapes.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update shape';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteShape: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('piece_shapes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        shapes: state.shapes.filter((s) => s.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete shape';
      set({ error: message, isLoading: false });
      return false;
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

      // Fetch all piece variants with shape data
      const { data: variantsData, error: variantsError } = await supabase
        .from('piece_variants')
        .select('*, piece_shapes(*)');

      if (variantsError) throw variantsError;

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

      // Group variants by terrain type
      const variantsByTerrain = new Map<string, PieceVariant[]>();
      for (const variant of variantsData || []) {
        const terrainId = variant.terrain_type_id;
        if (!variantsByTerrain.has(terrainId)) {
          variantsByTerrain.set(terrainId, []);
        }
        const shape = variant.piece_shapes ? dbToPieceShape(variant.piece_shapes) : undefined;
        variantsByTerrain.get(terrainId)!.push(dbToPieceVariant(variant as DbPieceVariant, shape));
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
          variants: variantsByTerrain.get(t.id) || [],
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

      const terrainId = result.id;
      const pieces: TerrainPieceConfig[] = [];

      // Apply template if provided
      if (data.templateId) {
        const template = get().pieceTemplates.find((t) => t.id === data.templateId);
        if (template && template.items.length > 0) {
          const shapes = get().shapes;

          // Create terrain_pieces for each template item
          for (const templateItem of template.items) {
            const shape = shapes.find((s) => s.id === templateItem.shapeId);
            if (!shape) continue;

            const { data: pieceResult, error: pieceError } = await supabase
              .from('terrain_pieces')
              .insert({
                terrain_type_id: terrainId,
                shape_id: shape.id,
                quantity: templateItem.quantity,
              })
              .select('*, piece_shapes(*)')
              .single();

            if (pieceError) {
              console.error('Failed to create terrain piece:', pieceError);
              continue;
            }

            pieces.push({
              id: pieceResult.id,
              terrainTypeId: terrainId,
              shapeId: shape.id,
              quantity: templateItem.quantity,
              shape: shape,
            });
          }
        }
      }

      const newTerrain: TerrainTypeWithInventory = {
        id: result.id,
        slug: result.slug,
        name: result.name,
        color: result.color,
        icon: result.icon,
        description: result.description || undefined,
        isDefault: result.is_default,
        displayOrder: result.display_order,
        pieces,
        objects: [],
        variants: [],
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
          cell_colors: data.cellColors,
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
      if (data.cellColors !== undefined) updateData.cell_colors = data.cellColors;
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

  fetchPieceTemplates: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('piece_templates')
        .select('*')
        .order('display_order', { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch all template items with shape data
      const { data: itemsData, error: itemsError } = await supabase
        .from('piece_template_items')
        .select('*, piece_shapes(*)');

      if (itemsError) throw itemsError;

      // Group items by template
      const itemsByTemplate = new Map<string, PieceTemplateItem[]>();
      for (const item of itemsData || []) {
        const templateId = item.template_id;
        if (!itemsByTemplate.has(templateId)) {
          itemsByTemplate.set(templateId, []);
        }
        itemsByTemplate.get(templateId)!.push({
          id: item.id,
          templateId: item.template_id,
          shapeId: item.shape_id,
          quantity: item.quantity,
          shape: item.piece_shapes ? dbToPieceShape(item.piece_shapes) : undefined,
        });
      }

      // Combine into PieceTemplate
      const pieceTemplates: PieceTemplate[] = (templatesData as DbPieceTemplate[]).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        icon: t.icon,
        isDefault: t.is_default,
        displayOrder: t.display_order,
        items: itemsByTemplate.get(t.id) || [],
      }));

      set({ pieceTemplates, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch piece templates';
      set({ error: message, isLoading: false });
    }
  },

  createPieceTemplate: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      // Create template
      const { data: result, error } = await supabase
        .from('piece_templates')
        .insert({
          name: data.name,
          description: data.description || null,
          icon: data.icon,
          is_default: false,
          display_order: get().pieceTemplates.length + 1,
        })
        .select()
        .single();

      if (error) throw error;

      const templateId = result.id;
      const items: PieceTemplateItem[] = [];

      // Create template items
      if (data.items.length > 0) {
        const shapes = get().shapes;
        for (const item of data.items) {
          if (item.quantity <= 0) continue;

          const { data: itemResult, error: itemError } = await supabase
            .from('piece_template_items')
            .insert({
              template_id: templateId,
              shape_id: item.shapeId,
              quantity: item.quantity,
            })
            .select()
            .single();

          if (itemError) {
            console.error('Failed to create template item:', itemError);
            continue;
          }

          const shape = shapes.find((s) => s.id === item.shapeId);
          items.push({
            id: itemResult.id,
            templateId: templateId,
            shapeId: item.shapeId,
            quantity: item.quantity,
            shape,
          });
        }
      }

      const newTemplate: PieceTemplate = {
        id: result.id,
        name: result.name,
        description: result.description || undefined,
        icon: result.icon,
        isDefault: result.is_default,
        displayOrder: result.display_order,
        items,
      };

      set((state) => ({
        pieceTemplates: [...state.pieceTemplates, newTemplate],
        isLoading: false,
      }));

      return newTemplate;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create piece template';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updatePieceTemplate: async (id, data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    // Don't allow editing default templates
    const template = get().pieceTemplates.find((t) => t.id === id);
    if (template?.isDefault) {
      set({ error: 'Cannot edit default templates' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Update template metadata if provided
      if (data.name || data.description !== undefined || data.icon) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (data.name) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.icon) updateData.icon = data.icon;

        const { error } = await supabase
          .from('piece_templates')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      }

      // Update items if provided
      let updatedItems = template?.items || [];
      if (data.items) {
        // Delete existing items
        await supabase.from('piece_template_items').delete().eq('template_id', id);

        // Insert new items
        updatedItems = [];
        const shapes = get().shapes;
        for (const item of data.items) {
          if (item.quantity <= 0) continue;

          const { data: itemResult, error: itemError } = await supabase
            .from('piece_template_items')
            .insert({
              template_id: id,
              shape_id: item.shapeId,
              quantity: item.quantity,
            })
            .select()
            .single();

          if (itemError) continue;

          const shape = shapes.find((s) => s.id === item.shapeId);
          updatedItems.push({
            id: itemResult.id,
            templateId: id,
            shapeId: item.shapeId,
            quantity: item.quantity,
            shape,
          });
        }
      }

      set((state) => ({
        pieceTemplates: state.pieceTemplates.map((t) =>
          t.id === id
            ? {
                ...t,
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.icon && { icon: data.icon }),
                items: updatedItems,
              }
            : t
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update piece template';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deletePieceTemplate: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    // Don't allow deleting default templates
    const template = get().pieceTemplates.find((t) => t.id === id);
    if (template?.isDefault) {
      set({ error: 'Cannot delete default templates' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('piece_templates').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        pieceTemplates: state.pieceTemplates.filter((t) => t.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete piece template';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  createPieceVariant: async (data) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const terrain = get().terrainTypes.find((t) => t.id === data.terrainTypeId);
      const displayOrder = terrain?.variants.length || 0;

      const { data: result, error } = await supabase
        .from('piece_variants')
        .insert({
          terrain_type_id: data.terrainTypeId,
          shape_id: data.shapeId,
          name: data.name,
          tags: data.tags,
          cell_colors: data.cellColors,
          quantity: data.quantity,
          display_order: displayOrder + 1,
        })
        .select('*, piece_shapes(*)')
        .single();

      if (error) throw error;

      const shape = result.piece_shapes ? dbToPieceShape(result.piece_shapes) : undefined;
      const newVariant = dbToPieceVariant(result as DbPieceVariant, shape);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) =>
          t.id === data.terrainTypeId
            ? { ...t, variants: [...t.variants, newVariant] }
            : t
        ),
        isLoading: false,
      }));

      return newVariant;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create piece variant';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updatePieceVariant: async (id, data) => {
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
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.cellColors !== undefined) updateData.cell_colors = data.cellColors;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;

      const { error } = await supabase
        .from('piece_variants')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          variants: t.variants.map((v) => (v.id === id ? { ...v, ...data } : v)),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update piece variant';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deletePieceVariant: async (id) => {
    if (!isSupabaseConfigured() || !supabase) {
      set({ error: 'Supabase not configured', isLoading: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('piece_variants').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          variants: t.variants.filter((v) => v.id !== id),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete piece variant';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // Generate ModularPiece[] for mapStore compatibility
  getModularPieces: (): ModularPiece[] => {
    const { shapes, terrainTypes, customPieces } = get();
    const elevations = useElevationStore.getState().elevations;
    const pieces: ModularPiece[] = [];

    // Add predefined terrain pieces
    for (const terrain of terrainTypes) {
      for (const pieceConfig of terrain.pieces) {
        if (pieceConfig.quantity <= 0) continue;

        const shape = pieceConfig.shape || shapes.find((s) => s.id === pieceConfig.shapeId);
        if (!shape) continue;

        // Get elevation from elevation store
        // First try terrain-specific, then fall back to default
        const elevationKey = createElevationKey(terrain.slug, shape.shapeKey);
        const defaultElevationKey = createElevationKey('_default', shape.shapeKey);
        const elevation = elevations[elevationKey] || elevations[defaultElevationKey];

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
          elevation,
        });
      }
    }

    // Add custom pieces
    for (const custom of customPieces) {
      if (custom.quantity <= 0) continue;

      // Get the first terrain ID from cellColors to determine the primary terrain
      const firstTerrainId = custom.cellColors[0]?.[0];
      const primaryTerrain = terrainTypes.find((t) => t.id === firstTerrainId);
      if (!primaryTerrain) continue;

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
        cellColors: custom.cellColors,
      });
    }

    // Add piece variants (listed under ALL terrain types they contain)
    // Track which variants we've already processed to avoid duplicates
    const processedVariants = new Set<string>();

    for (const terrain of terrainTypes) {
      for (const variant of terrain.variants) {
        if (variant.quantity <= 0) continue;
        if (processedVariants.has(variant.id)) continue;
        processedVariants.add(variant.id);

        const shape = variant.shape || shapes.find((s) => s.id === variant.shapeId);
        if (!shape) continue;

        // Get all unique terrain IDs from cellColors
        const uniqueTerrainIds = new Set<string>();
        for (const row of variant.cellColors) {
          for (const cellTerrainId of row) {
            uniqueTerrainIds.add(cellTerrainId);
          }
        }

        // Add this variant to EACH terrain type it contains
        for (const cellTerrainId of uniqueTerrainIds) {
          const cellTerrain = terrainTypes.find((t) => t.id === cellTerrainId);
          if (!cellTerrain) continue;

          pieces.push({
            id: `variant-${variant.id}-${cellTerrain.slug}`,
            name: variant.name,
            terrainTypeId: cellTerrain.slug,
            size: {
              width: shape.width,
              height: shape.height,
              label: shape.name,
            },
            isDiagonal: shape.isDiagonal,
            quantity: variant.quantity,
            defaultRotation: shape.defaultRotation,
            isVariant: true,
            variantId: variant.id,
            tags: variant.tags,
            cellColors: variant.cellColors,
          });
        }
      }
    }

    return pieces;
  },
}));
