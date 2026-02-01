import { create } from 'zustand';
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
  MagnetConfig,
} from '@/types';
import { useElevationStore, createElevationKey } from './elevationStore';
import { v4 as uuidv4 } from 'uuid';
import {
  getShapes,
  saveShapes,
  getTerrainTypes as getStoredTerrainTypes,
  saveTerrainTypes,
  getTerrainPieces,
  saveTerrainPieces,
  getTerrainObjects,
  saveTerrainObjects,
  getCustomPieces,
  saveCustomPieces,
  getPieceTemplates,
  savePieceTemplates,
  getTemplateItems,
  saveTemplateItems,
  getPieceVariants,
  savePieceVariants,
  initializeDefaultData,
} from '@/lib/localStorage';

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
    baseHeight?: number;
    magnets?: MagnetConfig[];
  }) => Promise<PieceShape | null>;
  updateShape: (id: string, data: Partial<{
    name: string;
    width: number;
    height: number;
    isDiagonal: boolean;
    defaultRotation: number;
    baseHeight?: number;
    magnets?: MagnetConfig[];
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
  updateTerrainType: (id: string, data: Partial<{
    slug: string;
    name: string;
    color: string;
    icon: string;
    description: string;
    displayOrder: number;
  }>) => Promise<boolean>;
  deleteTerrainType: (id: string) => Promise<boolean>;

  // Actions - Terrain Pieces
  updateTerrainPieceQuantity: (terrainId: string, shapeId: string, quantity: number) => Promise<boolean>;
  updateTerrainPieces: (terrainId: string, pieces: { shapeId: string; quantity: number }[]) => Promise<boolean>;
  bulkUpdateTerrainPieceQuantities: (updates: { terrainId: string; shapeId: string; quantity: number }[]) => Promise<boolean>;
  applyTemplateToTerrain: (terrainId: string, templateId: string) => Promise<boolean>;
  toggleTerrainPieceEnabled: (terrainId: string, shapeId: string, enabled: boolean) => Promise<boolean>;

  // Actions - Terrain Objects
  createTerrainObject: (data: {
    terrainTypeId: string;
    name: string;
    width: number;
    height: number;
    depth: number;
    emoji: string;
    description?: string;
    quantity: number;
  }) => Promise<TerrainObject | null>;
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
    items?: { shapeId: string; quantity: number }[];
  }) => Promise<PieceTemplate | null>;
  updatePieceTemplate: (id: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    isDefault?: boolean;
    displayOrder?: number;
    items?: { shapeId: string; quantity: number }[];
  }) => Promise<boolean>;
  deletePieceTemplate: (id: string) => Promise<boolean>;
  updateTemplateItem: (templateId: string, shapeId: string, quantity: number) => Promise<boolean>;

  // Actions - Piece Variants
  fetchPieceVariants: () => Promise<void>;
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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  shapes: [],
  terrainTypes: [],
  customPieces: [],
  pieceTemplates: [],
  isLoading: false,
  error: null,

  // =============================================
  // Shapes
  // =============================================
  fetchShapes: async () => {
    set({ isLoading: true, error: null });
    try {
      // Initialize default data if needed
      initializeDefaultData();
      const shapes = getShapes();
      set({ shapes, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shapes';
      set({ error: message, isLoading: false });
    }
  },

  createShape: async (data) => {
    // Check if shape with same key already exists
    const existingShape = get().shapes.find(s => s.shapeKey === data.shapeKey);
    if (existingShape) {
      set({ error: `A piece type "${existingShape.name}" with key "${data.shapeKey}" already exists. Use different dimensions or elevation.`, isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const shapes = getShapes();
      const newShape: PieceShape = {
        id: uuidv4(),
        shapeKey: data.shapeKey,
        name: data.name,
        width: data.width,
        height: data.height,
        isDiagonal: data.isDiagonal,
        defaultRotation: data.defaultRotation,
        displayOrder: shapes.length + 1,
        baseHeight: data.baseHeight,
        magnets: data.magnets,
      };
      shapes.push(newShape);
      saveShapes(shapes);

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
    set({ isLoading: true, error: null });
    try {
      const shapes = getShapes();
      const index = shapes.findIndex(s => s.id === id);
      if (index === -1) {
        set({ error: 'Shape not found', isLoading: false });
        return false;
      }
      shapes[index] = { ...shapes[index], ...data };
      saveShapes(shapes);

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
    set({ isLoading: true, error: null });
    try {
      const shapes = getShapes();
      const filtered = shapes.filter(s => s.id !== id);
      saveShapes(filtered);

      // Also remove associated terrain pieces
      const terrainPieces = getTerrainPieces();
      const filteredPieces = terrainPieces.filter(p => p.shapeId !== id);
      saveTerrainPieces(filteredPieces);

      // Update terrain types to remove references
      set((state) => ({
        shapes: state.shapes.filter((s) => s.id !== id),
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          pieces: t.pieces.filter((p) => p.shapeId !== id),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete shape';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // =============================================
  // Terrain Types
  // =============================================
  fetchTerrainTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      // Initialize default data if needed
      initializeDefaultData();

      const storedTypes = getStoredTerrainTypes();
      const storedPieces = getTerrainPieces();
      const storedObjects = getTerrainObjects();
      const storedVariants = getPieceVariants();
      const shapes = getShapes();

      const terrainTypes: TerrainTypeWithInventory[] = storedTypes.map(terrain => {
        // Get pieces for this terrain
        const pieces: TerrainPieceConfig[] = storedPieces
          .filter(p => p.terrainTypeId === terrain.id)
          .map(p => ({
            id: p.id,
            terrainTypeId: p.terrainTypeId,
            shapeId: p.shapeId,
            quantity: p.quantity,
            enabled: p.enabled,
            shape: shapes.find(s => s.id === p.shapeId),
          }));

        // Get objects for this terrain
        const objects = storedObjects.filter(o => o.terrainTypeId === terrain.id);

        // Get variants for this terrain
        const variants: PieceVariant[] = storedVariants
          .filter(v => v.terrainTypeId === terrain.id)
          .map(v => ({
            ...v,
            shape: shapes.find(s => s.id === v.shapeId),
          }));

        return {
          ...terrain,
          pieces,
          objects,
          variants,
        };
      });

      set({ terrainTypes, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch terrain types';
      set({ error: message, isLoading: false });
    }
  },

  createTerrainType: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const storedTypes = getStoredTerrainTypes();
      const terrainId = uuidv4();
      const newType = {
        id: terrainId,
        slug: data.slug,
        name: data.name,
        color: data.color,
        icon: data.icon,
        description: data.description || '',
        isDefault: false,
        displayOrder: storedTypes.length + 1,
      };
      storedTypes.push(newType);
      saveTerrainTypes(storedTypes);

      // Apply template if provided
      let pieces: TerrainPieceConfig[] = [];
      if (data.templateId) {
        const storedTemplateItems = getTemplateItems();
        const templateItems = storedTemplateItems.filter(i => i.templateId === data.templateId);
        const shapes = getShapes();
        const storedPieces = getTerrainPieces();

        for (const item of templateItems) {
          const newPiece = {
            id: uuidv4(),
            terrainTypeId: terrainId,
            shapeId: item.shapeId,
            quantity: item.quantity,
          };
          storedPieces.push(newPiece);
          pieces.push({
            ...newPiece,
            shape: shapes.find(s => s.id === item.shapeId),
          });
        }
        saveTerrainPieces(storedPieces);
      }

      const newTerrainType: TerrainTypeWithInventory = {
        ...newType,
        pieces,
        objects: [],
        variants: [],
      };

      set((state) => ({
        terrainTypes: [...state.terrainTypes, newTerrainType],
        isLoading: false,
      }));

      return newTerrainType;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create terrain type';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateTerrainType: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const storedTypes = getStoredTerrainTypes();
      const index = storedTypes.findIndex(t => t.id === id);
      if (index === -1) {
        set({ error: 'Terrain type not found', isLoading: false });
        return false;
      }
      storedTypes[index] = { ...storedTypes[index], ...data };
      saveTerrainTypes(storedTypes);

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
    set({ isLoading: true, error: null });
    try {
      // Delete terrain type
      const storedTypes = getStoredTerrainTypes();
      const filtered = storedTypes.filter(t => t.id !== id);
      saveTerrainTypes(filtered);

      // Delete associated pieces
      const storedPieces = getTerrainPieces();
      const filteredPieces = storedPieces.filter(p => p.terrainTypeId !== id);
      saveTerrainPieces(filteredPieces);

      // Delete associated objects
      const storedObjects = getTerrainObjects();
      const filteredObjects = storedObjects.filter(o => o.terrainTypeId !== id);
      saveTerrainObjects(filteredObjects);

      // Delete associated variants
      const storedVariants = getPieceVariants();
      const filteredVariants = storedVariants.filter(v => v.terrainTypeId !== id);
      savePieceVariants(filteredVariants);

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

  // =============================================
  // Terrain Pieces
  // =============================================
  updateTerrainPieceQuantity: async (terrainId, shapeId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getTerrainPieces();
      const existingIndex = storedPieces.findIndex(
        p => p.terrainTypeId === terrainId && p.shapeId === shapeId
      );

      if (existingIndex !== -1) {
        if (quantity === 0) {
          // Remove piece
          storedPieces.splice(existingIndex, 1);
        } else {
          // Update quantity
          storedPieces[existingIndex].quantity = quantity;
        }
      } else if (quantity > 0) {
        // Create new piece
        storedPieces.push({
          id: uuidv4(),
          terrainTypeId: terrainId,
          shapeId: shapeId,
          quantity: quantity,
        });
      }

      saveTerrainPieces(storedPieces);

      const shapes = get().shapes;
      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => {
          if (t.id !== terrainId) return t;

          const existingPieceIndex = t.pieces.findIndex(p => p.shapeId === shapeId);
          let newPieces = [...t.pieces];

          if (existingPieceIndex !== -1) {
            if (quantity === 0) {
              newPieces.splice(existingPieceIndex, 1);
            } else {
              newPieces[existingPieceIndex] = {
                ...newPieces[existingPieceIndex],
                quantity,
              };
            }
          } else if (quantity > 0) {
            newPieces.push({
              id: uuidv4(),
              terrainTypeId: terrainId,
              shapeId: shapeId,
              quantity,
              shape: shapes.find(s => s.id === shapeId),
            });
          }

          return { ...t, pieces: newPieces };
        }),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update piece quantity';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateTerrainPieces: async (terrainId, pieces) => {
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getTerrainPieces();

      // Remove all existing pieces for this terrain
      const filteredPieces = storedPieces.filter(p => p.terrainTypeId !== terrainId);

      // Add new pieces with quantity > 0
      for (const piece of pieces) {
        if (piece.quantity > 0) {
          filteredPieces.push({
            id: uuidv4(),
            terrainTypeId: terrainId,
            shapeId: piece.shapeId,
            quantity: piece.quantity,
          });
        }
      }

      saveTerrainPieces(filteredPieces);

      // Refetch terrain types to update state
      await get().fetchTerrainTypes();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update terrain pieces';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  bulkUpdateTerrainPieceQuantities: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getTerrainPieces();

      for (const update of updates) {
        const existingIndex = storedPieces.findIndex(
          p => p.terrainTypeId === update.terrainId && p.shapeId === update.shapeId
        );

        if (existingIndex !== -1) {
          if (update.quantity === 0) {
            storedPieces.splice(existingIndex, 1);
          } else {
            storedPieces[existingIndex].quantity = update.quantity;
          }
        } else if (update.quantity > 0) {
          storedPieces.push({
            id: uuidv4(),
            terrainTypeId: update.terrainId,
            shapeId: update.shapeId,
            quantity: update.quantity,
          });
        }
      }

      saveTerrainPieces(storedPieces);

      // Refetch terrain types to update state
      await get().fetchTerrainTypes();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk update quantities';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  applyTemplateToTerrain: async (terrainId, templateId) => {
    set({ isLoading: true, error: null });
    try {
      const storedItems = getTemplateItems();
      const templateItems = storedItems.filter(i => i.templateId === templateId);

      const storedPieces = getTerrainPieces();

      // Remove existing pieces for this terrain
      const filteredPieces = storedPieces.filter(p => p.terrainTypeId !== terrainId);

      // Add template pieces
      for (const item of templateItems) {
        filteredPieces.push({
          id: uuidv4(),
          terrainTypeId: terrainId,
          shapeId: item.shapeId,
          quantity: item.quantity,
        });
      }

      saveTerrainPieces(filteredPieces);

      // Refetch terrain types to update state
      await get().fetchTerrainTypes();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply template';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  toggleTerrainPieceEnabled: async (terrainId, shapeId, enabled) => {
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getTerrainPieces();
      const existingIndex = storedPieces.findIndex(
        p => p.terrainTypeId === terrainId && p.shapeId === shapeId
      );

      if (existingIndex !== -1) {
        // Update existing piece
        storedPieces[existingIndex].enabled = enabled;
      } else {
        // Create new piece record with enabled flag
        storedPieces.push({
          id: uuidv4(),
          terrainTypeId: terrainId,
          shapeId: shapeId,
          quantity: 0,
          enabled: enabled,
        });
      }
      saveTerrainPieces(storedPieces);

      // Update state
      const shapes = get().shapes;
      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => {
          if (t.id !== terrainId) return t;

          const existingPieceIndex = t.pieces.findIndex(p => p.shapeId === shapeId);
          let newPieces = [...t.pieces];

          if (existingPieceIndex !== -1) {
            // Update existing
            newPieces[existingPieceIndex] = {
              ...newPieces[existingPieceIndex],
              enabled,
            };
          } else {
            // Add new piece entry
            const shape = shapes.find(s => s.id === shapeId);
            newPieces.push({
              id: uuidv4(),
              terrainTypeId: terrainId,
              shapeId: shapeId,
              quantity: 0,
              enabled,
              shape,
            });
          }

          return {
            ...t,
            pieces: newPieces,
          };
        }),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle piece';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // =============================================
  // Terrain Objects
  // =============================================
  createTerrainObject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const storedObjects = getTerrainObjects();
      const newObject: TerrainObject = {
        id: uuidv4(),
        ...data,
      };
      storedObjects.push(newObject);
      saveTerrainObjects(storedObjects);

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
      const message = error instanceof Error ? error.message : 'Failed to create terrain object';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateTerrainObject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const storedObjects = getTerrainObjects();
      const index = storedObjects.findIndex(o => o.id === id);
      if (index === -1) {
        set({ error: 'Object not found', isLoading: false });
        return false;
      }
      storedObjects[index] = { ...storedObjects[index], ...data };
      saveTerrainObjects(storedObjects);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          objects: t.objects.map((o) =>
            o.id === id ? { ...o, ...data } : o
          ),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update terrain object';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteTerrainObject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const storedObjects = getTerrainObjects();
      const filtered = storedObjects.filter(o => o.id !== id);
      saveTerrainObjects(filtered);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          objects: t.objects.filter((o) => o.id !== id),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete terrain object';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // =============================================
  // Custom Pieces
  // =============================================
  fetchCustomPieces: async () => {
    set({ isLoading: true, error: null });
    try {
      const customPieces = getCustomPieces();
      set({ customPieces, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch custom pieces';
      set({ error: message, isLoading: false });
    }
  },

  createCustomPiece: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getCustomPieces();
      const newPiece: CustomPiece = {
        id: uuidv4(),
        name: data.name,
        width: data.width,
        height: data.height,
        cellColors: data.cellColors,
        quantity: data.quantity,
        displayOrder: storedPieces.length + 1,
      };
      storedPieces.push(newPiece);
      saveCustomPieces(storedPieces);

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
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getCustomPieces();
      const index = storedPieces.findIndex(p => p.id === id);
      if (index === -1) {
        set({ error: 'Custom piece not found', isLoading: false });
        return false;
      }
      storedPieces[index] = { ...storedPieces[index], ...data };
      saveCustomPieces(storedPieces);

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
    set({ isLoading: true, error: null });
    try {
      const storedPieces = getCustomPieces();
      const filtered = storedPieces.filter(p => p.id !== id);
      saveCustomPieces(filtered);

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

  // =============================================
  // Piece Templates
  // =============================================
  fetchPieceTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedTemplates = getPieceTemplates();
      const storedItems = getTemplateItems();
      const shapes = getShapes();

      const pieceTemplates: PieceTemplate[] = storedTemplates.map(template => {
        const items: PieceTemplateItem[] = storedItems
          .filter(i => i.templateId === template.id)
          .map(i => ({
            ...i,
            shape: shapes.find(s => s.id === i.shapeId),
          }));

        return {
          ...template,
          items,
        };
      });

      set({ pieceTemplates, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch templates';
      set({ error: message, isLoading: false });
    }
  },

  createPieceTemplate: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const storedTemplates = getPieceTemplates();
      const templateId = uuidv4();
      const newTemplate = {
        id: templateId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        isDefault: false,
        displayOrder: storedTemplates.length + 1,
      };
      storedTemplates.push(newTemplate);
      savePieceTemplates(storedTemplates);

      // Add template items if provided
      const shapes = get().shapes;
      let newItems: PieceTemplateItem[] = [];
      if (data.items && data.items.length > 0) {
        const storedItems = getTemplateItems();
        for (const item of data.items) {
          if (item.quantity > 0) {
            const newItem = {
              id: uuidv4(),
              templateId,
              shapeId: item.shapeId,
              quantity: item.quantity,
            };
            storedItems.push(newItem);
            newItems.push({
              ...newItem,
              shape: shapes.find(s => s.id === item.shapeId),
            });
          }
        }
        saveTemplateItems(storedItems);
      }

      const newPieceTemplate: PieceTemplate = {
        ...newTemplate,
        items: newItems,
      };

      set((state) => ({
        pieceTemplates: [...state.pieceTemplates, newPieceTemplate],
        isLoading: false,
      }));

      return newPieceTemplate;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create template';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updatePieceTemplate: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const storedTemplates = getPieceTemplates();
      const index = storedTemplates.findIndex(t => t.id === id);
      if (index === -1) {
        set({ error: 'Template not found', isLoading: false });
        return false;
      }

      // Update template metadata (excluding items)
      const { items, ...templateData } = data;
      storedTemplates[index] = { ...storedTemplates[index], ...templateData };
      savePieceTemplates(storedTemplates);

      // Update items if provided
      const shapes = get().shapes;
      let newItems: PieceTemplateItem[] | undefined;
      if (items !== undefined) {
        const storedItems = getTemplateItems();
        // Remove existing items for this template
        const filteredItems = storedItems.filter(i => i.templateId !== id);
        // Add new items
        newItems = [];
        for (const item of items) {
          if (item.quantity > 0) {
            const newItem = {
              id: uuidv4(),
              templateId: id,
              shapeId: item.shapeId,
              quantity: item.quantity,
            };
            filteredItems.push(newItem);
            newItems.push({
              ...newItem,
              shape: shapes.find(s => s.id === item.shapeId),
            });
          }
        }
        saveTemplateItems(filteredItems);
      }

      set((state) => ({
        pieceTemplates: state.pieceTemplates.map((t) =>
          t.id === id
            ? { ...t, ...templateData, ...(newItems !== undefined ? { items: newItems } : {}) }
            : t
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update template';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deletePieceTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Delete template
      const storedTemplates = getPieceTemplates();
      const filtered = storedTemplates.filter(t => t.id !== id);
      savePieceTemplates(filtered);

      // Delete associated items
      const storedItems = getTemplateItems();
      const filteredItems = storedItems.filter(i => i.templateId !== id);
      saveTemplateItems(filteredItems);

      set((state) => ({
        pieceTemplates: state.pieceTemplates.filter((t) => t.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete template';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateTemplateItem: async (templateId, shapeId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const storedItems = getTemplateItems();
      const existingIndex = storedItems.findIndex(
        i => i.templateId === templateId && i.shapeId === shapeId
      );

      if (existingIndex !== -1) {
        if (quantity === 0) {
          storedItems.splice(existingIndex, 1);
        } else {
          storedItems[existingIndex].quantity = quantity;
        }
      } else if (quantity > 0) {
        storedItems.push({
          id: uuidv4(),
          templateId,
          shapeId,
          quantity,
        });
      }

      saveTemplateItems(storedItems);

      const shapes = get().shapes;
      set((state) => ({
        pieceTemplates: state.pieceTemplates.map((t) => {
          if (t.id !== templateId) return t;

          const existingItemIndex = t.items.findIndex(i => i.shapeId === shapeId);
          let newItems = [...t.items];

          if (existingItemIndex !== -1) {
            if (quantity === 0) {
              newItems.splice(existingItemIndex, 1);
            } else {
              newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                quantity,
              };
            }
          } else if (quantity > 0) {
            newItems.push({
              id: uuidv4(),
              templateId,
              shapeId,
              quantity,
              shape: shapes.find(s => s.id === shapeId),
            });
          }

          return { ...t, items: newItems };
        }),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update template item';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // =============================================
  // Piece Variants
  // =============================================
  fetchPieceVariants: async () => {
    // Variants are loaded with terrain types
    await get().fetchTerrainTypes();
  },

  createPieceVariant: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const storedVariants = getPieceVariants();
      const shapes = get().shapes;
      const shape = shapes.find(s => s.id === data.shapeId);

      const newVariant = {
        id: uuidv4(),
        terrainTypeId: data.terrainTypeId,
        shapeId: data.shapeId,
        name: data.name,
        tags: data.tags,
        cellColors: data.cellColors,
        quantity: data.quantity,
        displayOrder: storedVariants.length + 1,
      };
      storedVariants.push(newVariant);
      savePieceVariants(storedVariants);

      const newPieceVariant: PieceVariant = {
        ...newVariant,
        shape,
      };

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) =>
          t.id === data.terrainTypeId
            ? { ...t, variants: [...t.variants, newPieceVariant] }
            : t
        ),
        isLoading: false,
      }));

      return newPieceVariant;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create variant';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updatePieceVariant: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const storedVariants = getPieceVariants();
      const index = storedVariants.findIndex(v => v.id === id);
      if (index === -1) {
        set({ error: 'Variant not found', isLoading: false });
        return false;
      }
      storedVariants[index] = { ...storedVariants[index], ...data };
      savePieceVariants(storedVariants);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          variants: t.variants.map((v) =>
            v.id === id ? { ...v, ...data } : v
          ),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update variant';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deletePieceVariant: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const storedVariants = getPieceVariants();
      const filtered = storedVariants.filter(v => v.id !== id);
      savePieceVariants(filtered);

      set((state) => ({
        terrainTypes: state.terrainTypes.map((t) => ({
          ...t,
          variants: t.variants.filter((v) => v.id !== id),
        })),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete variant';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // =============================================
  // Utilities
  // =============================================
  clearError: () => set({ error: null }),

  getModularPieces: (): ModularPiece[] => {
    const { shapes, terrainTypes, customPieces } = get();
    const elevations = useElevationStore.getState().elevations;
    const pieces: ModularPiece[] = [];

    // Add predefined terrain pieces
    for (const terrain of terrainTypes) {
      for (const pieceConfig of terrain.pieces) {
        // Skip if quantity is 0 or if disabled
        if (pieceConfig.quantity <= 0) continue;
        if (pieceConfig.enabled === false) continue;

        const shape = pieceConfig.shape || shapes.find((s) => s.id === pieceConfig.shapeId);
        if (!shape) continue;

        // Get elevation from elevation store
        // First try terrain-specific, then fall back to default
        const elevationKey = createElevationKey(terrain.slug, shape.shapeKey);
        const defaultElevationKey = createElevationKey('_default', shape.shapeKey);
        const elevation = elevations[elevationKey] || elevations[defaultElevationKey];

        // Determine tags based on piece characteristics
        const pieceTags: string[] = [];
        if (shape.isDiagonal) {
          pieceTags.push('corners');
        } else if (elevation && (elevation.nw !== 0 || elevation.ne !== 0 || elevation.sw !== 0 || elevation.se !== 0)) {
          pieceTags.push('elevation');
        } else {
          pieceTags.push('core');
        }

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
          baseHeight: shape.baseHeight,
          elevation,
          tags: pieceTags,
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
        tags: ['custom', 'multi'],
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

          // Combine variant's own tags with 'multi' tag
          const variantTags = [...(variant.tags || [])];
          if (!variantTags.includes('multi')) {
            variantTags.push('multi');
          }

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
            baseHeight: shape.baseHeight,
            isVariant: true,
            variantId: variant.id,
            tags: variantTags,
            cellColors: variant.cellColors,
          });
        }
      }
    }

    return pieces;
  },
}));
