import { TerrainType, PieceSize } from '@/types';

// Supported piece sizes - easily extensible
export const PIECE_SIZES: PieceSize[] = [
  { width: 3, height: 1.5, label: '3" x 1.5"' },
  { width: 6, height: 1.5, label: '6" x 1.5"' },
  { width: 3, height: 3, label: '3" x 3"' },
  { width: 3, height: 6, label: '3" x 6"' },
];

// Piece height (for future 3D support)
export const PIECE_HEIGHT_INCHES = 0.5;

// Map dimensions
export const DEFAULT_MAP_WIDTH = 72;  // inches
export const DEFAULT_MAP_HEIGHT = 45; // inches

// Grid configuration
export const GRID_CELL_SIZE = 1.5; // inches - minimum common divisor

// Pixels per inch for rendering (adjustable for zoom)
export const BASE_PIXELS_PER_INCH = 20;

// Default terrain types
export const DEFAULT_TERRAIN_TYPES: TerrainType[] = [
  { id: 'desert', name: 'Desert', color: '#E5C07B', icon: '🏜️' },
  { id: 'forest', name: 'Forest', color: '#98C379', icon: '🌲' },
  { id: 'arid', name: 'Arid', color: '#D19A66', icon: '🏔️' },
  { id: 'water', name: 'Water', color: '#61AFEF', icon: '🌊' },
  { id: 'swamp', name: 'Swamp', color: '#56B6C2', icon: '🐊' },
  { id: 'lava', name: 'Lava', color: '#E06C75', icon: '🌋' },
];

// Default levels
export const DEFAULT_LEVELS = [-1, 0, 1, 2];
