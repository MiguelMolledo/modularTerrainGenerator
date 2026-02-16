'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '@/store/mapStore';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { PlacedPiece3D } from './PlacedPiece3D';
import { Prop3D } from './Prop3D';
import { SelectionOutline3D, Selectable } from './SelectionOutline3D';
import { TransformGizmo3D } from './TransformGizmo3D';
import { SelectionGroup3D } from './SelectionGroup3D';
import { UnityCameraController, UnityCameraControllerRef } from './UnityCameraController';
import { LEVEL_HEIGHT_INCHES } from '@/config/terrain';
import type { PlacedPiece } from '@/types';

interface Scene3DProps {
  editingDisabled?: boolean;
}

export function Scene3D({ editingDisabled = false }: Scene3DProps) {
  const cameraControlsRef = useRef<UnityCameraControllerRef>(null);
  // Ref to store initial piece state when transform starts
  const transformStartStateRef = useRef<PlacedPiece[] | null>(null);

  const {
    placedPieces,
    availablePieces,
    terrainTypes,
    mapWidth,
    mapHeight,
    selectedPlacedPieceIds,
    setSelectedPlacedPieceIds,
    levels,
    currentLevel,  // Read directly from store
    showReferenceLevels,
    referenceLevelOpacity,
    customProps,
    showTerrain,
    showProps,
    colliding3DPieceIds,
  } = useMapStore();

  const { recordMovePiece, recordMovePieces } = useUndoRedo();

  // Handler for when 3D transform starts - capture initial state
  const handleTransformStart = useCallback(() => {
    // Store a deep copy of the selected pieces' current state
    const selectedPieces = placedPieces.filter(p =>
      selectedPlacedPieceIds.includes(p.id)
    );
    transformStartStateRef.current = selectedPieces.map(p => ({ ...p }));
  }, [placedPieces, selectedPlacedPieceIds]);

  // Handler for when 3D transform ends - record history
  const handleTransformEnd = useCallback(() => {
    const initialState = transformStartStateRef.current;
    if (!initialState || initialState.length === 0) return;

    // Get the current state of the pieces after transform
    const currentPieces = placedPieces.filter(p =>
      selectedPlacedPieceIds.includes(p.id)
    );

    // Check if anything actually changed
    const hasChanges = initialState.some(initial => {
      const current = currentPieces.find(p => p.id === initial.id);
      if (!current) return false;
      return initial.x !== current.x ||
             initial.y !== current.y ||
             initial.rotation !== current.rotation;
    });

    if (!hasChanges) {
      transformStartStateRef.current = null;
      return;
    }

    if (initialState.length === 1) {
      // Single piece - use recordMovePiece (also handles rotation)
      const initial = initialState[0];
      const current = currentPieces.find(p => p.id === initial.id);
      if (current) {
        recordMovePieces([{
          id: initial.id,
          from: { x: initial.x, y: initial.y, rotation: initial.rotation },
          to: { x: current.x, y: current.y, rotation: current.rotation },
        }]);
      }
    } else {
      // Multiple pieces - use recordMovePieces
      const moves = initialState.map(initial => {
        const current = currentPieces.find(p => p.id === initial.id);
        return {
          id: initial.id,
          from: { x: initial.x, y: initial.y, rotation: initial.rotation },
          to: current
            ? { x: current.x, y: current.y, rotation: current.rotation }
            : { x: initial.x, y: initial.y, rotation: initial.rotation },
        };
      });
      recordMovePieces(moves);
    }

    transformStartStateRef.current = null;
  }, [placedPieces, selectedPlacedPieceIds, recordMovePieces]);

  // Create a Set for efficient selection lookup
  const selectedSet = useMemo(() => new Set(selectedPlacedPieceIds), [selectedPlacedPieceIds]);

  // Create a Set for efficient collision lookup
  const collidingSet = useMemo(() => new Set(colliding3DPieceIds), [colliding3DPieceIds]);

  // Create piece lookup map (includes custom props)
  const pieceMap = useMemo(() => {
    const map = new Map<string, typeof availablePieces[0]>();
    for (const piece of availablePieces) {
      map.set(piece.id, piece);
    }
    // Also include custom props
    for (const piece of customProps) {
      map.set(piece.id, piece);
    }
    return map;
  }, [availablePieces, customProps]);

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

  // Filter pieces by current level and separate terrain from props
  const { visibleTerrainPieces, visibleProps } = useMemo(() => {
    const levelPieces = placedPieces.filter((p) => p.level === currentLevel);
    const terrain: typeof levelPieces = [];
    const props: typeof levelPieces = [];

    for (const placed of levelPieces) {
      const piece = pieceMap.get(placed.pieceId);
      if (piece?.pieceType === 'prop') {
        if (showProps) props.push(placed);  // Only add if visible
      } else {
        if (showTerrain) terrain.push(placed);  // Only add if visible
      }
    }

    return { visibleTerrainPieces: terrain, visibleProps: props };
  }, [placedPieces, currentLevel, pieceMap, showTerrain, showProps]);

  // Reference level pieces (other levels shown as guides)
  const referencePieces = useMemo(() => {
    if (!showReferenceLevels) return [];
    return placedPieces.filter((p) => p.level !== currentLevel);
  }, [placedPieces, showReferenceLevels, currentLevel]);

  // Calculate the Y position for the current view level (for camera target and ground plane)
  const viewLevelY = currentLevel * LEVEL_HEIGHT_INCHES;

  // Grid center offset (north at back/-Z, south at front/+Z)
  const gridCenterX = mapWidth / 2;
  const gridCenterZ = mapHeight / 2;

  // Calculate camera target (center of map, adjusted for current view level)
  const cameraTarget = useMemo(() => {
    return [gridCenterX, viewLevelY, gridCenterZ] as [number, number, number];
  }, [gridCenterX, gridCenterZ, viewLevelY]);

  // Get min/max levels for grid planes
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);

  // Ground plane Y position: slightly below the lowest level
  const groundPlaneY = minLevel * LEVEL_HEIGHT_INCHES - 0.5;

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

      {/* Unity-style camera controls */}
      <UnityCameraController
        ref={cameraControlsRef}
        initialTarget={cameraTarget}
        baseSpeed={20}
        minY={1}
        maxY={150}
      />

      {/* Ground grid - solid lines, no fade, positioned at current view level */}
      <Grid
        position={[gridCenterX, viewLevelY + 0.01, gridCenterZ]}
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

      {/* Ground plane - solid dark surface, positioned below the lowest level */}
      <mesh
        position={[gridCenterX, groundPlaneY, gridCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[mapWidth * 1.5, mapHeight * 1.5]} />
        <meshStandardMaterial color="#252530" roughness={0.9} metalness={0} />
      </mesh>

      {/* Render reference level pieces (behind current level) */}
      {referencePieces.map((placedPiece) => {
        const piece = pieceMap.get(placedPiece.pieceId);
        if (!piece) return null;

        const terrain = terrainMap.get(piece.terrainTypeId);

        return (
          <PlacedPiece3D
            key={`ref-${placedPiece.id}`}
            placedPiece={placedPiece}
            piece={piece}
            terrain={terrain}
            terrainMap={terrainMap}
            isSelected={false}
            isReference={true}
            referenceOpacity={referenceLevelOpacity}
            onClick={() => {}}
          />
        );
      })}

      {/* Selection outline post-processing wrapper */}
      <SelectionOutline3D>
        {/* Render current level terrain pieces */}
        {visibleTerrainPieces.map((placedPiece) => {
          const piece = pieceMap.get(placedPiece.pieceId);
          if (!piece) return null;

          const terrain = terrainMap.get(piece.terrainTypeId);
          const isSelected = selectedSet.has(placedPiece.id);
          const isColliding = collidingSet.has(placedPiece.id);

          return (
            <Selectable key={placedPiece.id} enabled={isSelected && !editingDisabled}>
              <PlacedPiece3D
                placedPiece={placedPiece}
                piece={piece}
                terrain={terrain}
                terrainMap={terrainMap}
                isSelected={isSelected && !editingDisabled}
                isColliding={isColliding}
                editingDisabled={editingDisabled}
              />
            </Selectable>
          );
        })}

        {/* Render current level props */}
        {visibleProps.map((placedProp) => {
          const piece = pieceMap.get(placedProp.pieceId);
          if (!piece) return null;

          const isSelected = selectedSet.has(placedProp.id);
          const isColliding = collidingSet.has(placedProp.id);

          return (
            <Selectable key={placedProp.id} enabled={isSelected && !editingDisabled}>
              <Prop3D
                placedPiece={placedProp}
                piece={piece}
                isSelected={isSelected && !editingDisabled}
                isColliding={isColliding}
                editingDisabled={editingDisabled}
                onClick={editingDisabled ? undefined : () => setSelectedPlacedPieceIds([placedProp.id])}
              />
            </Selectable>
          );
        })}
      </SelectionOutline3D>

      {/* Transform gizmo for single selection (only when editing enabled) */}
      {!editingDisabled && selectedPlacedPieceIds.length === 1 && (
        <TransformGizmo3D
          cameraControlsRef={cameraControlsRef}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
        />
      )}

      {/* Transform gizmo for multi-selection (2+ pieces, only when editing enabled) */}
      {!editingDisabled && selectedPlacedPieceIds.length >= 2 && (
        <SelectionGroup3D
          cameraControlsRef={cameraControlsRef}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
        />
      )}

      {/* Map boundary box (wireframe) */}
      <lineSegments position={[gridCenterX, (maxLevel - minLevel) * LEVEL_HEIGHT_INCHES / 2, gridCenterZ]}>
        <edgesGeometry args={[boundaryGeometry]} />
        <lineBasicMaterial color="#555555" />
      </lineSegments>
    </>
  );
}
