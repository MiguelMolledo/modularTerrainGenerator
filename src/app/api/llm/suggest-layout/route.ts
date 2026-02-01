import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, OPENROUTER_MODELS } from '@/lib/openrouter';

// System prompt for layout suggestions
const LAYOUT_SUGGESTION_SYSTEM = `You are a D&D/tabletop RPG map designer assistant. Given a scene description and available terrain pieces, suggest a layout for a tactical battle map.

You will receive:
- Map dimensions (width x height in inches)
- Available terrain pieces with their sizes and quantities
- A scene description

Your task is to suggest piece placements that create an interesting, playable battle map. Consider:
- Natural terrain flow (rivers should connect, forests should cluster)
- Tactical interest (cover, chokepoints, flanking opportunities)
- Piece availability (don't exceed available quantities)
- Leave open areas for combat
- Consider elevation for visual interest

For each piece placement, provide:
- pieceId: The ID of the terrain piece to place
- x: X position in inches (0 = left edge)
- y: Y position in inches (0 = top edge)
- rotation: 0, 90, 180, or 270 degrees

Respond ONLY with valid JSON. No explanations or markdown.
Format:
{
  "placements": [
    {"pieceId": "...", "x": 0, "y": 0, "rotation": 0}
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
  available: number;
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

interface LayoutResult {
  placements: PlacementSuggestion[];
  description: string;
}

interface SuccessResponse {
  placements: PlacementSuggestion[];
  description: string;
}

interface ErrorResponse {
  error: string;
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

    // Build a summary of available pieces for the LLM
    const piecesSummary = body.availablePieces
      .filter((p) => p.available > 0)
      .map((p) => `- ${p.id}: ${p.name} (${p.terrainType}, ${p.width}"x${p.height}"${p.isDiagonal ? ' diagonal' : ''}, ${p.available} available)`)
      .join('\n');

    if (!piecesSummary) {
      return NextResponse.json(
        { error: 'No pieces with available quantity found' },
        { status: 400 }
      );
    }

    // Build user prompt
    const userPrompt = `Create a tactical battle map layout for this scene:

Scene: ${body.sceneDescription}

Map Size: ${body.mapWidth}" x ${body.mapHeight}"

Available Terrain Pieces:
${piecesSummary}

Place pieces to create an interesting battle map. Use a variety of pieces and leave space for movement.
Return JSON with placements array and description.`;

    // Call OpenRouter
    const response = await callOpenRouter(
      [
        { role: 'system', content: LAYOUT_SUGGESTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.quality, // Use quality model for spatial reasoning
      3000,
      openRouterKey || undefined
    );

    // Parse the response
    let result: LayoutResult;
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

    // Validate and sanitize placements
    const validPieceIds = new Set(body.availablePieces.map((p) => p.id));
    const validRotations = [0, 90, 180, 270];

    // Track usage to not exceed availability
    const usageCount = new Map<string, number>();

    const sanitizedPlacements: PlacementSuggestion[] = (result.placements || [])
      .filter((p): p is PlacementSuggestion => {
        if (!p || typeof p !== 'object') return false;
        if (!validPieceIds.has(p.pieceId)) return false;
        if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
        if (!validRotations.includes(p.rotation)) return false;

        // Check availability
        const piece = body.availablePieces.find((ap) => ap.id === p.pieceId);
        if (!piece) return false;

        const currentUsage = usageCount.get(p.pieceId) || 0;
        if (currentUsage >= piece.available) return false;

        usageCount.set(p.pieceId, currentUsage + 1);
        return true;
      })
      .map((p) => {
        // Clamp positions to map bounds
        const piece = body.availablePieces.find((ap) => ap.id === p.pieceId)!;
        const isRotated = p.rotation === 90 || p.rotation === 270;
        const effectiveWidth = isRotated ? piece.height : piece.width;
        const effectiveHeight = isRotated ? piece.width : piece.height;

        return {
          pieceId: p.pieceId,
          x: Math.max(0, Math.min(p.x, body.mapWidth - effectiveWidth)),
          y: Math.max(0, Math.min(p.y, body.mapHeight - effectiveHeight)),
          rotation: p.rotation,
        };
      });

    return NextResponse.json({
      placements: sanitizedPlacements,
      description: typeof result.description === 'string' ? result.description.slice(0, 500) : '',
    });
  } catch (error) {
    console.error('Layout suggestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during layout generation' },
      { status: 500 }
    );
  }
}
