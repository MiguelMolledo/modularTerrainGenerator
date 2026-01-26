'use client';

import React, { useMemo } from 'react';
import { PlacedPiece, ModularPiece, TerrainType, CornerElevations, DEFAULT_CORNER_ELEVATIONS } from '@/types';
import { PIECE_HEIGHT_INCHES, LEVEL_HEIGHT_INCHES } from '@/config/terrain';
import * as THREE from 'three';

interface PlacedPiece3DProps {
  placedPiece: PlacedPiece;
  piece: ModularPiece;
  terrain: TerrainType | undefined;
  terrainMap: Map<string, TerrainType>;
  isSelected: boolean;
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
  onClick,
}: PlacedPiece3DProps) {
  // Get corner elevations (default to flat if not specified)
  const baseElevation = piece.elevation || DEFAULT_CORNER_ELEVATIONS;

  // Apply rotation to corner elevations
  const rotatedElevation = useMemo(() => {
    return rotateCornerElevations(baseElevation, placedPiece.rotation);
  }, [baseElevation, placedPiece.rotation]);

  // Calculate 3D position
  // 2D: x goes right, y goes down (north at top, y=0)
  // 3D: x goes right, y goes up (height), z goes forward
  // North (2D y=0) should be at back (-Z), South (2D y=max) at front (+Z)
  const position = useMemo(() => {
    const centerX = placedPiece.x + piece.size.width / 2;
    const centerZ = placedPiece.y + piece.size.height / 2;
    const heightY = placedPiece.level * LEVEL_HEIGHT_INCHES;
    return new THREE.Vector3(centerX, heightY, centerZ);
  }, [placedPiece.x, placedPiece.y, placedPiece.level, piece.size.width, piece.size.height]);

  // Check if piece has cell colors (multi-terrain)
  const hasCellColors = piece.cellColors && piece.cellColors.length > 0;

  // Create geometry based on piece shape and elevation (for single-color pieces)
  const geometry = useMemo(() => {
    if (hasCellColors) return null; // Will render cells individually

    if (piece.isDiagonal) {
      // Create triangle prism for diagonal pieces
      const shape = new THREE.Shape();
      const w = piece.size.width;
      const h = piece.size.height;

      // For diagonal pieces, we use the average height of involved corners
      let avgHeight = PIECE_HEIGHT_INCHES;

      // Triangle based on rotation (defaultRotation for diagonal pieces)
      const diagRotation = piece.defaultRotation || 0;
      switch (diagRotation) {
        case 0: // Top-left corner (NW, NE, SW)
          shape.moveTo(-w / 2, -h / 2);  // SW
          shape.lineTo(w / 2, -h / 2);   // SE... wait, this is NE for diagonal
          shape.lineTo(-w / 2, h / 2);   // NW
          shape.closePath();
          avgHeight = PIECE_HEIGHT_INCHES + (rotatedElevation.nw + rotatedElevation.ne + rotatedElevation.sw) / 3;
          break;
        case 90: // Top-right corner (NW, NE, SE)
          shape.moveTo(-w / 2, -h / 2);
          shape.lineTo(w / 2, -h / 2);
          shape.lineTo(w / 2, h / 2);
          shape.closePath();
          avgHeight = PIECE_HEIGHT_INCHES + (rotatedElevation.nw + rotatedElevation.ne + rotatedElevation.se) / 3;
          break;
        case 180: // Bottom-right corner (NE, SE, SW)
          shape.moveTo(w / 2, -h / 2);
          shape.lineTo(w / 2, h / 2);
          shape.lineTo(-w / 2, h / 2);
          shape.closePath();
          avgHeight = PIECE_HEIGHT_INCHES + (rotatedElevation.ne + rotatedElevation.se + rotatedElevation.sw) / 3;
          break;
        case 270: // Bottom-left corner (NW, SE, SW)
        default:
          shape.moveTo(-w / 2, -h / 2);
          shape.lineTo(-w / 2, h / 2);
          shape.lineTo(w / 2, h / 2);
          shape.closePath();
          avgHeight = PIECE_HEIGHT_INCHES + (rotatedElevation.nw + rotatedElevation.se + rotatedElevation.sw) / 3;
          break;
      }

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
        PIECE_HEIGHT_INCHES,
        rotatedElevation
      );
    }
  }, [piece.size.width, piece.size.height, piece.isDiagonal, piece.defaultRotation, rotatedElevation, hasCellColors]);

  // Parse terrain color
  const color = useMemo(() => {
    return terrain?.color || '#888888';
  }, [terrain?.color]);

  // Edge color for outline
  const edgeColor = isSelected ? '#ffffff' : '#000000';

  // Render multi-colored cells for pieces with cellColors
  if (hasCellColors && piece.cellColors) {
    const cells = piece.cellColors;
    const numRows = cells.length;
    const numCols = cells[0]?.length || 0;
    const totalWidth = piece.size.width;
    const totalHeight = piece.size.height;

    // Apply piece rotation to the whole group
    const rotationY = (placedPiece.rotation * Math.PI) / 180;

    return (
      <group
        position={position}
        rotation={[0, rotationY, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        {cells.map((row, rowIdx) =>
          row.map((cellTerrainId, colIdx) => {
            const cellTerrain = terrainMap.get(cellTerrainId);
            const cellColor = cellTerrain?.color || '#888888';

            // Calculate cell position relative to piece center
            // Row 0 is at the back (-Z/north), higher rows toward front (+Z/south)
            const cellX = (colIdx + 0.5) * CELL_SIZE - totalWidth / 2;
            const cellZ = (rowIdx + 0.5) * CELL_SIZE - totalHeight / 2;

            // Simple box geometry for each cell
            const cellGeometry = new THREE.BoxGeometry(CELL_SIZE - 0.05, PIECE_HEIGHT_INCHES, CELL_SIZE - 0.05);

            return (
              <group key={`cell-${rowIdx}-${colIdx}`} position={[cellX, PIECE_HEIGHT_INCHES / 2, cellZ]}>
                <mesh geometry={cellGeometry}>
                  <meshBasicMaterial color={cellColor} />
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
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(totalWidth, PIECE_HEIGHT_INCHES, totalHeight)]} />
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </lineSegments>
        )}
      </group>
    );
  }

  // Render single-color piece
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Main mesh - flat color */}
      <mesh geometry={geometry!}>
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Edge outline */}
      <lineSegments>
        <edgesGeometry args={[geometry!]} />
        <lineBasicMaterial color={edgeColor} linewidth={isSelected ? 2 : 1} />
      </lineSegments>
    </group>
  );
}
