import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for region-based layout suggestions with path and elevation support
const LAYOUT_SUGGESTION_SYSTEM = `You are a D&D/tabletop RPG map designer assistant. Given a scene description, available terrain types, and map dimensions, define terrain REGIONS, PATHS, and ELEVATION ZONES for a tactical battle map.

Your task is to define:
1. RECTANGULAR REGIONS where terrain types fill large areas (these are the "background")
2. PATHS for rivers, roads, or streams that snake across the map (optional)
3. ELEVATION ZONES for elevated platforms, hills, or cliffs (optional)

Our system will automatically fill each area with the appropriate terrain pieces, including ramps and edges for elevation transitions.

CRITICAL RULES:
- COVER THE ENTIRE MAP with terrain regions - NO empty spaces allowed
- Define 4-10 terrain regions that together cover 100% of the map area
- PATHS cut through regions (have priority over regions)
- ELEVATION ZONES are elevated platforms that also cut through regions
- REGIONS MUST NOT OVERLAP with each other (but paths/elevation can cross regions)
- Coordinates are in inches, starting from (0,0) at top-left
- Use coordinates that are multiples of 6 for alignment (0, 6, 12, 18, 24, etc.)

ELEVATION ZONES:
- Define rectangular areas that should be elevated
- The system will automatically place:
  - Platform pieces (all corners elevated) in the center
  - Edge pieces (2 corners elevated) along the borders
  - Corner pieces (1 corner elevated) at the corners
  - Ramp pieces for smooth transitions to flat ground
- Great for hills, cliffs, raised platforms, elevated terrain

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "regions": [
    {"terrain": "forest", "x": 0, "y": 0, "width": 60, "height": 60}
  ],
  "paths": [
    {"terrain": "water", "width": 6, "waypoints": [{"x": 0, "y": 30}, {"x": 60, "y": 30}]}
  ],
  "elevation_zones": [
    {"terrain": "forest", "x": 12, "y": 12, "width": 36, "height": 36, "height_inches": 2.5}
  ],
  "description": "Brief description of the layout strategy"
}`;

// System prompt for dungeon-specific layouts with rooms and corridors
const DUNGEON_LAYOUT_SYSTEM = `You are a dungeon architect for tabletop RPG battle maps. Given a dungeon description, map dimensions, and available terrain types, design a dungeon layout with ROOMS and CORRIDORS.

DUNGEON DESIGN PRINCIPLES:
1. ROOMS are rectangular areas sized in 3-inch multiples (minimum 6x6, typical 9x9 to 18x18)
2. CORRIDORS connect rooms and are either 3" wide (narrow) or 6" wide (wide)
3. DIAGONAL TRANSITIONS: Where narrow corridors (3") meet larger rooms, set useDiagonalTransitions: true
4. Room TYPES indicate purpose: entrance, chamber, boss, treasure, trap, shrine

COORDINATE RULES:
- All coordinates in inches, preferably multiples of 3 (0, 3, 6, 9, 12, etc.)
- Map origin (0,0) is top-left
- Rooms must NOT overlap (leave corridor space between them)
- Plan corridors to connect room edges, not overlap rooms

ROOM SIZING GUIDE:
- Small room: 6x6 or 6x9 (guards, storage, shrine)
- Medium room: 9x9 or 9x12 (chambers, trap rooms)
- Large room: 12x12 to 18x18 (boss arena, treasure vault)
- Entrance: Usually 6x6 to 9x9, placed near a map edge

CORRIDOR RULES:
- Narrow corridor (3"): Typical dungeon passage, creates tension
- Wide corridor (6"): Main thoroughfare, grand halls
- useDiagonalTransitions: true when corridor width < room width (creates natural widening effect)
- style "L-shaped" for corridors that need to turn corners

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "rooms": [
    {"id": "entrance", "type": "entrance", "x": 0, "y": 21, "width": 9, "height": 9, "connections": ["hall"], "description": "Stone archway entrance"},
    {"id": "hall", "type": "chamber", "x": 15, "y": 15, "width": 12, "height": 12, "connections": ["entrance", "boss"], "description": "Central gathering hall"},
    {"id": "boss", "type": "boss", "x": 33, "y": 12, "width": 15, "height": 15, "connections": ["hall"], "description": "Dragon's lair"}
  ],
  "corridors": [
    {"id": "corr-1", "fromRoom": "entrance", "toRoom": "hall", "width": 3, "style": "straight", "useDiagonalTransitions": true},
    {"id": "corr-2", "fromRoom": "hall", "toRoom": "boss", "width": 6, "style": "straight", "useDiagonalTransitions": false}
  ],
  "terrain": "stone",
  "description": "A dungeon with narrow entrance corridor opening into central hall, leading to boss chamber"
}`;

interface CornerElevations {
  nw: number;
  ne: number;
  sw: number;
  se: number;
}

interface AvailablePiece {
  id: string;
  name: string;
  terrainType: string;
  width: number;
  height: number;
  isDiagonal: boolean;
  elevation?: CornerElevations;
}

interface TerrainRegion {
  terrain: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PathWaypoint {
  x: number;
  y: number;
}

interface TerrainPath {
  terrain: string;
  width: number;
  waypoints: PathWaypoint[];
}

interface ElevationZone {
  terrain: string;
  x: number;
  y: number;
  width: number;
  height: number;
  height_inches: number;
}

interface LayoutResult {
  regions: TerrainRegion[];
  paths?: TerrainPath[];
  elevation_zones?: ElevationZone[];
  description: string;
}

interface SuggestLayoutRequest {
  sceneDescription: string;
  mapWidth: number;
  mapHeight: number;
  availablePieces: AvailablePiece[];
}

interface PlacementSuggestion {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
}

interface SuccessResponse {
  placements: PlacementSuggestion[];
  description: string;
  regions?: TerrainRegion[];
  paths?: TerrainPath[];
  elevation_zones?: ElevationZone[];
}

interface ErrorResponse {
  error: string;
}

// =====================================
// DUNGEON-SPECIFIC DATA STRUCTURES
// =====================================

type DungeonRoomType = 'entrance' | 'chamber' | 'corridor-hub' | 'boss' | 'treasure' | 'trap' | 'shrine';

interface DungeonRoom {
  id: string;
  type: DungeonRoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: string[];
  description?: string;
}

type CorridorStyle = 'straight' | 'L-shaped';

interface DungeonCorridor {
  id: string;
  fromRoom: string;
  toRoom: string;
  width: 3 | 6;
  style: CorridorStyle;
  useDiagonalTransitions: boolean;
}

interface DungeonLayout {
  rooms: DungeonRoom[];
  corridors: DungeonCorridor[];
  terrain: string;
  description: string;
}

interface LayoutContext {
  type: 'general' | 'dungeon' | 'outdoor';
  confidence: number;
  indicators: string[];
}

interface CorridorSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  isHorizontal: boolean;
}

interface DiagonalTransition {
  x: number;
  y: number;
  rotation: number;
}

// Classify pieces by their elevation pattern
type ElevationPattern = 'flat' | 'platform' | 'edge-north' | 'edge-south' | 'edge-east' | 'edge-west' |
                        'corner-nw' | 'corner-ne' | 'corner-sw' | 'corner-se' | 'other';

function classifyElevationPattern(elevation: CornerElevations | undefined): ElevationPattern {
  if (!elevation) return 'flat';

  const { nw, ne, sw, se } = elevation;
  const elevated = [nw > 0, ne > 0, sw > 0, se > 0];
  const count = elevated.filter(Boolean).length;

  if (count === 0) return 'flat';
  if (count === 4) return 'platform';

  if (count === 2) {
    if (nw > 0 && ne > 0) return 'edge-north'; // North edge elevated
    if (sw > 0 && se > 0) return 'edge-south'; // South edge elevated
    if (nw > 0 && sw > 0) return 'edge-west';  // West edge elevated
    if (ne > 0 && se > 0) return 'edge-east';  // East edge elevated
  }

  if (count === 1) {
    if (nw > 0) return 'corner-nw';
    if (ne > 0) return 'corner-ne';
    if (sw > 0) return 'corner-sw';
    if (se > 0) return 'corner-se';
  }

  return 'other';
}

// Get the rotation needed to transform a piece to the desired pattern
function getRotationForPattern(piecePattern: ElevationPattern, targetPattern: ElevationPattern): number | null {
  // Map of how patterns transform under rotation
  const rotationMap: Record<ElevationPattern, Record<number, ElevationPattern>> = {
    'edge-north': { 0: 'edge-north', 90: 'edge-east', 180: 'edge-south', 270: 'edge-west' },
    'edge-south': { 0: 'edge-south', 90: 'edge-west', 180: 'edge-north', 270: 'edge-east' },
    'edge-east': { 0: 'edge-east', 90: 'edge-south', 180: 'edge-west', 270: 'edge-north' },
    'edge-west': { 0: 'edge-west', 90: 'edge-north', 180: 'edge-east', 270: 'edge-south' },
    'corner-nw': { 0: 'corner-nw', 90: 'corner-ne', 180: 'corner-se', 270: 'corner-sw' },
    'corner-ne': { 0: 'corner-ne', 90: 'corner-se', 180: 'corner-sw', 270: 'corner-nw' },
    'corner-se': { 0: 'corner-se', 90: 'corner-sw', 180: 'corner-nw', 270: 'corner-ne' },
    'corner-sw': { 0: 'corner-sw', 90: 'corner-nw', 180: 'corner-ne', 270: 'corner-se' },
    'flat': { 0: 'flat', 90: 'flat', 180: 'flat', 270: 'flat' },
    'platform': { 0: 'platform', 90: 'platform', 180: 'platform', 270: 'platform' },
    'other': { 0: 'other', 90: 'other', 180: 'other', 270: 'other' },
  };

  const rotations = rotationMap[piecePattern];
  if (!rotations) return null;

  for (const [rotation, resultPattern] of Object.entries(rotations)) {
    if (resultPattern === targetPattern) {
      return parseInt(rotation);
    }
  }

  return null;
}

// Global occupancy grid for the entire map
class OccupancyGrid {
  private grid: boolean[][];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = Math.ceil(width);
    this.height = Math.ceil(height);
    this.grid = Array(this.height).fill(null).map(() =>
      Array(this.width).fill(false)
    );
  }

  canPlace(x: number, y: number, pieceW: number, pieceH: number): boolean {
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const endX = Math.ceil(x + pieceW);
    const endY = Math.ceil(y + pieceH);

    if (endX > this.width || endY > this.height || startX < 0 || startY < 0) {
      return false;
    }

    for (let dy = startY; dy < endY; dy++) {
      for (let dx = startX; dx < endX; dx++) {
        if (this.grid[dy]?.[dx]) {
          return false;
        }
      }
    }
    return true;
  }

  markOccupied(x: number, y: number, pieceW: number, pieceH: number) {
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const endX = Math.ceil(x + pieceW);
    const endY = Math.ceil(y + pieceH);

    for (let dy = startY; dy < endY && dy < this.height; dy++) {
      for (let dx = startX; dx < endX && dx < this.width; dx++) {
        if (dy >= 0 && dx >= 0) {
          this.grid[dy][dx] = true;
        }
      }
    }
  }
}

// Convert a path with waypoints into rectangular segments
function pathToSegments(path: TerrainPath, mapWidth: number, mapHeight: number): TerrainRegion[] {
  const segments: TerrainRegion[] = [];
  const waypoints = path.waypoints;

  if (waypoints.length < 2) {
    return segments;
  }

  const pathWidth = Math.max(6, path.width || 6);

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);

    if (isHorizontal) {
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const centerY = (start.y + end.y) / 2;

      segments.push({
        terrain: path.terrain,
        x: Math.max(0, Math.floor(minX / 6) * 6),
        y: Math.max(0, Math.floor((centerY - pathWidth / 2) / 6) * 6),
        width: Math.min(mapWidth, Math.ceil((maxX - minX + pathWidth) / 6) * 6),
        height: pathWidth
      });
    } else {
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const centerX = (start.x + end.x) / 2;

      segments.push({
        terrain: path.terrain,
        x: Math.max(0, Math.floor((centerX - pathWidth / 2) / 6) * 6),
        y: Math.max(0, Math.floor(minY / 6) * 6),
        width: pathWidth,
        height: Math.min(mapHeight, Math.ceil((maxY - minY + pathWidth) / 6) * 6)
      });
    }
  }

  return segments;
}

// Determine what elevation pattern is needed at a position within an elevation zone
// The pattern describes which corners of the PIECE should be elevated
// Pieces at the edge need elevation on the INSIDE (toward center), not the outside
function getRequiredPatternAtPosition(
  posX: number,
  posY: number,
  pieceW: number,
  pieceH: number,
  zone: ElevationZone
): ElevationPattern {
  const zoneEndX = zone.x + zone.width;
  const zoneEndY = zone.y + zone.height;
  const pieceEndX = posX + pieceW;
  const pieceEndY = posY + pieceH;

  const atNorth = posY <= zone.y;
  const atSouth = pieceEndY >= zoneEndY;
  const atWest = posX <= zone.x;
  const atEast = pieceEndX >= zoneEndX;

  // Corners - piece needs single elevated corner pointing INWARD toward center
  // At NW corner of zone: piece needs SE corner elevated (pointing toward center)
  if (atNorth && atWest) return 'corner-se';
  if (atNorth && atEast) return 'corner-sw';
  if (atSouth && atWest) return 'corner-ne';
  if (atSouth && atEast) return 'corner-nw';

  // Edges - piece needs the edge facing INWARD to be elevated
  // At north edge of zone: piece needs south edge elevated (sw + se corners)
  if (atNorth) return 'edge-south';
  // At south edge of zone: piece needs north edge elevated (nw + ne corners)
  if (atSouth) return 'edge-north';
  // At west edge of zone: piece needs east edge elevated (ne + se corners)
  if (atWest) return 'edge-east';
  // At east edge of zone: piece needs west edge elevated (nw + sw corners)
  if (atEast) return 'edge-west';

  // Interior - needs full platform
  return 'platform';
}

// Fill an elevation zone with intelligently selected pieces
function fillElevationZone(
  zone: ElevationZone,
  pieces: AvailablePiece[],
  mapWidth: number,
  mapHeight: number,
  globalOccupancy: OccupancyGrid
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  // Filter pieces that match this terrain type
  const matchingPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === zone.terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(zone.terrain.toLowerCase()) ||
                         zone.terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && !p.isDiagonal;
  });

  if (matchingPieces.length === 0) {
    return placements;
  }

  // Group pieces by elevation pattern
  const piecesByPattern = new Map<ElevationPattern, AvailablePiece[]>();
  for (const piece of matchingPieces) {
    const pattern = classifyElevationPattern(piece.elevation);
    if (!piecesByPattern.has(pattern)) {
      piecesByPattern.set(pattern, []);
    }
    piecesByPattern.get(pattern)!.push(piece);
  }

  // Sort each group by area (largest first)
  for (const [, piecesInGroup] of piecesByPattern) {
    piecesInGroup.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  }

  // Calculate zone bounds
  const zoneEndX = Math.min(zone.x + zone.width, mapWidth);
  const zoneEndY = Math.min(zone.y + zone.height, mapHeight);

  // Try to fill the zone with appropriate pieces
  for (let pass = 0; pass < 3; pass++) {
    for (let posY = zone.y; posY < zoneEndY; posY += 1) {
      for (let posX = zone.x; posX < zoneEndX; posX += 1) {
        // Try each piece type
        for (const piece of matchingPieces) {
          const piecePattern = classifyElevationPattern(piece.elevation);

          // Try both orientations
          const orientations = piece.width === piece.height
            ? [{ w: piece.width, h: piece.height, baseRotation: 0 }]
            : [
                { w: piece.width, h: piece.height, baseRotation: 0 },
                { w: piece.height, h: piece.width, baseRotation: 90 }
              ];

          for (const { w, h, baseRotation } of orientations) {
            if (posX + w > zoneEndX || posY + h > zoneEndY) continue;
            if (!globalOccupancy.canPlace(posX, posY, w, h)) continue;

            // What pattern do we need at this position?
            const requiredPattern = getRequiredPatternAtPosition(posX, posY, w, h, zone);

            // Can this piece provide the required pattern (possibly with rotation)?
            let finalRotation: number | null = null;

            if (piecePattern === requiredPattern) {
              finalRotation = baseRotation;
            } else if (piecePattern !== 'flat' && piecePattern !== 'platform' && piecePattern !== 'other') {
              const additionalRotation = getRotationForPattern(piecePattern, requiredPattern);
              if (additionalRotation !== null) {
                finalRotation = (baseRotation + additionalRotation) % 360;
              }
            } else if (piecePattern === requiredPattern) {
              finalRotation = baseRotation;
            }

            if (finalRotation !== null) {
              placements.push({
                pieceId: piece.id,
                x: posX,
                y: posY,
                rotation: finalRotation
              });
              globalOccupancy.markOccupied(posX, posY, w, h);
              break;
            }
          }
        }
      }
    }
  }

  return placements;
}

// Fill a region with available pieces using greedy bin-packing
function fillRegionWithPieces(
  region: TerrainRegion,
  pieces: AvailablePiece[],
  mapWidth: number,
  mapHeight: number,
  globalOccupancy: OccupancyGrid,
  preferFlat: boolean = true
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  // Filter pieces that match this terrain type
  let matchingPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === region.terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(region.terrain.toLowerCase()) ||
                         region.terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && !p.isDiagonal;
  });

  // If preferFlat, prioritize flat pieces
  if (preferFlat) {
    const flatPieces = matchingPieces.filter(p => classifyElevationPattern(p.elevation) === 'flat');
    if (flatPieces.length > 0) {
      matchingPieces = flatPieces;
    }
  }

  if (matchingPieces.length === 0) {
    return placements;
  }

  // Sort pieces by area (largest first)
  const sortedPieces = [...matchingPieces].sort((a, b) =>
    (b.width * b.height) - (a.width * a.height)
  );

  const regionEndX = Math.min(region.x + region.width, mapWidth);
  const regionEndY = Math.min(region.y + region.height, mapHeight);

  for (let pass = 0; pass < 3; pass++) {
    for (const piece of sortedPieces) {
      const orientations = piece.width === piece.height
        ? [{ w: piece.width, h: piece.height, rotation: 0 }]
        : [
            { w: piece.width, h: piece.height, rotation: 0 },
            { w: piece.height, h: piece.width, rotation: 90 }
          ];

      for (const { w, h, rotation } of orientations) {
        for (let mapY = region.y; mapY + h <= regionEndY; mapY += 1) {
          for (let mapX = region.x; mapX + w <= regionEndX; mapX += 1) {
            if (globalOccupancy.canPlace(mapX, mapY, w, h)) {
              placements.push({
                pieceId: piece.id,
                x: mapX,
                y: mapY,
                rotation
              });
              globalOccupancy.markOccupied(mapX, mapY, w, h);
            }
          }
        }
      }
    }
  }

  return placements;
}

// =====================================
// DUNGEON LAYOUT FUNCTIONS
// =====================================

// Detect if the scene description and available pieces suggest a dungeon layout
function detectLayoutContext(
  sceneDescription: string,
  availablePieces: AvailablePiece[]
): LayoutContext {
  const description = sceneDescription.toLowerCase();
  const indicators: string[] = [];
  let dungeonScore = 0;
  let outdoorScore = 0;

  // Dungeon keywords
  const dungeonKeywords = [
    'dungeon', 'underground', 'cavern', 'cave', 'crypt', 'tomb',
    'corridor', 'chamber', 'vault', 'labyrinth', 'maze', 'catacomb',
    'sewer', 'basement', 'cellar', 'prison', 'jail', 'lair'
  ];

  // Outdoor keywords
  const outdoorKeywords = [
    'forest', 'field', 'meadow', 'river', 'lake', 'mountain',
    'beach', 'desert', 'swamp', 'jungle', 'plains', 'hill', 'outdoor'
  ];

  for (const keyword of dungeonKeywords) {
    if (description.includes(keyword)) {
      dungeonScore += 2;
      indicators.push(`keyword: "${keyword}"`);
    }
  }

  for (const keyword of outdoorKeywords) {
    if (description.includes(keyword)) {
      outdoorScore += 2;
    }
  }

  // Structural keywords that suggest dungeon-like layout
  const structuralKeywords = ['room', 'passage', 'hall', 'entrance', 'door'];
  for (const keyword of structuralKeywords) {
    if (description.includes(keyword)) {
      dungeonScore += 1;
      indicators.push(`structural: "${keyword}"`);
    }
  }

  // Check terrain types for dungeon indicators
  const terrainTypes = [...new Set(availablePieces.map(p => p.terrainType.toLowerCase()))];
  const dungeonTerrains = ['dungeon', 'stone', 'cave', 'castle', 'crypt'];
  for (const terrain of terrainTypes) {
    if (dungeonTerrains.some(dt => terrain.includes(dt))) {
      dungeonScore += 2;
      indicators.push(`terrain: "${terrain}"`);
    }
  }

  // Check for diagonal pieces (useful for transitions)
  const hasDiagonals = availablePieces.some(p => p.isDiagonal);
  if (hasDiagonals) {
    indicators.push('has diagonal pieces');
  }

  // Determine type
  if (dungeonScore >= 3 && dungeonScore > outdoorScore) {
    return {
      type: 'dungeon',
      confidence: Math.min(1, dungeonScore / 10),
      indicators
    };
  } else if (outdoorScore > dungeonScore) {
    return {
      type: 'outdoor',
      confidence: Math.min(1, outdoorScore / 10),
      indicators: []
    };
  }

  return {
    type: 'general',
    confidence: 0.5,
    indicators: []
  };
}

// Build user prompt for dungeon layout
function buildDungeonUserPrompt(
  sceneDescription: string,
  mapWidth: number,
  mapHeight: number,
  terrainTypes: string[],
  hasDiagonalPieces: boolean
): string {
  return `Dungeon Description: "${sceneDescription}"

Map dimensions: ${mapWidth}" x ${mapHeight}" (width x height in inches)

Available terrain types: ${terrainTypes.join(', ')}

Features:
- Diagonal corner pieces: ${hasDiagonalPieces ? 'YES - use useDiagonalTransitions: true for narrow corridors opening into rooms' : 'NO - use flush transitions'}

DESIGN GUIDELINES:
1. Place entrance room near a map edge
2. Create 3-6 rooms connected by corridors
3. Use 3" wide corridors for tension, 6" wide for main halls
4. ${hasDiagonalPieces ? 'Set useDiagonalTransitions: true when 3" corridors meet rooms wider than 6"' : 'All transitions will be flush'}
5. Rooms should NOT overlap - leave space for corridors between them
6. Boss room should be largest and farthest from entrance

Return the dungeon layout as valid JSON with rooms, corridors, terrain, and description.`;
}

// Fill a dungeon room with floor pieces
function fillDungeonRoom(
  room: DungeonRoom,
  pieces: AvailablePiece[],
  terrain: string,
  globalOccupancy: OccupancyGrid,
  mapWidth: number,
  mapHeight: number
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  // Filter to flat, non-diagonal pieces matching terrain
  const floorPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(terrain.toLowerCase()) ||
                         terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && !p.isDiagonal && classifyElevationPattern(p.elevation) === 'flat';
  });

  if (floorPieces.length === 0) {
    return placements;
  }

  // Sort by area descending (largest first for efficient packing)
  floorPieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const roomEndX = Math.min(room.x + room.width, mapWidth);
  const roomEndY = Math.min(room.y + room.height, mapHeight);

  // Multiple passes to fill gaps
  for (let pass = 0; pass < 3; pass++) {
    for (const piece of floorPieces) {
      const orientations = piece.width === piece.height
        ? [{ w: piece.width, h: piece.height, rotation: 0 }]
        : [
            { w: piece.width, h: piece.height, rotation: 0 },
            { w: piece.height, h: piece.width, rotation: 90 }
          ];

      for (const { w, h, rotation } of orientations) {
        for (let y = room.y; y + h <= roomEndY; y += 1.5) {
          for (let x = room.x; x + w <= roomEndX; x += 1.5) {
            if (globalOccupancy.canPlace(x, y, w, h)) {
              placements.push({ pieceId: piece.id, x, y, rotation });
              globalOccupancy.markOccupied(x, y, w, h);
            }
          }
        }
      }
    }
  }

  return placements;
}

// Calculate the path segments for a corridor between two rooms
function calculateCorridorPath(
  fromRoom: DungeonRoom,
  toRoom: DungeonRoom,
  corridorWidth: number,
  style: CorridorStyle
): CorridorSegment[] {
  const segments: CorridorSegment[] = [];

  // Calculate room centers
  const fromCenterX = fromRoom.x + fromRoom.width / 2;
  const fromCenterY = fromRoom.y + fromRoom.height / 2;
  const toCenterX = toRoom.x + toRoom.width / 2;
  const toCenterY = toRoom.y + toRoom.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  if (style === 'straight') {
    // Determine if horizontal or vertical is primary direction
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal corridor
      const startX = dx > 0 ? fromRoom.x + fromRoom.width : toRoom.x + toRoom.width;
      const endX = dx > 0 ? toRoom.x : fromRoom.x;
      const corridorY = Math.round((fromCenterY + toCenterY) / 2 - corridorWidth / 2);

      segments.push({
        x: Math.min(startX, endX),
        y: Math.max(0, corridorY),
        width: Math.abs(endX - startX),
        height: corridorWidth,
        isHorizontal: true
      });
    } else {
      // Vertical corridor
      const startY = dy > 0 ? fromRoom.y + fromRoom.height : toRoom.y + toRoom.height;
      const endY = dy > 0 ? toRoom.y : fromRoom.y;
      const corridorX = Math.round((fromCenterX + toCenterX) / 2 - corridorWidth / 2);

      segments.push({
        x: Math.max(0, corridorX),
        y: Math.min(startY, endY),
        width: corridorWidth,
        height: Math.abs(endY - startY),
        isHorizontal: false
      });
    }
  } else if (style === 'L-shaped') {
    // L-shaped: horizontal first, then vertical
    const midX = toRoom.x + (dx > 0 ? 0 : toRoom.width);
    const corridorY1 = Math.round(fromCenterY - corridorWidth / 2);
    const corridorX2 = Math.round(midX - corridorWidth / 2);

    // Horizontal segment from fromRoom to corner
    const hStartX = dx > 0 ? fromRoom.x + fromRoom.width : midX;
    const hEndX = dx > 0 ? midX + corridorWidth : fromRoom.x;
    segments.push({
      x: Math.min(hStartX, hEndX),
      y: Math.max(0, corridorY1),
      width: Math.abs(hEndX - hStartX),
      height: corridorWidth,
      isHorizontal: true
    });

    // Vertical segment from corner to toRoom
    const vStartY = dy > 0 ? corridorY1 : toRoom.y + toRoom.height;
    const vEndY = dy > 0 ? toRoom.y : corridorY1 + corridorWidth;
    segments.push({
      x: Math.max(0, corridorX2),
      y: Math.min(vStartY, vEndY),
      width: corridorWidth,
      height: Math.abs(vEndY - vStartY) + corridorWidth,
      isHorizontal: false
    });
  }

  return segments;
}

// Fill a corridor with appropriate pieces
function fillDungeonCorridor(
  corridor: DungeonCorridor,
  rooms: DungeonRoom[],
  pieces: AvailablePiece[],
  terrain: string,
  globalOccupancy: OccupancyGrid,
  mapWidth: number,
  mapHeight: number
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  const fromRoom = rooms.find(r => r.id === corridor.fromRoom);
  const toRoom = rooms.find(r => r.id === corridor.toRoom);
  if (!fromRoom || !toRoom) return placements;

  // Get corridor path segments
  const segments = calculateCorridorPath(fromRoom, toRoom, corridor.width, corridor.style);

  // Filter pieces suitable for corridors - prefer pieces that fit the corridor width
  const corridorPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(terrain.toLowerCase()) ||
                         terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && !p.isDiagonal && classifyElevationPattern(p.elevation) === 'flat';
  });

  if (corridorPieces.length === 0) return placements;

  // Sort by how well they fit the corridor width, then by length
  corridorPieces.sort((a, b) => {
    const aFits = (a.width === corridor.width || a.height === corridor.width) ? 1 : 0;
    const bFits = (b.width === corridor.width || b.height === corridor.width) ? 1 : 0;
    if (aFits !== bFits) return bFits - aFits;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });

  // Fill each segment
  for (const segment of segments) {
    const segEndX = Math.min(segment.x + segment.width, mapWidth);
    const segEndY = Math.min(segment.y + segment.height, mapHeight);

    for (const piece of corridorPieces) {
      const orientations = piece.width === piece.height
        ? [{ w: piece.width, h: piece.height, rotation: 0 }]
        : [
            { w: piece.width, h: piece.height, rotation: 0 },
            { w: piece.height, h: piece.width, rotation: 90 }
          ];

      for (const { w, h, rotation } of orientations) {
        // Check if this orientation fits the corridor
        if (segment.isHorizontal && h > segment.height) continue;
        if (!segment.isHorizontal && w > segment.width) continue;

        for (let y = segment.y; y + h <= segEndY; y += 1.5) {
          for (let x = segment.x; x + w <= segEndX; x += 1.5) {
            if (globalOccupancy.canPlace(x, y, w, h)) {
              placements.push({ pieceId: piece.id, x, y, rotation });
              globalOccupancy.markOccupied(x, y, w, h);
            }
          }
        }
      }
    }
  }

  return placements;
}

// Calculate where diagonal transition pieces should be placed
// Only place diagonals at the exact junction between corridor and room
function calculateDiagonalTransitions(
  corridor: DungeonCorridor,
  rooms: DungeonRoom[],
  corridorSegments: CorridorSegment[]
): DiagonalTransition[] {
  if (!corridor.useDiagonalTransitions) return [];
  if (corridorSegments.length === 0) return [];

  const transitions: DiagonalTransition[] = [];
  const fromRoom = rooms.find(r => r.id === corridor.fromRoom);
  const toRoom = rooms.find(r => r.id === corridor.toRoom);
  if (!fromRoom || !toRoom) return transitions;

  const diagonalSize = 3; // 3x3 corner pieces

  // Helper to add transitions at a room entry point
  function addRoomEntryTransitions(
    room: DungeonRoom,
    corridorX: number,
    corridorY: number,
    corridorW: number,
    corridorH: number,
    isHorizontal: boolean,
    enteringFromLowSide: boolean // true if corridor enters from left/top of room
  ) {
    // Only add transitions if corridor is narrower than room
    const roomDim = isHorizontal ? room.height : room.width;
    const corridorDim = isHorizontal ? corridorH : corridorW;
    if (corridorDim >= roomDim - 3) return; // Not enough space for transitions

    if (isHorizontal) {
      // Horizontal corridor entering room from east or west
      const entryX = enteringFromLowSide ? room.x : room.x + room.width - diagonalSize;

      // Top diagonal (above corridor)
      transitions.push({
        x: entryX,
        y: corridorY - diagonalSize,
        rotation: enteringFromLowSide ? 180 : 270  // ◢ or ◣
      });

      // Bottom diagonal (below corridor)
      transitions.push({
        x: entryX,
        y: corridorY + corridorH,
        rotation: enteringFromLowSide ? 90 : 0  // ◥ or ◤
      });
    } else {
      // Vertical corridor entering room from north or south
      const entryY = enteringFromLowSide ? room.y : room.y + room.height - diagonalSize;

      // Left diagonal
      transitions.push({
        x: corridorX - diagonalSize,
        y: entryY,
        rotation: enteringFromLowSide ? 90 : 0  // ◥ or ◤
      });

      // Right diagonal
      transitions.push({
        x: corridorX + corridorW,
        y: entryY,
        rotation: enteringFromLowSide ? 180 : 270  // ◢ or ◣
      });
    }
  }

  // Get the first and last segments (they connect to rooms)
  const firstSegment = corridorSegments[0];
  const lastSegment = corridorSegments[corridorSegments.length - 1];

  // Determine which room each segment connects to based on position
  const fromCenterX = fromRoom.x + fromRoom.width / 2;
  const fromCenterY = fromRoom.y + fromRoom.height / 2;
  const toCenterX = toRoom.x + toRoom.width / 2;
  const toCenterY = toRoom.y + toRoom.height / 2;

  // For the first segment, determine if it's closer to fromRoom or toRoom
  const firstSegCenterX = firstSegment.x + firstSegment.width / 2;
  const firstSegCenterY = firstSegment.y + firstSegment.height / 2;

  const distToFrom = Math.abs(firstSegCenterX - fromCenterX) + Math.abs(firstSegCenterY - fromCenterY);
  const distToTo = Math.abs(firstSegCenterX - toCenterX) + Math.abs(firstSegCenterY - toCenterY);

  // Add transitions at fromRoom
  if (firstSegment.isHorizontal) {
    const enterFromWest = fromRoom.x + fromRoom.width <= firstSegment.x + firstSegment.width / 2;
    addRoomEntryTransitions(
      fromRoom,
      firstSegment.x,
      firstSegment.y,
      firstSegment.width,
      firstSegment.height,
      true,
      !enterFromWest
    );
  } else {
    const enterFromNorth = fromRoom.y + fromRoom.height <= firstSegment.y + firstSegment.height / 2;
    addRoomEntryTransitions(
      fromRoom,
      firstSegment.x,
      firstSegment.y,
      firstSegment.width,
      firstSegment.height,
      false,
      !enterFromNorth
    );
  }

  // Add transitions at toRoom (use last segment)
  if (lastSegment.isHorizontal) {
    const enterFromWest = toRoom.x >= lastSegment.x + lastSegment.width / 2;
    addRoomEntryTransitions(
      toRoom,
      lastSegment.x,
      lastSegment.y,
      lastSegment.width,
      lastSegment.height,
      true,
      enterFromWest
    );
  } else {
    const enterFromNorth = toRoom.y >= lastSegment.y + lastSegment.height / 2;
    addRoomEntryTransitions(
      toRoom,
      lastSegment.x,
      lastSegment.y,
      lastSegment.width,
      lastSegment.height,
      false,
      enterFromNorth
    );
  }

  return transitions;
}

// Fill diagonal transitions with corner pieces
function fillDiagonalTransitions(
  transitions: DiagonalTransition[],
  pieces: AvailablePiece[],
  terrain: string,
  globalOccupancy: OccupancyGrid
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  // Find diagonal pieces matching terrain
  const diagonalPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(terrain.toLowerCase()) ||
                         terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && p.isDiagonal;
  });

  if (diagonalPieces.length === 0) return placements;

  // Prefer 3x3 diagonal pieces
  const sortedDiagonals = [...diagonalPieces].sort((a, b) => {
    const aIs3x3 = a.width === 3 && a.height === 3;
    const bIs3x3 = b.width === 3 && b.height === 3;
    if (aIs3x3 && !bIs3x3) return -1;
    if (!aIs3x3 && bIs3x3) return 1;
    return (a.width * a.height) - (b.width * b.height);
  });

  const piece = sortedDiagonals[0];

  for (const transition of transitions) {
    // Check bounds and occupancy
    if (transition.x >= 0 && transition.y >= 0 &&
        globalOccupancy.canPlace(transition.x, transition.y, piece.width, piece.height)) {
      placements.push({
        pieceId: piece.id,
        x: transition.x,
        y: transition.y,
        rotation: transition.rotation
      });
      globalOccupancy.markOccupied(transition.x, transition.y, piece.width, piece.height);
    }
  }

  return placements;
}

// Validate dungeon layout from LLM
function validateDungeonLayout(
  layout: DungeonLayout,
  mapWidth: number,
  mapHeight: number
): DungeonLayout {
  // Clamp room coordinates to map bounds
  const validRooms = layout.rooms.map(room => ({
    ...room,
    x: Math.max(0, Math.min(room.x, mapWidth - 6)),
    y: Math.max(0, Math.min(room.y, mapHeight - 6)),
    width: Math.min(room.width, mapWidth - room.x),
    height: Math.min(room.height, mapHeight - room.y)
  })).filter(room => room.width >= 6 && room.height >= 6);

  // Validate corridors reference valid rooms
  const roomIds = new Set(validRooms.map(r => r.id));
  const validCorridors = layout.corridors.filter(
    c => roomIds.has(c.fromRoom) && roomIds.has(c.toRoom)
  );

  return {
    ...layout,
    rooms: validRooms,
    corridors: validCorridors
  };
}

// Main dungeon layout generator
async function generateDungeonLayout(
  sceneDescription: string,
  mapWidth: number,
  mapHeight: number,
  availablePieces: AvailablePiece[],
  openRouterKey?: string
): Promise<{
  placements: PlacementSuggestion[];
  description: string;
}> {
  const terrainTypes = [...new Set(availablePieces.map(p => p.terrainType))];
  const hasDiagonalPieces = availablePieces.some(p => p.isDiagonal);

  // Build and send prompt to LLM
  const userPrompt = buildDungeonUserPrompt(
    sceneDescription,
    mapWidth,
    mapHeight,
    terrainTypes,
    hasDiagonalPieces
  );

  const response = await callOpenRouter(
    [
      { role: 'system', content: DUNGEON_LAYOUT_SYSTEM },
      { role: 'user', content: userPrompt }
    ],
    OPENROUTER_MODELS.quality,
    3000,
    openRouterKey
  );

  // Parse LLM response
  let dungeonLayout: DungeonLayout;
  try {
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7);
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3);
    }
    cleanResponse = cleanResponse.trim();

    dungeonLayout = JSON.parse(cleanResponse);
    dungeonLayout = validateDungeonLayout(dungeonLayout, mapWidth, mapHeight);
  } catch (error) {
    console.error('Failed to parse dungeon layout:', response);
    throw new Error('Failed to parse dungeon layout from LLM');
  }

  // Create occupancy grid and placements array
  const globalOccupancy = new OccupancyGrid(mapWidth, mapHeight);
  const allPlacements: PlacementSuggestion[] = [];
  const terrain = dungeonLayout.terrain || terrainTypes[0] || 'stone';

  console.log('Dungeon layout:', JSON.stringify(dungeonLayout, null, 2));

  // PHASE 1: Fill rooms
  for (const room of dungeonLayout.rooms) {
    const roomPlacements = fillDungeonRoom(
      room,
      availablePieces,
      terrain,
      globalOccupancy,
      mapWidth,
      mapHeight
    );
    allPlacements.push(...roomPlacements);
  }

  // PHASE 2: Fill corridors
  for (const corridor of dungeonLayout.corridors) {
    const corridorPlacements = fillDungeonCorridor(
      corridor,
      dungeonLayout.rooms,
      availablePieces,
      terrain,
      globalOccupancy,
      mapWidth,
      mapHeight
    );
    allPlacements.push(...corridorPlacements);
  }

  // PHASE 3: Add diagonal transitions
  if (hasDiagonalPieces) {
    for (const corridor of dungeonLayout.corridors) {
      if (corridor.useDiagonalTransitions) {
        const fromRoom = dungeonLayout.rooms.find(r => r.id === corridor.fromRoom);
        const toRoom = dungeonLayout.rooms.find(r => r.id === corridor.toRoom);
        if (fromRoom && toRoom) {
          const segments = calculateCorridorPath(fromRoom, toRoom, corridor.width, corridor.style);
          const transitions = calculateDiagonalTransitions(corridor, dungeonLayout.rooms, segments);
          const diagonalPlacements = fillDiagonalTransitions(
            transitions,
            availablePieces,
            terrain,
            globalOccupancy
          );
          allPlacements.push(...diagonalPlacements);
        }
      }
    }
  }

  return {
    placements: allPlacements,
    description: dungeonLayout.description || 'Dungeon layout generated'
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const openRouterKey = request.headers.get('X-OpenRouter-Key');

    let body: SuggestLayoutRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body.sceneDescription || typeof body.sceneDescription !== 'string') {
      return NextResponse.json(
        { error: 'sceneDescription is required' },
        { status: 400 }
      );
    }

    if (body.sceneDescription.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a more detailed scene description' },
        { status: 400 }
      );
    }

    if (!body.mapWidth || !body.mapHeight) {
      return NextResponse.json(
        { error: 'mapWidth and mapHeight are required' },
        { status: 400 }
      );
    }

    if (!body.availablePieces || !Array.isArray(body.availablePieces) || body.availablePieces.length === 0) {
      return NextResponse.json(
        { error: 'availablePieces array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Detect layout context (dungeon vs outdoor vs general)
    const layoutContext = detectLayoutContext(body.sceneDescription, body.availablePieces);
    console.log('Layout context:', layoutContext);

    // If dungeon context detected, use dungeon-specific algorithm
    if (layoutContext.type === 'dungeon' && layoutContext.confidence >= 0.3) {
      try {
        console.log('Using dungeon layout algorithm');
        const dungeonResult = await generateDungeonLayout(
          body.sceneDescription,
          body.mapWidth,
          body.mapHeight,
          body.availablePieces,
          openRouterKey || undefined
        );

        return NextResponse.json({
          placements: dungeonResult.placements,
          description: dungeonResult.description
        });
      } catch (error) {
        console.warn('Dungeon layout failed, falling back to general algorithm:', error);
        // Fall through to general layout algorithm
      }
    }

    // General layout algorithm (for outdoor/general contexts or dungeon fallback)
    // Get unique terrain types from available pieces
    const terrainTypes = [...new Set(body.availablePieces.map(p => p.terrainType))];

    // Check if we have elevated pieces
    const hasElevatedPieces = body.availablePieces.some(p =>
      p.elevation && (p.elevation.nw > 0 || p.elevation.ne > 0 || p.elevation.sw > 0 || p.elevation.se > 0)
    );

    // Build terrain summary with piece info
    const terrainSummary = terrainTypes.map(terrain => {
      const piecesOfType = body.availablePieces.filter(p => p.terrainType === terrain);
      const flatPieces = piecesOfType.filter(p => classifyElevationPattern(p.elevation) === 'flat');
      const elevatedPieces = piecesOfType.filter(p => classifyElevationPattern(p.elevation) !== 'flat');

      let summary = `- "${terrain}": `;
      if (flatPieces.length > 0) {
        const flatSizes = [...new Set(flatPieces.map(p => `${p.width}x${p.height}`))].join(', ');
        summary += `flat (${flatSizes})`;
      }
      if (elevatedPieces.length > 0) {
        if (flatPieces.length > 0) summary += ', ';
        summary += `elevated pieces available`;
      }
      return summary;
    }).join('\n');

    console.log('Available terrain types:', terrainTypes);
    console.log('Has elevated pieces:', hasElevatedPieces);
    console.log('Map size:', body.mapWidth, 'x', body.mapHeight);

    // Build user prompt
    const userPrompt = `Scene: "${body.sceneDescription}"

Map dimensions: ${body.mapWidth}" x ${body.mapHeight}" (width x height in inches)

Available terrain types:
${terrainSummary}

${hasElevatedPieces ? `
ELEVATION AVAILABLE: You have pieces with elevation. Use "elevation_zones" for hills, cliffs, or raised areas.
Example elevation_zone: {"terrain": "forest", "x": 12, "y": 12, "width": 24, "height": 24, "height_inches": 2.5}
` : ''}
---
CRITICAL GUIDELINES:

1. TERRAIN NAMES: Use ONLY the exact terrain names listed above. Example: "${terrainTypes[0] || 'forest'}".

2. REGIONS: Define rectangular regions that COVER THE ENTIRE MAP as the background.

3. PATHS (optional): For rivers/roads, use "paths" with 2-4 waypoints for natural curves.

4. ELEVATION ZONES (optional): For hills/platforms, use "elevation_zones". The system auto-places:
   - Platform pieces in center
   - Edge/ramp pieces on borders
   - Corner pieces at corners

5. COORDINATES: Use multiples of 6 (0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60).

6. FULL COVERAGE: Regions must cover entire map (${body.mapWidth * body.mapHeight} sq inches).

Return ONLY valid JSON with "regions" array, optional "paths", optional "elevation_zones", and "description".`;

    const response = await callOpenRouter(
      [
        { role: 'system', content: LAYOUT_SUGGESTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.quality,
      2500,
      openRouterKey || undefined
    );

    let result: LayoutResult;
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();

      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', response);
      return NextResponse.json(
        { error: 'Failed to parse layout suggestions. Please try again.' },
        { status: 500 }
      );
    }

    // Validate regions
    const validRegions: TerrainRegion[] = (result.regions || [])
      .filter((r): r is TerrainRegion => {
        if (!r || typeof r !== 'object') return false;
        if (typeof r.terrain !== 'string' || !r.terrain) return false;
        if (typeof r.x !== 'number' || typeof r.y !== 'number') return false;
        if (typeof r.width !== 'number' || typeof r.height !== 'number') return false;
        if (r.width <= 0 || r.height <= 0) return false;
        return true;
      })
      .map(r => ({
        terrain: r.terrain.toLowerCase(),
        x: Math.max(0, Math.min(r.x, body.mapWidth)),
        y: Math.max(0, Math.min(r.y, body.mapHeight)),
        width: Math.min(r.width, body.mapWidth - r.x),
        height: Math.min(r.height, body.mapHeight - r.y)
      }));

    // Validate paths
    const validPaths: TerrainPath[] = (result.paths || [])
      .filter((p): p is TerrainPath => {
        if (!p || typeof p !== 'object') return false;
        if (typeof p.terrain !== 'string' || !p.terrain) return false;
        if (!Array.isArray(p.waypoints) || p.waypoints.length < 2) return false;
        return p.waypoints.every(wp =>
          typeof wp.x === 'number' && typeof wp.y === 'number'
        );
      })
      .map(p => ({
        terrain: p.terrain.toLowerCase(),
        width: Math.max(6, p.width || 6),
        waypoints: p.waypoints.map(wp => ({
          x: Math.max(0, Math.min(wp.x, body.mapWidth)),
          y: Math.max(0, Math.min(wp.y, body.mapHeight))
        }))
      }));

    // Validate elevation zones
    const validElevationZones: ElevationZone[] = (result.elevation_zones || [])
      .filter((z): z is ElevationZone => {
        if (!z || typeof z !== 'object') return false;
        if (typeof z.terrain !== 'string' || !z.terrain) return false;
        if (typeof z.x !== 'number' || typeof z.y !== 'number') return false;
        if (typeof z.width !== 'number' || typeof z.height !== 'number') return false;
        if (z.width <= 0 || z.height <= 0) return false;
        return true;
      })
      .map(z => ({
        terrain: z.terrain.toLowerCase(),
        x: Math.max(0, Math.min(z.x, body.mapWidth)),
        y: Math.max(0, Math.min(z.y, body.mapHeight)),
        width: Math.min(z.width, body.mapWidth - z.x),
        height: Math.min(z.height, body.mapHeight - z.y),
        height_inches: z.height_inches || 2.5
      }));

    // Convert paths to segments
    const pathSegments: TerrainRegion[] = [];
    for (const path of validPaths) {
      const segments = pathToSegments(path, body.mapWidth, body.mapHeight);
      pathSegments.push(...segments);
    }

    // Create global occupancy grid
    const globalOccupancy = new OccupancyGrid(body.mapWidth, body.mapHeight);
    const allPlacements: PlacementSuggestion[] = [];

    // PRIORITY 1: Fill elevation zones with intelligent piece selection
    for (const zone of validElevationZones) {
      const zonePlacements = fillElevationZone(
        zone,
        body.availablePieces,
        body.mapWidth,
        body.mapHeight,
        globalOccupancy
      );
      allPlacements.push(...zonePlacements);
    }

    // PRIORITY 2: Fill path segments
    for (const segment of pathSegments) {
      const segmentPlacements = fillRegionWithPieces(
        segment,
        body.availablePieces,
        body.mapWidth,
        body.mapHeight,
        globalOccupancy,
        true // prefer flat pieces for paths
      );
      allPlacements.push(...segmentPlacements);
    }

    // PRIORITY 3: Fill remaining regions
    const sortedRegions = [...validRegions].sort((a, b) =>
      (b.width * b.height) - (a.width * a.height)
    );

    for (const region of sortedRegions) {
      const regionPlacements = fillRegionWithPieces(
        region,
        body.availablePieces,
        body.mapWidth,
        body.mapHeight,
        globalOccupancy,
        true // prefer flat pieces for regions
      );
      allPlacements.push(...regionPlacements);
    }

    return NextResponse.json({
      placements: allPlacements,
      description: typeof result.description === 'string' ? result.description.slice(0, 500) : '',
      regions: validRegions,
      paths: validPaths.length > 0 ? validPaths : undefined,
      elevation_zones: validElevationZones.length > 0 ? validElevationZones : undefined
    });
  } catch (error) {
    console.error('Layout suggestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during layout generation' },
      { status: 500 }
    );
  }
}
