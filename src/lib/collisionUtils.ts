/**
 * Collision detection utilities for modular terrain pieces
 * Supports both rectangular and diagonal (triangular) pieces
 */

interface Point {
  x: number;
  y: number;
}

interface PieceGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isDiagonal: boolean;
}

/**
 * Get the vertices of a triangle piece based on its position, size, and rotation
 * The base triangle at 0° has vertices at: top-left, top-right, bottom-left
 * This creates a right triangle with the right angle at top-left
 */
function getTriangleVertices(piece: PieceGeometry): Point[] {
  const { x, y, width, height, rotation } = piece;
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Base triangle vertices relative to center (at 0° rotation)
  // Triangle points: top-left, top-right, bottom-left
  const baseVertices: Point[] = [
    { x: -width / 2, y: -height / 2 },  // top-left
    { x: width / 2, y: -height / 2 },   // top-right
    { x: -width / 2, y: height / 2 },   // bottom-left
  ];

  // Rotate each vertex around the center
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return baseVertices.map((v) => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos,
  }));
}

/**
 * Get the vertices of a rectangle piece
 */
function getRectangleVertices(piece: PieceGeometry): Point[] {
  const { x, y, width, height } = piece;
  return [
    { x, y },                      // top-left
    { x: x + width, y },           // top-right
    { x: x + width, y: y + height }, // bottom-right
    { x, y: y + height },          // bottom-left
  ];
}

/**
 * Check if a point is inside a triangle using barycentric coordinates
 */
function pointInTriangle(p: Point, v1: Point, v2: Point, v3: Point): boolean {
  const sign = (p1: Point, p2: Point, p3: Point) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

  const d1 = sign(p, v1, v2);
  const d2 = sign(p, v2, v3);
  const d3 = sign(p, v3, v1);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

/**
 * Check if a point is inside a rectangle
 */
function pointInRectangle(p: Point, rect: PieceGeometry): boolean {
  return (
    p.x >= rect.x &&
    p.x <= rect.x + rect.width &&
    p.y >= rect.y &&
    p.y <= rect.y + rect.height
  );
}

/**
 * Check if two line segments intersect
 */
function segmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const ccw = (A: Point, B: Point, C: Point) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Check if edges of two polygons intersect
 */
function edgesIntersect(vertices1: Point[], vertices2: Point[]): boolean {
  for (let i = 0; i < vertices1.length; i++) {
    const a1 = vertices1[i];
    const a2 = vertices1[(i + 1) % vertices1.length];

    for (let j = 0; j < vertices2.length; j++) {
      const b1 = vertices2[j];
      const b2 = vertices2[(j + 1) % vertices2.length];

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if two triangles collide
 */
function trianglesCollide(tri1: Point[], tri2: Point[]): boolean {
  // Check if any vertex of tri1 is inside tri2
  for (const p of tri1) {
    if (pointInTriangle(p, tri2[0], tri2[1], tri2[2])) {
      return true;
    }
  }

  // Check if any vertex of tri2 is inside tri1
  for (const p of tri2) {
    if (pointInTriangle(p, tri1[0], tri1[1], tri1[2])) {
      return true;
    }
  }

  // Check if edges intersect
  if (edgesIntersect(tri1, tri2)) {
    return true;
  }

  return false;
}

/**
 * Check if a triangle and rectangle collide
 */
function triangleRectCollide(tri: Point[], rect: PieceGeometry): boolean {
  const rectVertices = getRectangleVertices(rect);

  // Check if any triangle vertex is inside rectangle
  for (const p of tri) {
    if (pointInRectangle(p, rect)) {
      return true;
    }
  }

  // Check if any rectangle vertex is inside triangle
  for (const p of rectVertices) {
    if (pointInTriangle(p, tri[0], tri[1], tri[2])) {
      return true;
    }
  }

  // Check if edges intersect
  if (edgesIntersect(tri, rectVertices)) {
    return true;
  }

  return false;
}

/**
 * Check if two rectangles collide (AABB)
 */
function rectanglesCollide(rect1: PieceGeometry, rect2: PieceGeometry): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Check if two triangles are complementary (rotations differ by 180°)
 * Complementary triangles can occupy the same bounding box without colliding
 * because they fill opposite halves of the rectangle.
 *
 * Examples:
 * - 0° and 180° are complementary
 * - 90° and 270° are complementary
 */
function areComplementaryTriangles(
  piece1: PieceGeometry,
  piece2: PieceGeometry,
  positionTolerance: number = 0.1
): boolean {
  // Both must be diagonal pieces
  if (!piece1.isDiagonal || !piece2.isDiagonal) {
    return false;
  }

  // Check if rotations differ by 180° (mod 360)
  const rotationDiff = Math.abs(piece1.rotation - piece2.rotation) % 360;
  const isComplementaryRotation = rotationDiff === 180;

  if (!isComplementaryRotation) {
    return false;
  }

  // Check if they're at the same position (within tolerance)
  const samePosition =
    Math.abs(piece1.x - piece2.x) < positionTolerance &&
    Math.abs(piece1.y - piece2.y) < positionTolerance;

  // Check if they have the same size
  const sameSize =
    Math.abs(piece1.width - piece2.width) < positionTolerance &&
    Math.abs(piece1.height - piece2.height) < positionTolerance;

  return samePosition && sameSize;
}

/**
 * Main collision detection function that handles all piece types
 * Adds a small epsilon for floating point tolerance
 */
export function checkPieceCollision(
  piece1: PieceGeometry,
  piece2: PieceGeometry,
  epsilon: number = 0.01
): boolean {
  // Special case: complementary triangles (rotations differ by 180°)
  // These can occupy the same space as they fill opposite halves
  if (areComplementaryTriangles(piece1, piece2)) {
    return false;
  }

  // Apply small inset to avoid false positives at exact boundaries
  const inset1: PieceGeometry = {
    ...piece1,
    x: piece1.x + epsilon,
    y: piece1.y + epsilon,
    width: piece1.width - epsilon * 2,
    height: piece1.height - epsilon * 2,
  };
  const inset2: PieceGeometry = {
    ...piece2,
    x: piece2.x + epsilon,
    y: piece2.y + epsilon,
    width: piece2.width - epsilon * 2,
    height: piece2.height - epsilon * 2,
  };

  // First do a quick AABB check - if no bounding box overlap, no collision
  if (!rectanglesCollide(inset1, inset2)) {
    return false;
  }

  // If neither is diagonal, the AABB check is sufficient
  if (!piece1.isDiagonal && !piece2.isDiagonal) {
    return true;
  }

  // Handle diagonal pieces with precise collision detection
  if (piece1.isDiagonal && piece2.isDiagonal) {
    const tri1 = getTriangleVertices(inset1);
    const tri2 = getTriangleVertices(inset2);
    return trianglesCollide(tri1, tri2);
  }

  // One diagonal, one rectangle
  if (piece1.isDiagonal) {
    const tri = getTriangleVertices(inset1);
    return triangleRectCollide(tri, inset2);
  } else {
    const tri = getTriangleVertices(inset2);
    return triangleRectCollide(tri, inset1);
  }
}

/**
 * Check collision for a piece against all placed pieces
 */
export function checkCollisionWithPieces(
  newPiece: PieceGeometry,
  placedPieces: Array<{
    id: string;
    x: number;
    y: number;
    rotation: number;
    pieceId: string;
  }>,
  getPieceInfo: (pieceId: string) => { width: number; height: number; isDiagonal: boolean } | null,
  excludeId?: string
): boolean {
  for (const placed of placedPieces) {
    if (excludeId && placed.id === excludeId) continue;

    const pieceInfo = getPieceInfo(placed.pieceId);
    if (!pieceInfo) continue;

    // Calculate effective dimensions based on rotation
    const isRotated = placed.rotation === 90 || placed.rotation === 270;
    const placedGeometry: PieceGeometry = {
      x: placed.x,
      y: placed.y,
      width: isRotated ? pieceInfo.height : pieceInfo.width,
      height: isRotated ? pieceInfo.width : pieceInfo.height,
      rotation: placed.rotation,
      isDiagonal: pieceInfo.isDiagonal,
    };

    if (checkPieceCollision(newPiece, placedGeometry)) {
      return true;
    }
  }

  return false;
}

/**
 * Check 3D collisions between all placed pieces on the same level.
 * Returns an array of piece IDs that are in collision with at least one other piece.
 * This is used by the 3D editor to show visual warnings (red tint) on colliding pieces.
 *
 * @param placedPieces - Array of placed pieces with position and rotation
 * @param getPieceInfo - Function to get piece dimensions by pieceId
 * @param level - Optional level to filter pieces (if undefined, checks all levels separately)
 * @returns Array of piece IDs that are colliding
 */
export function check3DCollisions(
  placedPieces: Array<{
    id: string;
    x: number;
    y: number;
    rotation: number;
    pieceId: string;
    level: number;
  }>,
  getPieceInfo: (pieceId: string) => { width: number; height: number; isDiagonal: boolean } | null,
  level?: number
): string[] {
  const collidingIds = new Set<string>();

  // Filter pieces by level if specified
  const piecesToCheck = level !== undefined
    ? placedPieces.filter(p => p.level === level)
    : placedPieces;

  // Group pieces by level for efficient collision checking
  const piecesByLevel = new Map<number, typeof piecesToCheck>();
  for (const piece of piecesToCheck) {
    const levelPieces = piecesByLevel.get(piece.level) || [];
    levelPieces.push(piece);
    piecesByLevel.set(piece.level, levelPieces);
  }

  // Check collisions within each level
  for (const levelPieces of piecesByLevel.values()) {
    // Compare each pair of pieces on the same level
    for (let i = 0; i < levelPieces.length; i++) {
      const piece1 = levelPieces[i];
      const info1 = getPieceInfo(piece1.pieceId);
      if (!info1) continue;

      // Calculate effective dimensions based on rotation
      const isRotated1 = piece1.rotation === 90 || piece1.rotation === 270;
      const geometry1: PieceGeometry = {
        x: piece1.x,
        y: piece1.y,
        width: isRotated1 ? info1.height : info1.width,
        height: isRotated1 ? info1.width : info1.height,
        rotation: piece1.rotation,
        isDiagonal: info1.isDiagonal,
      };

      for (let j = i + 1; j < levelPieces.length; j++) {
        const piece2 = levelPieces[j];
        const info2 = getPieceInfo(piece2.pieceId);
        if (!info2) continue;

        // Calculate effective dimensions based on rotation
        const isRotated2 = piece2.rotation === 90 || piece2.rotation === 270;
        const geometry2: PieceGeometry = {
          x: piece2.x,
          y: piece2.y,
          width: isRotated2 ? info2.height : info2.width,
          height: isRotated2 ? info2.width : info2.height,
          rotation: piece2.rotation,
          isDiagonal: info2.isDiagonal,
        };

        // Check if these two pieces collide
        if (checkPieceCollision(geometry1, geometry2)) {
          collidingIds.add(piece1.id);
          collidingIds.add(piece2.id);
        }
      }
    }
  }

  return Array.from(collidingIds);
}
