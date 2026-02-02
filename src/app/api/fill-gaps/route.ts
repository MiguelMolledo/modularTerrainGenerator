import { NextRequest, NextResponse } from 'next/server';

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

interface PlacedPiece {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

interface FillGapsRequest {
  mapWidth: number;
  mapHeight: number;
  availablePieces: AvailablePiece[];
  placedPieces: PlacedPiece[];
  terrainType: string;
}

interface PlacementSuggestion {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
}

interface SuccessResponse {
  placements: PlacementSuggestion[];
  filledArea: number;
}

interface ErrorResponse {
  error: string;
}

// Occupancy grid to track placed pieces
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

  countEmpty(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.grid[y][x]) count++;
      }
    }
    return count;
  }
}

// Classify pieces by their elevation pattern
function isFlat(elevation: CornerElevations | undefined): boolean {
  if (!elevation) return true;
  return elevation.nw === 0 && elevation.ne === 0 && elevation.sw === 0 && elevation.se === 0;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    let body: FillGapsRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body.mapWidth || !body.mapHeight) {
      return NextResponse.json(
        { error: 'mapWidth and mapHeight are required' },
        { status: 400 }
      );
    }

    if (!body.terrainType) {
      return NextResponse.json(
        { error: 'terrainType is required' },
        { status: 400 }
      );
    }

    if (!body.availablePieces || body.availablePieces.length === 0) {
      return NextResponse.json(
        { error: 'availablePieces is required' },
        { status: 400 }
      );
    }

    // Create occupancy grid and mark existing pieces
    const occupancy = new OccupancyGrid(body.mapWidth, body.mapHeight);

    // Mark already placed pieces as occupied
    for (const placed of body.placedPieces || []) {
      occupancy.markOccupied(placed.x, placed.y, placed.width, placed.height);
    }

    const emptyBefore = occupancy.countEmpty();

    // Filter pieces that match the target terrain type
    const matchingPieces = body.availablePieces.filter(p => {
      const terrainMatch = p.terrainType.toLowerCase() === body.terrainType.toLowerCase() ||
                           p.terrainType.toLowerCase().includes(body.terrainType.toLowerCase()) ||
                           body.terrainType.toLowerCase().includes(p.terrainType.toLowerCase());
      // Only use flat, non-diagonal pieces for gap filling
      return terrainMatch && !p.isDiagonal && isFlat(p.elevation);
    });

    if (matchingPieces.length === 0) {
      return NextResponse.json(
        { error: `No flat pieces found for terrain type "${body.terrainType}"` },
        { status: 400 }
      );
    }

    // Sort pieces by area (smallest first for better gap filling)
    const sortedPieces = [...matchingPieces].sort((a, b) =>
      (a.width * a.height) - (b.width * b.height)
    );

    const placements: PlacementSuggestion[] = [];

    // Multiple passes: start with larger pieces, then smaller to fill gaps
    const passPriority = [
      [...matchingPieces].sort((a, b) => (b.width * b.height) - (a.width * a.height)), // Large first
      sortedPieces, // Small first
      sortedPieces, // Another pass with small
    ];

    for (const pieces of passPriority) {
      for (const piece of pieces) {
        const orientations = piece.width === piece.height
          ? [{ w: piece.width, h: piece.height, rotation: 0 }]
          : [
              { w: piece.width, h: piece.height, rotation: 0 },
              { w: piece.height, h: piece.width, rotation: 90 }
            ];

        for (const { w, h, rotation } of orientations) {
          // Scan the entire map for empty spots
          for (let y = 0; y + h <= body.mapHeight; y += 1.5) {
            for (let x = 0; x + w <= body.mapWidth; x += 1.5) {
              if (occupancy.canPlace(x, y, w, h)) {
                placements.push({
                  pieceId: piece.id,
                  x,
                  y,
                  rotation
                });
                occupancy.markOccupied(x, y, w, h);
              }
            }
          }
        }
      }
    }

    const emptyAfter = occupancy.countEmpty();
    const filledArea = emptyBefore - emptyAfter;

    return NextResponse.json({
      placements,
      filledArea
    });
  } catch (error) {
    console.error('Fill gaps error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
