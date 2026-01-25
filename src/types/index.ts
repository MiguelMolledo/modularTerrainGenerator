// Terrain types (desert, forest, etc.)
export interface TerrainType {
  id: string;
  slug?: string; // Optional slug for backward compatibility
  name: string;
  color: string;
  icon: string;
  description?: string;
}

// Supported piece sizes in inches
export interface PieceSize {
  width: number;  // in inches
  height: number; // in inches
  label: string;
}

// Cell colors for grid-based custom pieces
// 2D array where cellColors[row][col] = terrain type UUID
export type CellColors = string[][];

// A modular piece definition
export interface ModularPiece {
  id: string;
  name: string;
  terrainTypeId: string;
  size: PieceSize;
  isDiagonal: boolean;
  imageUrl?: string;
  quantity: number; // how many the user has crafted
  defaultRotation?: number; // pre-defined rotation for diagonal pieces (0, 90, 180, 270)
  // Custom piece properties
  isCustom?: boolean;
  cellColors?: CellColors; // Grid of terrain IDs for multi-color pieces
  // Variant properties
  isVariant?: boolean;
  variantId?: string;
  tags?: string[];
}

// A piece placed on the map
export interface PlacedPiece {
  id: string;
  pieceId: string;        // reference to ModularPiece
  x: number;              // position in inches
  y: number;              // position in inches
  rotation: number;       // 0, 90, 180, 270
  level: number;          // floor level (-1 = basement, 0 = ground, 1 = first floor, etc.)
}

// A complete map
export interface GameMap {
  id: string;
  name: string;
  description?: string;
  width: number;          // in inches (default 72)
  height: number;         // in inches (default 45)
  levels: number[];       // available levels [-1, 0, 1, 2]
  placedPieces: PlacedPiece[];
  createdAt: Date;
  updatedAt: Date;
}

// Grid configuration
export interface GridConfig {
  cellSize: number;       // in inches (1.5)
  showGrid: boolean;
  snapToGrid: boolean;
  magneticSnap: boolean;  // for diagonal pieces
}

// Saved map in the inventory
export interface SavedMap {
  id: string;
  name: string;
  description?: string;
  mapWidth: number;
  mapHeight: number;
  levels: number[];
  placedPieces: PlacedPiece[];
  gridConfig?: GridConfig;
  thumbnail?: string;
  snapshot?: string;
  isCustomThumbnail?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Data structure for saving/loading maps
export interface SavedMapData {
  name: string;
  description?: string;
  mapWidth: number;
  mapHeight: number;
  levels: number[];
  placedPieces: PlacedPiece[];
  gridConfig?: GridConfig;
  thumbnail?: string;
  snapshot?: string;
  isCustomThumbnail?: boolean;
}

// =============================================
// Inventory System Types
// =============================================

// Base shape definition (from piece_shapes table)
export interface PieceShape {
  id: string;
  shapeKey: string;
  name: string;
  width: number;
  height: number;
  isDiagonal: boolean;
  defaultRotation: number;
  displayOrder: number;
}

// Terrain piece configuration (association between terrain and shape)
export interface TerrainPieceConfig {
  id: string;
  terrainTypeId: string;
  shapeId: string;
  quantity: number;
  shape?: PieceShape;
}

// 3D object definition
export interface TerrainObject {
  id: string;
  terrainTypeId: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  emoji: string;
  description?: string;
  quantity: number;
}

// Extended terrain type with inventory data
export interface TerrainTypeWithInventory {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  isDefault: boolean;
  displayOrder: number;
  pieces: TerrainPieceConfig[];
  objects: TerrainObject[];
  variants: PieceVariant[];
}

// Custom piece definition (user-created)
export interface CustomPiece {
  id: string;
  name: string;
  width: number;  // in inches (0.5 increments)
  height: number; // in inches (0.5 increments)
  cellColors: CellColors; // Grid of terrain type UUIDs
  quantity: number;
  displayOrder: number;
}

// Piece variant (modified version of a standard piece with custom colors)
export interface PieceVariant {
  id: string;
  terrainTypeId: string;
  shapeId: string;
  name: string;
  tags: string[];
  cellColors: CellColors; // Grid of terrain type UUIDs
  quantity: number;
  displayOrder: number;
  shape?: PieceShape;
}

// Piece template item (shape + quantity)
export interface PieceTemplateItem {
  id: string;
  templateId: string;
  shapeId: string;
  quantity: number;
  shape?: PieceShape;
}

// Piece template definition
export interface PieceTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  isDefault: boolean;
  displayOrder: number;
  items: PieceTemplateItem[];
}
