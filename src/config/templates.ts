import { MapTemplate } from '@/types/templates';

// Basic structure templates
export const TEMPLATES: MapTemplate[] = [
  // ============ STRUCTURES ============
  {
    id: 'cabin-small',
    name: 'Small Cabin',
    description: 'A small 6x6 cabin structure',
    category: 'structure',
    tags: ['cabin', 'building', 'house', 'shelter'],
    width: 6,
    height: 6,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },
  {
    id: 'cabin-medium',
    name: 'Medium Cabin',
    description: 'A medium 9x6 cabin with entrance',
    category: 'structure',
    tags: ['cabin', 'building', 'house'],
    width: 9,
    height: 6,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 6, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x6', terrainType: 'desert', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },
  {
    id: 'tower',
    name: 'Watch Tower',
    description: 'A 3x3 tower structure',
    category: 'structure',
    tags: ['tower', 'building', 'lookout'],
    width: 3,
    height: 3,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
    ],
  },

  // ============ WATER FEATURES ============
  {
    id: 'lake-small',
    name: 'Small Lake',
    description: 'A small 6x6 lake',
    category: 'water',
    tags: ['lake', 'water', 'pond'],
    width: 6,
    height: 6,
    allowedTerrains: ['water'],
    pieces: [
      { pieceType: '3x3', terrainType: 'water', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },
  {
    id: 'lake-medium',
    name: 'Medium Lake',
    description: 'A medium 9x6 lake',
    category: 'water',
    tags: ['lake', 'water'],
    width: 9,
    height: 6,
    allowedTerrains: ['water'],
    pieces: [
      { pieceType: '3x3', terrainType: 'water', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 6, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 6, offsetY: 3, rotation: 0 },
    ],
  },
  {
    id: 'river-segment',
    name: 'River Segment',
    description: 'A 3x6 river segment',
    category: 'water',
    tags: ['river', 'water', 'stream'],
    width: 3,
    height: 6,
    allowedTerrains: ['water'],
    pieces: [
      { pieceType: '3x6', terrainType: 'water', offsetX: 0, offsetY: 0, rotation: 0 },
    ],
  },
  {
    id: 'lake-with-corners',
    name: 'Natural Lake',
    description: 'An organic-shaped lake with diagonal corners',
    category: 'water',
    tags: ['lake', 'water', 'natural', 'organic'],
    width: 9,
    height: 9,
    allowedTerrains: ['water'],
    pieces: [
      // Center
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 3, rotation: 0 },
      // Sides
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 3, offsetY: 6, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'water', offsetX: 6, offsetY: 3, rotation: 0 },
      // Diagonal corners for organic shape
      { pieceType: 'diagonal', terrainType: 'water', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: 'diagonal', terrainType: 'water', offsetX: 6, offsetY: 0, rotation: 90 },
      { pieceType: 'diagonal', terrainType: 'water', offsetX: 6, offsetY: 6, rotation: 180 },
      { pieceType: 'diagonal', terrainType: 'water', offsetX: 0, offsetY: 6, rotation: 270 },
    ],
  },

  // ============ PATHS ============
  {
    id: 'path-straight-3',
    name: 'Short Path',
    description: 'A short 3-tile straight path',
    category: 'path',
    tags: ['path', 'road', 'trail'],
    width: 3,
    height: 9,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 6, rotation: 0 },
    ],
  },
  {
    id: 'path-straight-6',
    name: 'Long Path',
    description: 'A longer 6-tile straight path',
    category: 'path',
    tags: ['path', 'road', 'trail', 'long'],
    width: 3,
    height: 18,
    pieces: [
      { pieceType: '3x6', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x6', terrainType: 'desert', offsetX: 0, offsetY: 6, rotation: 0 },
      { pieceType: '3x6', terrainType: 'desert', offsetX: 0, offsetY: 12, rotation: 0 },
    ],
  },
  {
    id: 'path-corner',
    name: 'Path Corner',
    description: 'An L-shaped path corner',
    category: 'path',
    tags: ['path', 'road', 'corner', 'turn'],
    width: 6,
    height: 6,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },

  // ============ TERRAIN ZONES ============
  {
    id: 'terrain-zone-small',
    name: 'Small Terrain Zone',
    description: 'A 6x6 terrain fill area',
    category: 'terrain',
    tags: ['terrain', 'fill', 'zone', 'area'],
    width: 6,
    height: 6,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },
  {
    id: 'terrain-zone-medium',
    name: 'Medium Terrain Zone',
    description: 'A 9x9 terrain fill area',
    category: 'terrain',
    tags: ['terrain', 'fill', 'zone', 'area'],
    width: 9,
    height: 9,
    pieces: [
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 6, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 6, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 0, offsetY: 6, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 3, offsetY: 6, rotation: 0 },
      { pieceType: '3x3', terrainType: 'desert', offsetX: 6, offsetY: 6, rotation: 0 },
    ],
  },
  {
    id: 'terrain-strip-horizontal',
    name: 'Horizontal Strip',
    description: 'A horizontal terrain strip using 1.5" pieces',
    category: 'terrain',
    tags: ['terrain', 'strip', 'edge', 'border'],
    width: 12,
    height: 1.5,
    pieces: [
      { pieceType: '3x1.5', terrainType: 'desert', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x1.5', terrainType: 'desert', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '6x1.5', terrainType: 'desert', offsetX: 6, offsetY: 0, rotation: 0 },
    ],
  },

  // ============ DECORATIONS ============
  {
    id: 'campfire',
    name: 'Campfire Area',
    description: 'A small campfire spot',
    category: 'decoration',
    tags: ['campfire', 'fire', 'camp', 'rest'],
    width: 3,
    height: 3,
    pieces: [
      { pieceType: '3x3', terrainType: 'lava', offsetX: 0, offsetY: 0, rotation: 0 },
    ],
  },
  {
    id: 'forest-clearing',
    name: 'Forest Clearing',
    description: 'A small clearing in the forest',
    category: 'decoration',
    tags: ['forest', 'clearing', 'trees', 'nature'],
    width: 6,
    height: 6,
    allowedTerrains: ['forest'],
    pieces: [
      { pieceType: '3x3', terrainType: 'forest', offsetX: 0, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'forest', offsetX: 3, offsetY: 0, rotation: 0 },
      { pieceType: '3x3', terrainType: 'forest', offsetX: 0, offsetY: 3, rotation: 0 },
      { pieceType: '3x3', terrainType: 'forest', offsetX: 3, offsetY: 3, rotation: 0 },
    ],
  },
];

// Helper to find templates by tags
export function findTemplatesByTags(tags: string[]): MapTemplate[] {
  const normalizedTags = tags.map(t => t.toLowerCase());
  return TEMPLATES.filter(template =>
    template.tags.some(tag => normalizedTags.includes(tag.toLowerCase()))
  );
}

// Helper to find templates by category
export function findTemplatesByCategory(category: MapTemplate['category']): MapTemplate[] {
  return TEMPLATES.filter(template => template.category === category);
}

// Helper to get a specific template by ID
export function getTemplateById(id: string): MapTemplate | undefined {
  return TEMPLATES.find(template => template.id === id);
}
