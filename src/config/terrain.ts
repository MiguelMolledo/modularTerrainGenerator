import { TerrainType, PieceSize } from '@/types';

// Supported piece sizes - easily extensible
export const PIECE_SIZES: PieceSize[] = [
  { width: 3, height: 1.5, label: '3" x 1.5"' },
  { width: 6, height: 1.5, label: '6" x 1.5"' },
  { width: 3, height: 3, label: '3" x 3"' },
  { width: 3, height: 6, label: '3" x 6"' },
];

// Piece height (for 3D support)
export const PIECE_HEIGHT_INCHES = 0.5;

// Height per level/floor in inches (for 3D view)
export const LEVEL_HEIGHT_INCHES = 2.5;

// Map dimensions
export const DEFAULT_MAP_WIDTH = 60;  // inches
export const DEFAULT_MAP_HEIGHT = 60; // inches

// Grid configuration
export const GRID_CELL_SIZE = 1.5; // inches - minimum common divisor

// Pixels per inch for rendering (adjustable for zoom)
export const BASE_PIXELS_PER_INCH = 20;

// Default terrain types with descriptions for AI image generation
// These descriptions are used by the AI to transform map snapshots into artistic battlemaps
export const DEFAULT_TERRAIN_TYPES: TerrainType[] = [
  {
    id: 'desert',
    name: 'Desert',
    color: '#E5C07B',
    icon: '🏜️',
    description: 'Arid sandy desert with rolling golden dunes, cracked dry earth, wind-sculpted rock formations, scattered bleached bones, occasional hardy cacti and thorny desert shrubs. Sun-baked stones, heat shimmer effects, and fine sand texture with warm golden-yellow and orange tones.'
  },
  {
    id: 'forest',
    name: 'Forest',
    color: '#98C379',
    icon: '🌲',
    description: 'Dense ancient forest with towering oak and pine trees, thick undergrowth of ferns and bushes, moss-covered fallen logs, mushroom clusters, twisted roots breaking through rich dark soil, scattered wildflowers, and dappled sunlight filtering through the canopy. Lush green foliage with brown earth tones.'
  },
  {
    id: 'arid',
    name: 'Arid',
    color: '#D19A66',
    icon: '🏔️',
    description: 'Harsh rocky badlands with weathered boulders, jagged cliff faces, loose gravel and scree, deep crevices, sparse dried grass clumps, ancient petrified wood, and wind-eroded stone pillars. Dusty orange-brown and terracotta earth tones with occasional grey stone outcrops.'
  },
  {
    id: 'water',
    name: 'Water',
    color: '#61AFEF',
    icon: '🌊',
    description: 'Crystal clear flowing water with gentle ripples, reflective surface showing sky and surroundings, visible riverbed stones beneath shallow areas, small fish swimming, floating leaves, foam near rocks, and subtle current patterns. Deep blue in center fading to lighter turquoise at edges with realistic water transparency.'
  },
  {
    id: 'swamp',
    name: 'Swamp',
    color: '#56B6C2',
    icon: '🐊',
    description: 'Treacherous murky swampland with dark stagnant water covered in algae and duckweed, twisted cypress trees with hanging spanish moss, tangled mangrove roots, lily pads with pale flowers, thick fog patches, bubbling mud, rotting logs, and eerie bioluminescent fungi. Murky teal-green and sickly yellow-brown tones.'
  },
  {
    id: 'lava',
    name: 'Lava',
    color: '#E06C75',
    icon: '🌋',
    description: 'Dangerous volcanic terrain with rivers of bright molten lava flowing between cooled black basalt rock, glowing orange cracks in the hardened surface, rising smoke and heat distortion, scattered obsidian shards, ash-covered ground, and occasional gouts of flame. Intense red-orange glow contrasting with charred black volcanic rock.'
  },
];

// Default levels
export const DEFAULT_LEVELS = [-1, 0, 1, 2];
