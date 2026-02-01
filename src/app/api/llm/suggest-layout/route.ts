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
