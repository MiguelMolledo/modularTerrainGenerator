'use client';

import React, { useMemo } from 'react';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '@/store/mapStore';
import { PlacedPiece3D } from './PlacedPiece3D';
import { LEVEL_HEIGHT_INCHES } from '@/config/terrain';

export function Scene3D() {
  const {
    placedPieces,
    availablePieces,
    terrainTypes,
    mapWidth,
    mapHeight,
    selectedPlacedPieceId,
    setSelectedPlacedPieceId,
    levels,
  } = useMapStore();

  // Create piece lookup map
  const pieceMap = useMemo(() => {
    const map = new Map<string, typeof availablePieces[0]>();
    for (const piece of availablePieces) {
      map.set(piece.id, piece);
    }
    return map;
  }, [availablePieces]);

  // Create terrain lookup map (by both id and slug for compatibility)
  const terrainMap = useMemo(() => {
    const map = new Map<string, typeof terrainTypes[0]>();
    for (const terrain of terrainTypes) {
      map.set(terrain.id, terrain);
      // Also map by slug if available (pieces use slug as terrainTypeId)
      if (terrain.slug) {
        map.set(terrain.slug, terrain);
      }
    }
    return map;
  }, [terrainTypes]);

  // Grid center offset (north at back/-Z, south at front/+Z)
  const gridCenterX = mapWidth / 2;
  const gridCenterZ = mapHeight / 2;

  // Calculate camera target (center of map)
  const cameraTarget = useMemo(() => {
    return [gridCenterX, 0, gridCenterZ] as [number, number, number];
  }, [gridCenterX, gridCenterZ]);

  // Get min/max levels for grid planes
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  // Boundary box geometry
  const boundaryGeometry = useMemo(() => {
    return new THREE.BoxGeometry(
      mapWidth,
      (maxLevel - minLevel + 1) * LEVEL_HEIGHT_INCHES,
      mapHeight
    );
  }, [mapWidth, mapHeight, maxLevel, minLevel]);

  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.6} />

      {/* Main directional light (sun) - from north-east */}
      <directionalLight
        position={[mapWidth, 50, -mapHeight / 2]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-mapWidth}
        shadow-camera-right={mapWidth * 2}
        shadow-camera-top={mapHeight * 2}
        shadow-camera-bottom={-mapHeight}
      />

      {/* Fill light from opposite side (south-west) */}
      <directionalLight
        position={[-mapWidth / 2, 30, mapHeight * 1.5]}
        intensity={0.5}
      />

      {/* Hemisphere light for ambient color variation */}
      <hemisphereLight
        args={['#87ceeb', '#362d1a', 0.6]}
      />

      {/* Orbit controls for camera */}
      <OrbitControls
        target={cameraTarget}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      {/* Ground grid at level 0 - solid lines, no fade */}
      <Grid
        position={[gridCenterX, 0.01, gridCenterZ]}
        args={[mapWidth, mapHeight]}
        cellSize={1.5}
        cellThickness={1}
        cellColor="#555555"
        sectionSize={6}
        sectionThickness={1.5}
        sectionColor="#777777"
        fadeDistance={0}
        fadeStrength={0}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Level indicator - just wireframe borders, no transparent planes */}
      {levels.filter(l => l !== 0).map((level) => (
        <lineSegments
          key={`level-border-${level}`}
          position={[gridCenterX, level * LEVEL_HEIGHT_INCHES, gridCenterZ]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(mapWidth, mapHeight)]} />
          <lineBasicMaterial color={level < 0 ? '#3a3a5e' : '#4a4a6e'} />
        </lineSegments>
      ))}

      {/* Ground plane - solid dark surface */}
      <mesh
        position={[gridCenterX, -0.02, gridCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[mapWidth * 1.5, mapHeight * 1.5]} />
        <meshStandardMaterial color="#252530" roughness={0.9} metalness={0} />
      </mesh>

      {/* Render all placed pieces */}
      {placedPieces.map((placedPiece) => {
        const piece = pieceMap.get(placedPiece.pieceId);
        if (!piece) return null;

        const terrain = terrainMap.get(piece.terrainTypeId);

        return (
          <PlacedPiece3D
            key={placedPiece.id}
            placedPiece={placedPiece}
            piece={piece}
            terrain={terrain}
            terrainMap={terrainMap}
            isSelected={selectedPlacedPieceId === placedPiece.id}
            onClick={() => setSelectedPlacedPieceId(placedPiece.id)}
          />
        );
      })}

      {/* Map boundary box (wireframe) */}
      <lineSegments position={[gridCenterX, (maxLevel - minLevel) * LEVEL_HEIGHT_INCHES / 2, gridCenterZ]}>
        <edgesGeometry args={[boundaryGeometry]} />
        <lineBasicMaterial color="#555555" />
      </lineSegments>
    </>
  );
}
