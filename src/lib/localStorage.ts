/**
 * LocalStorage-based data persistence for the Modular Terrain Creator
 * Replaces Supabase for offline-first, self-contained usage
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PieceShape,
  TerrainTypeWithInventory,
  TerrainPieceConfig,
  TerrainObject,
  CustomPiece,
  PieceTemplate,
  PieceTemplateItem,
  PieceVariant,
  SavedMap,
  MagnetConfig,
  CellColors,
} from '@/types';

// Storage keys
const STORAGE_KEYS = {
  SHAPES: 'mtc_shapes',
  TERRAIN_TYPES: 'mtc_terrain_types',
  TERRAIN_PIECES: 'mtc_terrain_pieces',
  TERRAIN_OBJECTS: 'mtc_terrain_objects',
  CUSTOM_PIECES: 'mtc_custom_pieces',
  PIECE_TEMPLATES: 'mtc_piece_templates',
  TEMPLATE_ITEMS: 'mtc_template_items',
  PIECE_VARIANTS: 'mtc_piece_variants',
  MAPS: 'mtc_maps',
  ELEVATIONS: 'mtc_elevations',
  APP_VERSION: 'mtc_version',
} as const;

const CURRENT_VERSION = '1.0.0';

// Generic localStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage (${key}):`, error);
  }
}

// =============================================
// Shapes
// =============================================
export function getShapes(): PieceShape[] {
  return getItem<PieceShape[]>(STORAGE_KEYS.SHAPES, []);
}

export function saveShapes(shapes: PieceShape[]): void {
  setItem(STORAGE_KEYS.SHAPES, shapes);
}

export function createShape(data: {
  shapeKey: string;
  name: string;
  width: number;
  height: number;
  isDiagonal: boolean;
  defaultRotation: number;
  baseHeight?: number;
  magnets?: MagnetConfig[];
}): PieceShape {
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
  return newShape;
}

export function updateShape(id: string, data: Partial<PieceShape>): boolean {
  const shapes = getShapes();
  const index = shapes.findIndex(s => s.id === id);
  if (index === -1) return false;
  shapes[index] = { ...shapes[index], ...data };
  saveShapes(shapes);
  return true;
}

export function deleteShape(id: string): boolean {
  const shapes = getShapes();
  const filtered = shapes.filter(s => s.id !== id);
  if (filtered.length === shapes.length) return false;
  saveShapes(filtered);
  return true;
}

// =============================================
// Terrain Types
// =============================================
interface StoredTerrainType {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  isDefault: boolean;
  displayOrder: number;
}

export function getTerrainTypes(): StoredTerrainType[] {
  return getItem<StoredTerrainType[]>(STORAGE_KEYS.TERRAIN_TYPES, []);
}

export function saveTerrainTypes(types: StoredTerrainType[]): void {
  setItem(STORAGE_KEYS.TERRAIN_TYPES, types);
}

// =============================================
// Terrain Pieces (associations between terrain and shape)
// =============================================
interface StoredTerrainPiece {
  id: string;
  terrainTypeId: string;
  shapeId: string;
  quantity: number;
  enabled?: boolean; // If false, piece won't appear in designer (defaults to true)
}

export function getTerrainPieces(): StoredTerrainPiece[] {
  return getItem<StoredTerrainPiece[]>(STORAGE_KEYS.TERRAIN_PIECES, []);
}

export function saveTerrainPieces(pieces: StoredTerrainPiece[]): void {
  setItem(STORAGE_KEYS.TERRAIN_PIECES, pieces);
}

// =============================================
// Terrain Objects (3D)
// =============================================
export function getTerrainObjects(): TerrainObject[] {
  return getItem<TerrainObject[]>(STORAGE_KEYS.TERRAIN_OBJECTS, []);
}

export function saveTerrainObjects(objects: TerrainObject[]): void {
  setItem(STORAGE_KEYS.TERRAIN_OBJECTS, objects);
}

// =============================================
// Custom Pieces
// =============================================
export function getCustomPieces(): CustomPiece[] {
  return getItem<CustomPiece[]>(STORAGE_KEYS.CUSTOM_PIECES, []);
}

export function saveCustomPieces(pieces: CustomPiece[]): void {
  setItem(STORAGE_KEYS.CUSTOM_PIECES, pieces);
}

// =============================================
// Piece Templates
// =============================================
interface StoredPieceTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  isDefault: boolean;
  displayOrder: number;
}

export function getPieceTemplates(): StoredPieceTemplate[] {
  return getItem<StoredPieceTemplate[]>(STORAGE_KEYS.PIECE_TEMPLATES, []);
}

export function savePieceTemplates(templates: StoredPieceTemplate[]): void {
  setItem(STORAGE_KEYS.PIECE_TEMPLATES, templates);
}

// =============================================
// Template Items
// =============================================
interface StoredTemplateItem {
  id: string;
  templateId: string;
  shapeId: string;
  quantity: number;
}

export function getTemplateItems(): StoredTemplateItem[] {
  return getItem<StoredTemplateItem[]>(STORAGE_KEYS.TEMPLATE_ITEMS, []);
}

export function saveTemplateItems(items: StoredTemplateItem[]): void {
  setItem(STORAGE_KEYS.TEMPLATE_ITEMS, items);
}

// =============================================
// Piece Variants
// =============================================
interface StoredPieceVariant {
  id: string;
  terrainTypeId: string;
  shapeId: string;
  name: string;
  tags: string[];
  cellColors: CellColors;
  quantity: number;
  displayOrder: number;
}

export function getPieceVariants(): StoredPieceVariant[] {
  return getItem<StoredPieceVariant[]>(STORAGE_KEYS.PIECE_VARIANTS, []);
}

export function savePieceVariants(variants: StoredPieceVariant[]): void {
  setItem(STORAGE_KEYS.PIECE_VARIANTS, variants);
}

// =============================================
// Maps
// =============================================
export function getMaps(): SavedMap[] {
  return getItem<SavedMap[]>(STORAGE_KEYS.MAPS, []);
}

export function saveMaps(maps: SavedMap[]): void {
  setItem(STORAGE_KEYS.MAPS, maps);
}

export function getMapById(id: string): SavedMap | null {
  const maps = getMaps();
  return maps.find(m => m.id === id) || null;
}

export function saveMap(mapData: Omit<SavedMap, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): SavedMap {
  const maps = getMaps();
  const now = new Date().toISOString();

  if (existingId) {
    // Update existing
    const index = maps.findIndex(m => m.id === existingId);
    if (index !== -1) {
      const updated: SavedMap = {
        ...maps[index],
        ...mapData,
        updatedAt: now,
      };
      maps[index] = updated;
      saveMaps(maps);
      return updated;
    }
  }

  // Create new
  const newMap: SavedMap = {
    ...mapData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  maps.unshift(newMap); // Add to beginning
  saveMaps(maps);
  return newMap;
}

export function deleteMap(id: string): boolean {
  const maps = getMaps();
  const filtered = maps.filter(m => m.id !== id);
  if (filtered.length === maps.length) return false;
  saveMaps(filtered);
  return true;
}

// =============================================
// Elevations
// =============================================
export function getElevations(): Record<string, { nw: number; ne: number; sw: number; se: number }> {
  return getItem<Record<string, { nw: number; ne: number; sw: number; se: number }>>(STORAGE_KEYS.ELEVATIONS, {});
}

export function saveElevations(elevations: Record<string, { nw: number; ne: number; sw: number; se: number }>): void {
  setItem(STORAGE_KEYS.ELEVATIONS, elevations);
}

// =============================================
// Full Data Export/Import
// =============================================
export interface AppData {
  version: string;
  exportedAt: string;
  shapes: PieceShape[];
  terrainTypes: StoredTerrainType[];
  terrainPieces: StoredTerrainPiece[];
  terrainObjects: TerrainObject[];
  customPieces: CustomPiece[];
  pieceTemplates: StoredPieceTemplate[];
  templateItems: StoredTemplateItem[];
  pieceVariants: StoredPieceVariant[];
  maps: SavedMap[];
  elevations: Record<string, { nw: number; ne: number; sw: number; se: number }>;
}

export function exportAllData(): AppData {
  return {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    shapes: getShapes(),
    terrainTypes: getTerrainTypes(),
    terrainPieces: getTerrainPieces(),
    terrainObjects: getTerrainObjects(),
    customPieces: getCustomPieces(),
    pieceTemplates: getPieceTemplates(),
    templateItems: getTemplateItems(),
    pieceVariants: getPieceVariants(),
    maps: getMaps(),
    elevations: getElevations(),
  };
}

export function importAllData(data: AppData, merge = false): void {
  if (!merge) {
    // Clear all existing data first
    clearAllData();
  }

  // Import each data type
  if (data.shapes?.length) {
    const existing = merge ? getShapes() : [];
    const merged = mergeById(existing, data.shapes);
    saveShapes(merged);
  }

  if (data.terrainTypes?.length) {
    const existing = merge ? getTerrainTypes() : [];
    const merged = mergeById(existing, data.terrainTypes);
    saveTerrainTypes(merged);
  }

  if (data.terrainPieces?.length) {
    const existing = merge ? getTerrainPieces() : [];
    const merged = mergeById(existing, data.terrainPieces);
    saveTerrainPieces(merged);
  }

  if (data.terrainObjects?.length) {
    const existing = merge ? getTerrainObjects() : [];
    const merged = mergeById(existing, data.terrainObjects);
    saveTerrainObjects(merged);
  }

  if (data.customPieces?.length) {
    const existing = merge ? getCustomPieces() : [];
    const merged = mergeById(existing, data.customPieces);
    saveCustomPieces(merged);
  }

  if (data.pieceTemplates?.length) {
    const existing = merge ? getPieceTemplates() : [];
    const merged = mergeById(existing, data.pieceTemplates);
    savePieceTemplates(merged);
  }

  if (data.templateItems?.length) {
    const existing = merge ? getTemplateItems() : [];
    const merged = mergeById(existing, data.templateItems);
    saveTemplateItems(merged);
  }

  if (data.pieceVariants?.length) {
    const existing = merge ? getPieceVariants() : [];
    const merged = mergeById(existing, data.pieceVariants);
    savePieceVariants(merged);
  }

  if (data.maps?.length) {
    const existing = merge ? getMaps() : [];
    const merged = mergeById(existing, data.maps);
    saveMaps(merged);
  }

  if (data.elevations) {
    const existing = merge ? getElevations() : {};
    saveElevations({ ...existing, ...data.elevations });
  }

  // Update version
  setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of existing) {
    map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item); // Incoming overwrites existing
  }
  return Array.from(map.values());
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

export function downloadAppData(filename = 'modular-terrain-backup.json'): void {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function uploadAppData(file: File, merge = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        if (!data.version) {
          throw new Error('Invalid backup file: missing version');
        }
        importAllData(data, merge);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// =============================================
// Helpers for building full data structures
// =============================================

/**
 * Get terrain types with all related data (pieces, objects, variants)
 */
export function getTerrainTypesWithInventory(): TerrainTypeWithInventory[] {
  const terrainTypes = getTerrainTypes();
  const terrainPieces = getTerrainPieces();
  const terrainObjects = getTerrainObjects();
  const variants = getPieceVariants();
  const shapes = getShapes();

  return terrainTypes.map(terrain => {
    // Get pieces for this terrain
    const pieces: TerrainPieceConfig[] = terrainPieces
      .filter(p => p.terrainTypeId === terrain.id)
      .map(p => ({
        id: p.id,
        terrainTypeId: p.terrainTypeId,
        shapeId: p.shapeId,
        quantity: p.quantity,
        enabled: p.enabled !== false, // Default to true
        shape: shapes.find(s => s.id === p.shapeId),
      }));

    // Get objects for this terrain
    const objects = terrainObjects.filter(o => o.terrainTypeId === terrain.id);

    // Get variants for this terrain
    const terrainVariants: PieceVariant[] = variants
      .filter(v => v.terrainTypeId === terrain.id)
      .map(v => ({
        ...v,
        shape: shapes.find(s => s.id === v.shapeId),
      }));

    return {
      ...terrain,
      pieces,
      objects,
      variants: terrainVariants,
    };
  });
}

/**
 * Get piece templates with their items
 */
export function getPieceTemplatesWithItems(): PieceTemplate[] {
  const templates = getPieceTemplates();
  const items = getTemplateItems();
  const shapes = getShapes();

  return templates.map(template => {
    const templateItems: PieceTemplateItem[] = items
      .filter(i => i.templateId === template.id)
      .map(i => ({
        ...i,
        shape: shapes.find(s => s.id === i.shapeId),
      }));

    return {
      ...template,
      items: templateItems,
    };
  });
}

// =============================================
// Initialize with default data if empty
// =============================================

// Fixed IDs for default shapes
const DEFAULT_SHAPE_IDS = {
  '6x6-flat': '4eb6d0b8-c348-48c7-b093-4fcf56f3ffc5',
  '3x3-flat': 'c98e0595-f447-47aa-9fde-4e4aea88603f',
  '3x3-corner': 'f65a8f78-dd26-4941-bc18-0e36b975245d',
  '6x6-e2.5-2.5-0-0': '4ce5af21-b1ef-4a46-9fd1-e9e224071e66',
  '3x6': '7bba4060-f3fb-4989-8020-9f8676010413',
  '6x6-e2.5-0-0-0': '646f4ca7-b69b-44f3-bfce-648c6f40c189',
  '6x6-e2.5-2.5-2.5-2.5': '3db79fa9-a555-40dd-9151-834cb64d878b',
  '3x1.5': '1a6c5b9b-a3e2-401c-8d9f-38f60ce660e2',
  '3x3': 'c8360339-2e72-4737-9a6c-2e93fffcc207',
  '0.5x0.5': '1acfbcdd-ae45-49d4-9525-2cef630c5625',
  '3x2-e1.5-1.5-0-0': 'dcf5ee5c-c998-41a6-ad11-f3e2ed276679',
  '6x3-diagonal-tl': '8df5aa01-b581-4ce5-bbeb-6c99cc670d26',
  '6x6-e2-2-0-2': '07b558a6-f9e2-49a0-b46e-623c72ce70a1',
} as const;

// Fixed IDs for default terrain types
const DEFAULT_TERRAIN_IDS = {
  forest: '1aa74b81-c69d-4232-b24b-0b0d0718b5af',
  desert: '0f54cc83-5e9c-4d76-bb22-526989e8c086',
  water: 'dcc432a5-8b67-49a8-a179-90c5cad225f8',
  lava: '5c5c1083-bfcb-4966-a0db-196e38708c04',
  rocky: 'b1bf1194-9cec-4c6f-9896-3f8e05147e2c',
  'lava-sand': '02bf230e-6fa8-45d0-8eda-4687e4cb7f91',
} as const;

export function initializeDefaultData(): void {
  // Only initialize if no data exists
  if (getShapes().length > 0 || getTerrainTypes().length > 0) {
    return;
  }

  // Default shapes (with fixed IDs and magnets)
  const defaultShapes: PieceShape[] = [
    { id: DEFAULT_SHAPE_IDS['6x6-flat'], shapeKey: '6x6-flat', name: '6x6 Flat', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 1, magnets: [{ size: '3x2', quantity: 16 }] },
    { id: DEFAULT_SHAPE_IDS['3x3-flat'], shapeKey: '3x3-flat', name: '3x3 Flat', width: 3, height: 3, isDiagonal: false, defaultRotation: 0, displayOrder: 3, magnets: [{ size: '3x2', quantity: 8 }] },
    { id: DEFAULT_SHAPE_IDS['3x3-corner'], shapeKey: '3x3-corner', name: '3x3 Corner', width: 3, height: 3, isDiagonal: true, defaultRotation: 0, displayOrder: 4, magnets: [{ size: '3x2', quantity: 6 }] },
    { id: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-0-0'], shapeKey: '6x6-e2.5-2.5-0-0', name: '6x6 Block Double Elevation', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 5, magnets: [{ size: '3x2', quantity: 16 }] },
    { id: DEFAULT_SHAPE_IDS['3x6'], shapeKey: '3x6', name: '3x6', width: 3, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 6, magnets: [{ size: '3x2', quantity: 12 }] },
    { id: DEFAULT_SHAPE_IDS['6x6-e2.5-0-0-0'], shapeKey: '6x6-e2.5-0-0-0', name: '6x6 Block single Elevation', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 7, magnets: [{ size: '3x2', quantity: 16 }] },
    { id: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-2.5-2.5'], shapeKey: '6x6-e2.5-2.5-2.5-2.5', name: '6x6 Block Flat', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 7, magnets: [{ size: '3x2', quantity: 16 }] },
    { id: DEFAULT_SHAPE_IDS['3x1.5'], shapeKey: '3x1.5', name: '3x2 Flat', width: 3, height: 1.5, isDiagonal: false, defaultRotation: 0, displayOrder: 8, magnets: [{ size: '3x2', quantity: 6 }] },
    { id: DEFAULT_SHAPE_IDS['3x3'], shapeKey: '3x3', name: '3x0.5 Wall 2inches', width: 3, height: 0.5, isDiagonal: false, defaultRotation: 0, displayOrder: 9, baseHeight: 2, magnets: [{ size: '3x2', quantity: 6 }] },
    { id: DEFAULT_SHAPE_IDS['0.5x0.5'], shapeKey: '0.5x0.5', name: 'Column 0.5', width: 0.5, height: 0.5, isDiagonal: false, defaultRotation: 0, displayOrder: 10, baseHeight: 2, magnets: [{ size: '3x2', quantity: 4 }] },
    { id: DEFAULT_SHAPE_IDS['3x2-e1.5-1.5-0-0'], shapeKey: '3x2-e1.5-1.5-0-0', name: 'Stairs', width: 3, height: 2, isDiagonal: false, defaultRotation: 0, displayOrder: 11, magnets: [{ size: '3x2', quantity: 8 }] },
    { id: DEFAULT_SHAPE_IDS['6x3-diagonal-tl'], shapeKey: '6x3-diagonal-tl', name: '6x3 Diagonal', width: 6, height: 3, isDiagonal: true, defaultRotation: 0, displayOrder: 12, magnets: [{ size: '3x2', quantity: 16 }] },
    { id: DEFAULT_SHAPE_IDS['6x6-e2-2-0-2'], shapeKey: '6x6-e2-2-0-2', name: '6x6 Block 3 Elevation', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 13, magnets: [{ size: '3x2', quantity: 16 }] },
  ];
  saveShapes(defaultShapes);

  // Default terrain types
  const defaultTerrains: StoredTerrainType[] = [
    {
      id: DEFAULT_TERRAIN_IDS.forest,
      slug: 'forest',
      name: 'Forest',
      color: '#228B22',
      icon: '🌲',
      description: 'Grass tiles with occasionally some trees, dead trees and dead grass',
      isDefault: true,
      displayOrder: 1
    },
    {
      id: DEFAULT_TERRAIN_IDS.desert,
      slug: 'desert',
      name: 'Desert',
      color: '#EDC9AF',
      icon: '🏜️',
      description: 'Sandy desert terrain',
      isDefault: true,
      displayOrder: 2
    },
    {
      id: DEFAULT_TERRAIN_IDS.water,
      slug: 'water',
      name: 'Water',
      color: '#4169E1',
      icon: '🌊',
      description: 'Water tiles, could be river or sea',
      isDefault: true,
      displayOrder: 3
    },
    {
      id: DEFAULT_TERRAIN_IDS.lava,
      slug: 'lava',
      name: 'Lava',
      color: '#BE5046',
      icon: '🔥',
      description: 'Lava',
      isDefault: false,
      displayOrder: 4
    },
    {
      id: DEFAULT_TERRAIN_IDS.rocky,
      slug: 'rocky',
      name: 'Rocky',
      color: '#5C6370',
      icon: '⛰️',
      description: 'Rocky tiles with dirt, small rocks, some dirt dead sticks',
      isDefault: false,
      displayOrder: 5
    },
    {
      id: DEFAULT_TERRAIN_IDS['lava-sand'],
      slug: 'lava-sand',
      name: 'Lava sand',
      color: '#282C34',
      icon: '🗻',
      description: 'Black sand',
      isDefault: false,
      displayOrder: 6
    },
  ];
  saveTerrainTypes(defaultTerrains);

  // Default pieces for each terrain (with fixed IDs)
  const defaultPieces: StoredTerrainPiece[] = [
    // Forest pieces
    { id: '40da75a5-edd1-4b02-b479-71bcf59bb065', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['6x6-flat'], quantity: 4, enabled: true },
    { id: '426fbb8b-f274-46ed-8353-5d27e3767313', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['3x3-flat'], quantity: 4, enabled: true },
    { id: '5c1a4d52-e6d5-4769-b33a-37563f6019fe', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['3x3-corner'], quantity: 4 },
    { id: '50243e6d-3423-4428-9c26-c39659c87bb8', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-0-0'], quantity: 1 },
    { id: 'b49cdc10-d15a-4517-9753-4d8c11f5fa72', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['3x6'], quantity: 1, enabled: true },
    { id: 'bcba8f97-b5c0-4bdf-b708-8e0cf2f24ea9', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-0-0-0'], quantity: 1 },
    { id: '02dc3864-5dd3-4c0c-b63e-731fb8c11ea2', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-2.5-2.5'], quantity: 1 },
    { id: 'bc50290f-a62c-408e-9974-4842b0490716', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['0.5x0.5'], quantity: 0, enabled: false },
    { id: 'bb424c5c-75c3-44d0-9cb2-eef80836cee9', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['3x3'], quantity: 0, enabled: false },
    { id: '54865761-1bfc-4976-9339-d85a38f76fad', terrainTypeId: DEFAULT_TERRAIN_IDS.forest, shapeId: DEFAULT_SHAPE_IDS['3x2-e1.5-1.5-0-0'], quantity: 0, enabled: false },
    // Water pieces
    { id: 'b931d8ef-18a5-409a-84d3-b9ee9d688014', terrainTypeId: DEFAULT_TERRAIN_IDS.water, shapeId: DEFAULT_SHAPE_IDS['3x3-corner'], quantity: 4 },
    { id: 'dcf96973-64cf-447b-8571-b643c9eafad2', terrainTypeId: DEFAULT_TERRAIN_IDS.water, shapeId: DEFAULT_SHAPE_IDS['3x2-e1.5-1.5-0-0'], quantity: 0, enabled: false },
    { id: '0966bbaa-4ffa-4943-9efa-546f0f557e4d', terrainTypeId: DEFAULT_TERRAIN_IDS.water, shapeId: DEFAULT_SHAPE_IDS['6x3-diagonal-tl'], quantity: 0, enabled: false },
    // Rocky pieces
    { id: 'f956f989-85a7-44a4-bea1-ec0d0b6233ca', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['3x3'], quantity: 0, enabled: false },
    { id: '168a2553-dc1a-4443-83c4-da202e8e4468', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['0.5x0.5'], quantity: 0, enabled: false },
    { id: 'fa2f33d1-196d-4250-8f3a-8c132b9316f1', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['3x2-e1.5-1.5-0-0'], quantity: 0, enabled: false },
    { id: '3074de96-c68f-4c53-ae36-168686c9b8ca', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['6x3-diagonal-tl'], quantity: 0, enabled: false },
    { id: '681e9bdf-ed9b-4ec9-a054-b41d3379a36e', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-0-0'], quantity: 0, enabled: true },
    { id: '0634722d-f2ae-4f72-800c-618db956525b', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-0-0-0'], quantity: 0, enabled: true },
    { id: 'ff8badc0-5ff2-47d7-af24-054c3c7df4fd', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-2.5-2.5'], quantity: 0, enabled: true },
    { id: '0b9a0120-aaa2-433c-b773-812f9ea32ce4', terrainTypeId: DEFAULT_TERRAIN_IDS.rocky, shapeId: DEFAULT_SHAPE_IDS['3x1.5'], quantity: 0, enabled: false },
    // Lava sand pieces
    { id: 'd3b7ae6b-1d9d-4460-a367-6808cbc9934c', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-0-0-0'], quantity: 0, enabled: true },
    { id: '452b22ef-a7da-4604-9d03-8a5f443677ca', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['6x6-e2.5-2.5-2.5-2.5'], quantity: 0, enabled: true },
    { id: '3f3a9a47-3d10-49af-9514-56e3f4179383', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['3x1.5'], quantity: 0, enabled: false },
    { id: '87145d1b-6a10-44b3-a8a0-f79ed8dcf860', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['6x3-diagonal-tl'], quantity: 0, enabled: false },
    { id: 'cd7b34db-cbf1-455f-9fcb-e2d86f749675', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['3x2-e1.5-1.5-0-0'], quantity: 0, enabled: false },
    { id: '9a1c4dab-5d7a-4bd5-96cd-765d8316d062', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['0.5x0.5'], quantity: 0, enabled: false },
    { id: 'd86b33b0-f7bf-4e6d-9c63-3518c6d8d3c6', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['3x3'], quantity: 0, enabled: false },
    { id: 'e9e427c4-1af8-4c71-b02f-0b85184f53d8', terrainTypeId: DEFAULT_TERRAIN_IDS['lava-sand'], shapeId: DEFAULT_SHAPE_IDS['3x3-corner'], quantity: 0, enabled: false },
    // Lava pieces
    { id: '5918d9c8-fa4b-4693-bcc7-7facde63403b', terrainTypeId: DEFAULT_TERRAIN_IDS.lava, shapeId: DEFAULT_SHAPE_IDS['6x6-flat'], quantity: 1 },
  ];
  saveTerrainPieces(defaultPieces);

  // Default template
  const standardTemplateId = 'standard-template-001';
  const defaultTemplates: StoredPieceTemplate[] = [
    { id: standardTemplateId, name: 'Standard Set', description: 'Basic terrain set with flat and elevated pieces', icon: '📦', isDefault: true, displayOrder: 1 },
  ];
  savePieceTemplates(defaultTemplates);

  // Default template items (core shapes)
  const defaultTemplateItems: StoredTemplateItem[] = [
    { id: uuidv4(), templateId: standardTemplateId, shapeId: DEFAULT_SHAPE_IDS['6x6-flat'], quantity: 4 },
    { id: uuidv4(), templateId: standardTemplateId, shapeId: DEFAULT_SHAPE_IDS['3x3-flat'], quantity: 4 },
    { id: uuidv4(), templateId: standardTemplateId, shapeId: DEFAULT_SHAPE_IDS['3x3-corner'], quantity: 4 },
    { id: uuidv4(), templateId: standardTemplateId, shapeId: DEFAULT_SHAPE_IDS['3x6'], quantity: 2 },
  ];
  saveTemplateItems(defaultTemplateItems);

  setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
}

/**
 * Check if localStorage is available and working
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
