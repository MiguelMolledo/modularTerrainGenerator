import { v4 as uuidv4 } from 'uuid';
import { PlacedPiece, ModularPiece } from '@/types';
import { MapTemplate, TemplatePiece, MapFeature } from '@/types/templates';

// Map piece type strings to actual piece dimensions
const PIECE_TYPE_TO_SIZE: Record<string, { width: number; height: number }> = {
  '3x3': { width: 3, height: 3 },
  '3x6': { width: 3, height: 6 },
  '3x1.5': { width: 3, height: 1.5 },
  '6x1.5': { width: 6, height: 1.5 },
  'diagonal': { width: 3, height: 3 },
};

// Find a matching available piece for a template piece
export function findMatchingPiece(
  templatePiece: TemplatePiece,
  availablePieces: ModularPiece[],
  terrainOverride?: string
): ModularPiece | null {
  const targetTerrain = terrainOverride || templatePiece.terrainType;
  const targetSize = PIECE_TYPE_TO_SIZE[templatePiece.pieceType];
  const isDiagonal = templatePiece.pieceType === 'diagonal';

  if (!targetSize) return null;

  return availablePieces.find(piece =>
    piece.terrainTypeId === targetTerrain &&
    piece.size.width === targetSize.width &&
    piece.size.height === targetSize.height &&
    piece.isDiagonal === isDiagonal
  ) || null;
}

// Check if a piece can be placed at a position without collision
export function checkCollision(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  existingPieces: PlacedPiece[],
  availablePieces: ModularPiece[],
  level: number
): boolean {
  // Adjust dimensions for rotation
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotated ? height : width;
  const effectiveHeight = isRotated ? width : height;

  for (const placed of existingPieces) {
    if (placed.level !== level) continue;

    const piece = availablePieces.find(p => p.id === placed.pieceId);
    if (!piece) continue;

    const placedRotated = placed.rotation === 90 || placed.rotation === 270;
    const placedWidth = placedRotated ? piece.size.height : piece.size.width;
    const placedHeight = placedRotated ? piece.size.width : piece.size.height;

    // AABB collision check
    if (
      x < placed.x + placedWidth &&
      x + effectiveWidth > placed.x &&
      y < placed.y + placedHeight &&
      y + effectiveHeight > placed.y
    ) {
      return true; // Collision detected
    }
  }

  return false; // No collision
}

// Check if template fits within map bounds
export function checkBounds(
  templateX: number,
  templateY: number,
  template: MapTemplate,
  templateRotation: number,
  mapWidth: number,
  mapHeight: number
): boolean {
  const isRotated = templateRotation === 90 || templateRotation === 270;
  const effectiveWidth = isRotated ? template.height : template.width;
  const effectiveHeight = isRotated ? template.width : template.height;

  return (
    templateX >= 0 &&
    templateY >= 0 &&
    templateX + effectiveWidth <= mapWidth &&
    templateY + effectiveHeight <= mapHeight
  );
}

// Get the used count for a piece
export function getPieceUsedCount(pieceId: string, placedPieces: PlacedPiece[]): number {
  return placedPieces.filter(p => p.pieceId === pieceId).length;
}

// Check if we have enough pieces available
export function hasEnoughPieces(
  template: MapTemplate,
  availablePieces: ModularPiece[],
  placedPieces: PlacedPiece[],
  terrainOverride?: string
): { success: boolean; missing: string[] } {
  const pieceRequirements: Record<string, number> = {};
  const missing: string[] = [];

  // Count required pieces
  for (const tp of template.pieces) {
    const matchingPiece = findMatchingPiece(tp, availablePieces, terrainOverride);
    if (!matchingPiece) {
      missing.push(`${tp.pieceType} (${terrainOverride || tp.terrainType})`);
      continue;
    }

    pieceRequirements[matchingPiece.id] = (pieceRequirements[matchingPiece.id] || 0) + 1;
  }

  // Check availability
  for (const [pieceId, required] of Object.entries(pieceRequirements)) {
    const piece = availablePieces.find(p => p.id === pieceId);
    if (!piece) continue;

    const used = getPieceUsedCount(pieceId, placedPieces);
    const available = piece.quantity - used;

    if (available < required) {
      missing.push(`${piece.name} (need ${required}, have ${available})`);
    }
  }

  return { success: missing.length === 0, missing };
}

// Transform template piece offset based on template rotation
function transformOffset(
  offsetX: number,
  offsetY: number,
  templateWidth: number,
  templateHeight: number,
  templateRotation: number
): { x: number; y: number } {
  switch (templateRotation) {
    case 90:
      return { x: templateHeight - offsetY - 3, y: offsetX };
    case 180:
      return { x: templateWidth - offsetX - 3, y: templateHeight - offsetY - 3 };
    case 270:
      return { x: offsetY, y: templateWidth - offsetX - 3 };
    default:
      return { x: offsetX, y: offsetY };
  }
}

export interface PlaceTemplateResult {
  success: boolean;
  pieces: PlacedPiece[];
  feature: MapFeature | null;
  errors: string[];
}

// Main function to place a template on the map
export function placeTemplate(
  template: MapTemplate,
  x: number,
  y: number,
  templateRotation: number,
  level: number,
  availablePieces: ModularPiece[],
  existingPieces: PlacedPiece[],
  mapWidth: number,
  mapHeight: number,
  terrainOverride?: string
): PlaceTemplateResult {
  const errors: string[] = [];
  const newPieces: PlacedPiece[] = [];
  const pieceIds: string[] = [];

  // Check bounds
  if (!checkBounds(x, y, template, templateRotation, mapWidth, mapHeight)) {
    return {
      success: false,
      pieces: [],
      feature: null,
      errors: ['Template does not fit within map bounds'],
    };
  }

  // Check piece availability
  const availability = hasEnoughPieces(template, availablePieces, existingPieces, terrainOverride);
  if (!availability.success) {
    return {
      success: false,
      pieces: [],
      feature: null,
      errors: [`Not enough pieces: ${availability.missing.join(', ')}`],
    };
  }

  // Track pieces we're going to use (to check availability correctly)
  const piecesBeingUsed: PlacedPiece[] = [...existingPieces];

  // Place each piece in the template
  for (const templatePiece of template.pieces) {
    const matchingPiece = findMatchingPiece(templatePiece, availablePieces, terrainOverride);
    if (!matchingPiece) {
      errors.push(`Could not find piece: ${templatePiece.pieceType} (${terrainOverride || templatePiece.terrainType})`);
      continue;
    }

    // Check if piece is still available
    const used = getPieceUsedCount(matchingPiece.id, piecesBeingUsed);
    if (used >= matchingPiece.quantity) {
      errors.push(`No more ${matchingPiece.name} available`);
      continue;
    }

    // Calculate transformed position
    const transformed = transformOffset(
      templatePiece.offsetX,
      templatePiece.offsetY,
      template.width,
      template.height,
      templateRotation
    );

    const pieceX = x + transformed.x;
    const pieceY = y + transformed.y;
    const pieceRotation = (templatePiece.rotation + templateRotation) % 360;

    // Check collision
    const hasCollision = checkCollision(
      pieceX,
      pieceY,
      matchingPiece.size.width,
      matchingPiece.size.height,
      pieceRotation,
      piecesBeingUsed,
      availablePieces,
      level
    );

    if (hasCollision) {
      errors.push(`Collision at (${pieceX}, ${pieceY}) for ${matchingPiece.name}`);
      continue;
    }

    // Create the placed piece
    const placedPiece: PlacedPiece = {
      id: uuidv4(),
      pieceId: matchingPiece.id,
      x: pieceX,
      y: pieceY,
      rotation: pieceRotation,
      level,
    };

    newPieces.push(placedPiece);
    pieceIds.push(placedPiece.id);
    piecesBeingUsed.push(placedPiece);
  }

  if (errors.length > 0 && newPieces.length === 0) {
    return {
      success: false,
      pieces: [],
      feature: null,
      errors,
    };
  }

  // Create the feature record
  const feature: MapFeature = {
    id: uuidv4(),
    templateId: template.id,
    name: template.name,
    x,
    y,
    rotation: templateRotation,
    placedPieceIds: pieceIds,
  };

  return {
    success: true,
    pieces: newPieces,
    feature,
    errors,
  };
}

// Find a valid position for a template (simple algorithm)
export function findValidPosition(
  template: MapTemplate,
  availablePieces: ModularPiece[],
  existingPieces: PlacedPiece[],
  mapWidth: number,
  mapHeight: number,
  level: number,
  terrainOverride?: string,
  preferredArea?: { minX: number; minY: number; maxX: number; maxY: number }
): { x: number; y: number; rotation: number } | null {
  const gridStep = 1.5; // Search in 1.5" increments
  const rotations = [0, 90, 180, 270];

  const minX = preferredArea?.minX ?? 0;
  const minY = preferredArea?.minY ?? 0;
  const maxX = preferredArea?.maxX ?? mapWidth;
  const maxY = preferredArea?.maxY ?? mapHeight;

  for (const rotation of rotations) {
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveWidth = isRotated ? template.height : template.width;
    const effectiveHeight = isRotated ? template.width : template.height;

    for (let y = minY; y + effectiveHeight <= maxY; y += gridStep) {
      for (let x = minX; x + effectiveWidth <= maxX; x += gridStep) {
        const result = placeTemplate(
          template,
          x,
          y,
          rotation,
          level,
          availablePieces,
          existingPieces,
          mapWidth,
          mapHeight,
          terrainOverride
        );

        if (result.success && result.errors.length === 0) {
          return { x, y, rotation };
        }
      }
    }
  }

  return null;
}
