import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for region-based layout suggestions
const LAYOUT_SUGGESTION_SYSTEM = `You are a D&D/tabletop RPG map designer assistant. Given a scene description, available terrain types, and map dimensions, define terrain REGIONS for a tactical battle map.

Your task is to define rectangular regions where different terrain types should be placed. Our system will automatically fill each region with the appropriate terrain pieces.

CRITICAL RULES:
- COVER THE ENTIRE MAP with terrain regions - NO empty spaces allowed
- Define 6-12 terrain regions that together cover 100% of the map area
- REGIONS MUST NOT OVERLAP - each area of the map should only belong to one region
- Regions must tile perfectly to fill the entire map (like a puzzle)
- Consider tactical interest: cover, chokepoints, flanking routes
- Regions should make sense for the scene (forests cluster, water flows naturally, etc.)
- Coordinates are in inches, starting from (0,0) at top-left
- Use coordinates that are multiples of 6 for better piece alignment (0, 6, 12, 18, 24, etc.)

For each region, provide:
- terrain: The terrain type slug (must match available types exactly)
- x: X position in inches (left edge of region)
- y: Y position in inches (top edge of region)
- width: Width of the region in inches
- height: Height of the region in inches

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "regions": [
    {"terrain": "forest", "x": 0, "y": 0, "width": 18, "height": 12},
    {"terrain": "water", "x": 24, "y": 18, "width": 12, "height": 18}
  ],
  "description": "Brief description of the layout strategy"
}`;

interface AvailablePiece {
  id: string;
  name: string;
  terrainType: string;
  width: number;
  height: number;
  isDiagonal: boolean;
}

interface TerrainRegion {
  terrain: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionResult {
  regions: TerrainRegion[];
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
}

interface ErrorResponse {
  error: string;
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

// Fill a region with available pieces using greedy bin-packing
// Uses a GLOBAL occupancy grid to prevent overlaps between regions
function fillRegionWithPieces(
  region: TerrainRegion,
  pieces: AvailablePiece[],
  mapWidth: number,
  mapHeight: number,
  globalOccupancy: OccupancyGrid
): PlacementSuggestion[] {
  const placements: PlacementSuggestion[] = [];

  // Filter pieces that match this terrain type
  const matchingPieces = pieces.filter(p => {
    const terrainMatch = p.terrainType.toLowerCase() === region.terrain.toLowerCase() ||
                         p.terrainType.toLowerCase().includes(region.terrain.toLowerCase()) ||
                         region.terrain.toLowerCase().includes(p.terrainType.toLowerCase());
    return terrainMatch && !p.isDiagonal; // Skip diagonal pieces for now
  });

  if (matchingPieces.length === 0) {
    return placements;
  }

  // Sort pieces by area (largest first) for better packing
  const sortedPieces = [...matchingPieces].sort((a, b) =>
    (b.width * b.height) - (a.width * a.height)
  );

  // Calculate region bounds
  const regionEndX = Math.min(region.x + region.width, mapWidth);
  const regionEndY = Math.min(region.y + region.height, mapHeight);

  // Try to place pieces using a greedy approach
  // Multiple passes to fill gaps with smaller pieces
  for (let pass = 0; pass < 3; pass++) {
    for (const piece of sortedPieces) {
      // Try both orientations (only if piece is not square)
      const orientations = piece.width === piece.height
        ? [{ w: piece.width, h: piece.height, rotation: 0 }]
        : [
            { w: piece.width, h: piece.height, rotation: 0 },
            { w: piece.height, h: piece.width, rotation: 90 }
          ];

      for (const { w, h, rotation } of orientations) {
        // Scan positions within the region
        for (let mapY = region.y; mapY + h <= regionEndY; mapY += 1) {
          for (let mapX = region.x; mapX + w <= regionEndX; mapX += 1) {
            // Check global occupancy (not just local region)
            if (globalOccupancy.canPlace(mapX, mapY, w, h)) {
              placements.push({
                pieceId: piece.id,
                x: mapX,
                y: mapY,
                rotation
              });
              // Mark globally occupied
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
    // Get API key from header or env
    const openRouterKey = request.headers.get('X-OpenRouter-Key');

    // Parse request body
    let body: SuggestLayoutRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate inputs
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

    // Build terrain summary with piece sizes for each type
    const terrainSummary = terrainTypes.map(terrain => {
      const piecesOfType = body.availablePieces.filter(p => p.terrainType === terrain);
      const sizes = [...new Set(piecesOfType.map(p => `${p.width}x${p.height}`))].join(', ');
      return `- "${terrain}": sizes ${sizes}`;
    }).join('\n');

    console.log('Available terrain types:', terrainTypes);
    console.log('Map size:', body.mapWidth, 'x', body.mapHeight);

    // Build user prompt - rules appended at the end for clarity
    const userPrompt = `Scene: "${body.sceneDescription}"

Map dimensions: ${body.mapWidth}" x ${body.mapHeight}" (width x height in inches)

Available terrain types and piece sizes:
${terrainSummary}

---
CRITICAL GUIDELINES (follow these exactly):

1. TERRAIN NAMES: Use ONLY the exact terrain names listed above. Example: "${terrainTypes[0] || 'forest'}" not just "forest".

2. NO OVERLAPS: Regions must NOT overlap with each other. Plan coordinates carefully.

3. FULL COVERAGE: Define 6-12 terrain regions that COVER THE ENTIRE MAP (100%). NO empty spaces allowed. Regions must tile like a puzzle.

4. COORDINATES: Use multiples of 6 for all coordinates (0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, etc.)

5. REGION SIZES: Make regions large enough to fit multiple pieces. Minimum 6x6 inches per region.

6. VARIETY: Use different terrain types to create an interesting tactical map.

7. MATH CHECK: Sum of all region areas must equal map area (${body.mapWidth} x ${body.mapHeight} = ${body.mapWidth * body.mapHeight} square inches).

Return ONLY valid JSON with "regions" array and "description" field.`;

    // Call OpenRouter
    const response = await callOpenRouter(
      [
        { role: 'system', content: LAYOUT_SUGGESTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.quality,
      2000, // Regions need fewer tokens than individual placements
      openRouterKey || undefined
    );

    // Parse the response
    let result: RegionResult;
    try {
      // Clean up response - remove markdown code blocks if present
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

    // Validate and sanitize regions
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

    // Create a GLOBAL occupancy grid for the entire map
    const globalOccupancy = new OccupancyGrid(body.mapWidth, body.mapHeight);

    // Sort regions by area (larger first) for better packing
    const sortedRegions = [...validRegions].sort((a, b) =>
      (b.width * b.height) - (a.width * a.height)
    );

    // Fill each region with pieces, using the shared global occupancy grid
    const allPlacements: PlacementSuggestion[] = [];

    for (const region of sortedRegions) {
      const regionPlacements = fillRegionWithPieces(
        region,
        body.availablePieces,
        body.mapWidth,
        body.mapHeight,
        globalOccupancy // Pass global grid to prevent overlaps between regions
      );
      allPlacements.push(...regionPlacements);
    }

    return NextResponse.json({
      placements: allPlacements,
      description: typeof result.description === 'string' ? result.description.slice(0, 500) : '',
      regions: validRegions
    });
  } catch (error) {
    console.error('Layout suggestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during layout generation' },
      { status: 500 }
    );
  }
}
