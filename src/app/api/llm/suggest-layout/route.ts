import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for region-based layout suggestions
const LAYOUT_SUGGESTION_SYSTEM = `You are a D&D/tabletop RPG map designer assistant. Given a scene description, available terrain types, and map dimensions, define terrain REGIONS for a tactical battle map.

Your task is to define rectangular regions where different terrain types should be placed. Our system will automatically fill each region with the appropriate terrain pieces.

IMPORTANT RULES:
- Define 3-8 terrain regions that create an interesting battle map
- Regions can overlap slightly at edges for natural transitions
- Leave some areas empty (no region) for open combat space
- Consider tactical interest: cover, chokepoints, elevation changes
- Regions should make sense for the scene (forests cluster, rivers flow, etc.)
- Coordinates are in inches, starting from (0,0) at top-left

For each region, provide:
- terrain: The terrain type slug (e.g., "forest", "water", "rock", "grass")
- x: X position in inches (left edge of region)
- y: Y position in inches (top edge of region)
- width: Width of the region in inches
- height: Height of the region in inches

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "regions": [
    {"terrain": "forest", "x": 0, "y": 0, "width": 18, "height": 12},
    {"terrain": "water", "x": 24, "y": 10, "width": 12, "height": 20}
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

// Fill a region with available pieces using greedy bin-packing
function fillRegionWithPieces(
  region: TerrainRegion,
  pieces: AvailablePiece[],
  mapWidth: number,
  mapHeight: number
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

  // Create a grid to track occupied cells (1 inch resolution)
  const gridWidth = Math.ceil(region.width);
  const gridHeight = Math.ceil(region.height);
  const occupied: boolean[][] = Array(gridHeight).fill(null).map(() =>
    Array(gridWidth).fill(false)
  );

  // Helper to check if a piece fits at a position
  const canPlace = (pieceW: number, pieceH: number, gridX: number, gridY: number): boolean => {
    if (gridX + pieceW > gridWidth || gridY + pieceH > gridHeight) {
      return false;
    }
    for (let dy = 0; dy < pieceH; dy++) {
      for (let dx = 0; dx < pieceW; dx++) {
        if (occupied[gridY + dy]?.[gridX + dx]) {
          return false;
        }
      }
    }
    return true;
  };

  // Helper to mark cells as occupied
  const markOccupied = (pieceW: number, pieceH: number, gridX: number, gridY: number) => {
    for (let dy = 0; dy < pieceH; dy++) {
      for (let dx = 0; dx < pieceW; dx++) {
        if (occupied[gridY + dy]) {
          occupied[gridY + dy][gridX + dx] = true;
        }
      }
    }
  };

  // Try to place pieces using a greedy approach
  // Multiple passes to fill gaps with smaller pieces
  for (let pass = 0; pass < 3; pass++) {
    for (const piece of sortedPieces) {
      // Try both orientations
      const orientations = [
        { w: piece.width, h: piece.height, rotation: 0 },
        { w: piece.height, h: piece.width, rotation: 90 }
      ];

      for (const { w, h, rotation } of orientations) {
        // Scan for available positions
        for (let gridY = 0; gridY <= gridHeight - h; gridY++) {
          for (let gridX = 0; gridX <= gridWidth - w; gridX++) {
            if (canPlace(w, h, gridX, gridY)) {
              // Calculate actual map position
              const mapX = region.x + gridX;
              const mapY = region.y + gridY;

              // Verify within map bounds
              if (mapX >= 0 && mapY >= 0 &&
                  mapX + w <= mapWidth && mapY + h <= mapHeight) {
                placements.push({
                  pieceId: piece.id,
                  x: mapX,
                  y: mapY,
                  rotation
                });
                markOccupied(w, h, gridX, gridY);
              }
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
      return `- ${terrain}: available sizes ${sizes}`;
    }).join('\n');

    // Build user prompt
    const userPrompt = `Create a tactical battle map layout for this scene:

Scene: ${body.sceneDescription}

Map Size: ${body.mapWidth}" x ${body.mapHeight}" (inches)

Available Terrain Types and their piece sizes:
${terrainSummary}

Define rectangular regions for each terrain type. Our system will automatically fill each region with appropriately-sized pieces.

Guidelines:
- Regions can be any size, our system will pack pieces optimally
- Cover 40-70% of the map with terrain, leaving open areas for movement
- Create natural-looking groupings (forests together, water connected, etc.)
- Consider tactical gameplay with cover and chokepoints

Return JSON with regions array and description.`;

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

    // Fill each region with pieces
    const allPlacements: PlacementSuggestion[] = [];

    for (const region of validRegions) {
      const regionPlacements = fillRegionWithPieces(
        region,
        body.availablePieces,
        body.mapWidth,
        body.mapHeight
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
