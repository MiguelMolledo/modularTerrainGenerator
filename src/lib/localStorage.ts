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
export function initializeDefaultData(): void {
  // Only initialize if no data exists
  if (getShapes().length > 0 || getTerrainTypes().length > 0) {
    return;
  }

  // Default shapes
  const defaultShapes: PieceShape[] = [
    { id: uuidv4(), shapeKey: '6x6-flat', name: '6x6 Flat', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 1 },
    { id: uuidv4(), shapeKey: '6x6-elev', name: '6x6 Elevated', width: 6, height: 6, isDiagonal: false, defaultRotation: 0, displayOrder: 2 },
    { id: uuidv4(), shapeKey: '3x3-flat', name: '3x3 Flat', width: 3, height: 3, isDiagonal: false, defaultRotation: 0, displayOrder: 3 },
    { id: uuidv4(), shapeKey: '3x3-corner', name: '3x3 Corner', width: 3, height: 3, isDiagonal: true, defaultRotation: 0, displayOrder: 4 },
  ];
  saveShapes(defaultShapes);

  // Default terrain types with rich descriptions for AI image generation
  const desertId = uuidv4();
  const forestId = uuidv4();
  const aridId = uuidv4();
  const waterId = uuidv4();
  const swampId = uuidv4();
  const lavaId = uuidv4();

  const defaultTerrains: StoredTerrainType[] = [
    {
      id: desertId,
      slug: 'desert',
      name: 'Desert',
      color: '#E5C07B',
      icon: '🏜️',
      description: 'Arid sandy desert with rolling golden dunes, cracked dry earth, wind-sculpted rock formations, scattered bleached bones, occasional hardy cacti and thorny desert shrubs. Sun-baked stones, heat shimmer effects, and fine sand texture with warm golden-yellow and orange tones.',
      isDefault: true,
      displayOrder: 1
    },
    {
      id: forestId,
      slug: 'forest',
      name: 'Forest',
      color: '#98C379',
      icon: '🌲',
      description: 'Dense ancient forest with towering oak and pine trees, thick undergrowth of ferns and bushes, moss-covered fallen logs, mushroom clusters, twisted roots breaking through rich dark soil, scattered wildflowers, and dappled sunlight filtering through the canopy. Lush green foliage with brown earth tones.',
      isDefault: true,
      displayOrder: 2
    },
    {
      id: aridId,
      slug: 'arid',
      name: 'Arid',
      color: '#D19A66',
      icon: '🏔️',
      description: 'Harsh rocky badlands with weathered boulders, jagged cliff faces, loose gravel and scree, deep crevices, sparse dried grass clumps, ancient petrified wood, and wind-eroded stone pillars. Dusty orange-brown and terracotta earth tones with occasional grey stone outcrops.',
      isDefault: true,
      displayOrder: 3
    },
    {
      id: waterId,
      slug: 'water',
      name: 'Water',
      color: '#61AFEF',
      icon: '🌊',
      description: 'Crystal clear flowing water with gentle ripples, reflective surface showing sky and surroundings, visible riverbed stones beneath shallow areas, small fish swimming, floating leaves, foam near rocks, and subtle current patterns. Deep blue in center fading to lighter turquoise at edges with realistic water transparency.',
      isDefault: true,
      displayOrder: 4
    },
    {
      id: swampId,
      slug: 'swamp',
      name: 'Swamp',
      color: '#56B6C2',
      icon: '🐊',
      description: 'Treacherous murky swampland with dark stagnant water covered in algae and duckweed, twisted cypress trees with hanging spanish moss, tangled mangrove roots, lily pads with pale flowers, thick fog patches, bubbling mud, rotting logs, and eerie bioluminescent fungi. Murky teal-green and sickly yellow-brown tones.',
      isDefault: true,
      displayOrder: 5
    },
    {
      id: lavaId,
      slug: 'lava',
      name: 'Lava',
      color: '#E06C75',
      icon: '🌋',
      description: 'Dangerous volcanic terrain with rivers of bright molten lava flowing between cooled black basalt rock, glowing orange cracks in the hardened surface, rising smoke and heat distortion, scattered obsidian shards, ash-covered ground, and occasional gouts of flame. Intense red-orange glow contrasting with charred black volcanic rock.',
      isDefault: true,
      displayOrder: 6
    },
  ];
  saveTerrainTypes(defaultTerrains);

  // Default pieces for each terrain
  const defaultPieces: StoredTerrainPiece[] = [];
  for (const terrain of defaultTerrains) {
    for (const shape of defaultShapes) {
      defaultPieces.push({
        id: uuidv4(),
        terrainTypeId: terrain.id,
        shapeId: shape.id,
        quantity: 4,
      });
    }
  }
  saveTerrainPieces(defaultPieces);

  // Default template
  const standardTemplateId = uuidv4();
  const defaultTemplates: StoredPieceTemplate[] = [
    { id: standardTemplateId, name: 'Standard Set', description: 'Basic terrain set with flat and elevated pieces', icon: '📦', isDefault: true, displayOrder: 1 },
  ];
  savePieceTemplates(defaultTemplates);

  // Default template items
  const defaultTemplateItems: StoredTemplateItem[] = defaultShapes.map(shape => ({
    id: uuidv4(),
    templateId: standardTemplateId,
    shapeId: shape.id,
    quantity: 4,
  }));
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
