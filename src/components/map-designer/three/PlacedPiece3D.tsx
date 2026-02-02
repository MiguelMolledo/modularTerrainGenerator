'use client';

import React, { useMemo } from 'react';
import { PlacedPiece, ModularPiece, TerrainType, CornerElevations, DEFAULT_CORNER_ELEVATIONS } from '@/types';
import { PIECE_HEIGHT_INCHES, LEVEL_HEIGHT_INCHES } from '@/config/terrain';
import { desaturateColor } from '@/lib/colorUtils';
import * as THREE from 'three';

interface PlacedPiece3DProps {
  placedPiece: PlacedPiece;
  piece: ModularPiece;
  terrain: TerrainType | undefined;
  terrainMap: Map<string, TerrainType>;
  isSelected: boolean;
  isReference?: boolean;
  referenceOpacity?: number;
  onClick: () => void;
}

/**
 * Create a box geometry with custom corner elevations
 * Corner mapping (looking from above, Y pointing up, camera from +Z):
 *   NW -------- NE    (at -Z, back/north)
 *   |            |
 *   |            |
 *   SW -------- SE    (at +Z, front/south)
 *
 * In Three.js coordinates:
 * - X increases to the right (east)
 * - Z increases toward the camera (south in our mapping)
 * - Y increases upward
 */
function createElevatedBoxGeometry(
  width: number,
  depth: number,
  baseHeight: number,
  corners: CornerElevations
): THREE.BufferGeometry {
  const hw = width / 2;  // half width
  const hd = depth / 2;  // half depth

  // Corner heights (base + elevation)
  const hNW = baseHeight + corners.nw;
  const hNE = baseHeight + corners.ne;
  const hSW = baseHeight + corners.sw;
  const hSE = baseHeight + corners.se;

  // Vertices for the box
  // Bottom face (y = 0)
  const v0 = [-hw, 0, -hd];  // NW bottom (back-left)
  const v1 = [hw, 0, -hd];   // NE bottom (back-right)
  const v2 = [hw, 0, hd];    // SE bottom (front-right)
  const v3 = [-hw, 0, hd];   // SW bottom (front-left)

  // Top face (variable heights)
  const v4 = [-hw, hNW, -hd];  // NW top (back-left)
  const v5 = [hw, hNE, -hd];   // NE top (back-right)
  const v6 = [hw, hSE, hd];    // SE top (front-right)
  const v7 = [-hw, hSW, hd];   // SW top (front-left)

  // Define faces (two triangles per face)
  // Each face needs vertices, and we duplicate them for proper normals
  const positions: number[] = [];
  const normals: number[] = [];

  // Helper to add a quad (two triangles)
  const addQuad = (
    p0: number[], p1: number[], p2: number[], p3: number[],
    normal: number[]
  ) => {
    // Triangle 1: p0, p1, p2
    positions.push(...p0, ...p1, ...p2);
    normals.push(...normal, ...normal, ...normal);
    // Triangle 2: p0, p2, p3
    positions.push(...p0, ...p2, ...p3);
    normals.push(...normal, ...normal, ...normal);
  };

  // Helper to calculate normal from three points
  const calcNormal = (p0: number[], p1: number[], p2: number[]): number[] => {
    const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
    return [n[0] / len, n[1] / len, n[2] / len];
  };

  // Bottom face (facing down)
  addQuad(v0, v3, v2, v1, [0, -1, 0]);

  // Top face (facing up, but might be sloped)
  const topNormal = calcNormal(v4, v5, v6);
  addQuad(v4, v5, v6, v7, topNormal);

  // Front face (south, +Z)
  const frontNormal = calcNormal(v3, v7, v6);
  addQuad(v3, v7, v6, v2, frontNormal);

  // Back face (north, -Z)
  const backNormal = calcNormal(v1, v5, v4);
  addQuad(v1, v5, v4, v0, backNormal);

  // Right face (east, +X)
  const rightNormal = calcNormal(v2, v6, v5);
  addQuad(v2, v6, v5, v1, rightNormal);

  // Left face (west, -X)
  const leftNormal = calcNormal(v0, v4, v7);
  addQuad(v0, v4, v7, v3, leftNormal);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  return geometry;
}

/**
 * Apply rotation to corner elevations
 * When a piece is rotated, the corners shift positions
 */
function rotateCornerElevations(corners: CornerElevations, rotation: number): CornerElevations {
  const r = ((rotation % 360) + 360) % 360;
  switch (r) {
    case 90:
      return { nw: corners.sw, ne: corners.nw, se: corners.ne, sw: corners.se };
    case 180:
      return { nw: corners.se, ne: corners.sw, se: corners.nw, sw: corners.ne };
    case 270:
      return { nw: corners.ne, ne: corners.se, se: corners.sw, sw: corners.nw };
    default:
      return corners;
  }
}

// Cell size for grid-based pieces (1.5" per cell)
const CELL_SIZE = 1.5;

export function PlacedPiece3D({
  placedPiece,
  piece,
  terrain,
  terrainMap,
  isSelected,
  isReference = false,
  referenceOpacity = 0.3,
  onClick,
}: PlacedPiece3DProps) {
  // Get piece height (use piece's baseHeight or default)
  const pieceHeight = piece.baseHeight ?? PIECE_HEIGHT_INCHES;

  // Get corner elevations (default to flat if not specified)
  // NOTE: We use the elevation as-is without rotating it here.
  // The mesh rotation (rotationY) will handle the visual rotation.
  // This way, a piece with elevation on the north side will have that
  // elevation move with the piece when it's rotated on the map.
  const elevation = piece.elevation || DEFAULT_CORNER_ELEVATIONS;

  // Calculate effective dimensions based on rotation
  const isRotated = placedPiece.rotation === 90 || placedPiece.rotation === 270;
  const effectiveWidth = isRotated ? piece.size.height : piece.size.width;
  const effectiveHeight = isRotated ? piece.size.width : piece.size.height;

  // Calculate 3D position
  // 2D: x goes right, y goes down (north at top, y=0)
  // 3D: x goes right, y goes up (height), z goes forward
  // North (2D y=0) should be at back (-Z), South (2D y=max) at front (+Z)
  // Use EFFECTIVE dimensions for positioning (matches 2D canvas behavior)
  const position = useMemo(() => {
    const centerX = placedPiece.x + effectiveWidth / 2;
    const centerZ = placedPiece.y + effectiveHeight / 2;
    const heightY = placedPiece.level * LEVEL_HEIGHT_INCHES;
    return new THREE.Vector3(centerX, heightY, centerZ);
  }, [placedPiece.x, placedPiece.y, placedPiece.level, effectiveWidth, effectiveHeight]);

  // Rotation in radians (negate because Three.js Y rotation is counter-clockwise)
  const rotationY = -(placedPiece.rotation * Math.PI) / 180;

  // Check if piece has cell colors (multi-terrain)
  const hasCellColors = piece.cellColors && piece.cellColors.length > 0;

  // Create geometry based on piece shape and elevation (for single-color pieces)
  const geometry = useMemo(() => {
    if (hasCellColors) return null; // Will render cells individually

    if (piece.isDiagonal) {
      // Create triangle prism for diagonal pieces
      // Always use same base shape (matching 2D), let group rotation handle orientation
      const shape = new THREE.Shape();
      const w = piece.size.width;
      const h = piece.size.height;

      // For diagonal pieces, we use the average height of involved corners
      const avgHeight = pieceHeight + (elevation.nw + elevation.ne + elevation.sw) / 3;

      // Triangle matching 2D orientation: right angle at NW, legs to NE and SW
      // In shape coords (Y up): NW is at (-w/2, h/2), after rotateX becomes back-left
      // This matches 2D where triangle is at (0,0)-(w,0)-(0,h) with right angle at top-left
      shape.moveTo(-w / 2, h / 2);   // NW (back-left after rotation)
      shape.lineTo(w / 2, h / 2);    // NE (back-right after rotation)
      shape.lineTo(-w / 2, -h / 2);  // SW (front-left after rotation)
      shape.closePath();

      const extrudeSettings = {
        depth: avgHeight,
        bevelEnabled: false,
      };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      // Rotate to make extrusion go up (y axis)
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, avgHeight / 2, 0);
      return geo;
    } else {
      // Create elevated box geometry for rectangular pieces
      return createElevatedBoxGeometry(
        piece.size.width,
        piece.size.height,
        pieceHeight,
        elevation
      );
    }
  }, [piece.size.width, piece.size.height, piece.isDiagonal, piece.defaultRotation, elevation, hasCellColors, pieceHeight]);

  // Parse terrain color (desaturated for reference pieces)
  const color = useMemo(() => {
    const baseColor = terrain?.color || '#888888';
    return isReference ? desaturateColor(baseColor, 0.5) : baseColor;
  }, [terrain?.color, isReference]);

  // Edge color for outline
  const edgeColor = isSelected ? '#ffffff' : '#000000';

  // Material props for transparency
  const materialProps = isReference
    ? { transparent: true, opacity: referenceOpacity }
    : {};

  // Render multi-colored cells for pieces with cellColors
  if (hasCellColors && piece.cellColors) {
    const cells = piece.cellColors;
    const numRows = cells.length;
    const numCols = cells[0]?.length || 0;
    const totalWidth = piece.size.width;
    const totalHeight = piece.size.height;

    // Calculate actual cell size based on piece dimensions and grid
    const cellWidth = totalWidth / numCols;
    const cellDepth = totalHeight / numRows;

    return (
      <group
        position={position}
        rotation={[0, rotationY, 0]}
        onClick={isReference ? undefined : (e) => { e.stopPropagation(); onClick(); }}
      >
        {cells.map((row, rowIdx) =>
          row.map((cellTerrainId, colIdx) => {
            const cellTerrain = terrainMap.get(cellTerrainId);
            const baseCellColor = cellTerrain?.color || '#888888';
            const cellColor = isReference ? desaturateColor(baseCellColor, 0.5) : baseCellColor;

            // Calculate cell position relative to piece center
            // Row 0 is at the back (-Z/north), higher rows toward front (+Z/south)
            const cellX = (colIdx + 0.5) * cellWidth - totalWidth / 2;
            const cellZ = (rowIdx + 0.5) * cellDepth - totalHeight / 2;

            // Box geometry sized to actual cell dimensions
            const cellGeometry = new THREE.BoxGeometry(cellWidth - 0.05, pieceHeight, cellDepth - 0.05);

            return (
              <group key={`cell-${rowIdx}-${colIdx}`} position={[cellX, pieceHeight / 2, cellZ]}>
                <mesh geometry={cellGeometry}>
                  <meshBasicMaterial color={cellColor} {...materialProps} />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[cellGeometry]} />
                  <lineBasicMaterial color="#000000" />
                </lineSegments>
              </group>
            );
          })
        )}
        {/* Selection outline for the whole piece */}
        {isSelected && !isReference && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(totalWidth, pieceHeight, totalHeight)]} />
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </lineSegments>
        )}
      </group>
    );
  }

  // Render single-color piece
  return (
    <group position={position} rotation={[0, rotationY, 0]} onClick={isReference ? undefined : (e) => { e.stopPropagation(); onClick(); }}>
      {/* Main mesh - flat color */}
      <mesh geometry={geometry!}>
        <meshBasicMaterial color={color} {...materialProps} />
      </mesh>
      {/* Edge outline */}
      <lineSegments>
        <edgesGeometry args={[geometry!]} />
        <lineBasicMaterial color={edgeColor} linewidth={isSelected ? 2 : 1} />
      </lineSegments>
    </group>
  );
}
