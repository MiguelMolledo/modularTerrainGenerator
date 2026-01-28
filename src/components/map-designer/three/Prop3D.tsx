'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PlacedPiece, ModularPiece } from '@/types';
import { LEVEL_HEIGHT_INCHES, PIECE_HEIGHT_INCHES } from '@/config/terrain';

interface Prop3DProps {
  placedPiece: PlacedPiece;
  piece: ModularPiece;
  isSelected: boolean;
  onClick: () => void;
}

export function Prop3D({
  placedPiece,
  piece,
  isSelected,
  onClick,
}: Prop3DProps) {
  // Get piece height (use piece's baseHeight or default)
  const terrainHeight = piece.baseHeight ?? PIECE_HEIGHT_INCHES;

  // Calculate effective dimensions based on rotation
  const isRotated = placedPiece.rotation === 90 || placedPiece.rotation === 270;
  const effectiveWidth = isRotated ? piece.size.height : piece.size.width;
  const effectiveHeight = isRotated ? piece.size.width : piece.size.height;

  // Calculate 3D position
  const position = useMemo(() => {
    const centerX = placedPiece.x + effectiveWidth / 2;
    const centerZ = placedPiece.y + effectiveHeight / 2;
    // Props sit on top of the terrain at the current level
    const heightY = placedPiece.level * LEVEL_HEIGHT_INCHES + terrainHeight;
    return new THREE.Vector3(centerX, heightY, centerZ);
  }, [placedPiece.x, placedPiece.y, placedPiece.level, effectiveWidth, effectiveHeight, terrainHeight]);

  // Prop radius based on size
  const propRadius = Math.min(piece.size.width, piece.size.height) / 2;
  const propHeight = propRadius * 1.5; // Make props taller for visibility

  // Emoji font size scaled to prop size
  const emojiSize = Math.max(24, propRadius * 40);

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Cylinder base for the prop */}
      <mesh position={[0, propHeight / 2, 0]}>
        <cylinderGeometry args={[propRadius * 0.9, propRadius, propHeight, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : '#ffffff'}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[propRadius * 0.95, propRadius * 1.15, 32]} />
          <meshBasicMaterial color="#3b82f6" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Emoji as HTML overlay - billboards to face camera */}
      <Html
        position={[0, propHeight + 0.2, 0]}
        center
        distanceFactor={15}
        sprite
        transform={false}
        style={{
          fontSize: `${emojiSize}px`,
          userSelect: 'none',
          pointerEvents: 'none',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {piece.propEmoji || '?'}
      </Html>
    </group>
  );
}
