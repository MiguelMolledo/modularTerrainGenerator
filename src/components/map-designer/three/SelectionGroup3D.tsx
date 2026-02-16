'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '@/store/mapStore';
import { GRID_CELL_SIZE, LEVEL_HEIGHT_INCHES } from '@/config/terrain';
import { check3DCollisions } from '@/lib/collisionUtils';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import type { UnityCameraControllerRef } from './UnityCameraController';

interface SelectionGroup3DProps {
  /**
   * Reference to the camera controls.
   * Used to disable camera controls while dragging the gizmo.
   */
  cameraControlsRef?: React.RefObject<UnityCameraControllerRef | null>;
  /**
   * Callback when transform starts (for undo grouping)
   */
  onTransformStart?: () => void;
  /**
   * Callback when transform ends (for undo grouping)
   */
  onTransformEnd?: () => void;
}

interface SelectedPieceInfo {
  id: string;
  x: number;
  y: number;
  level: number;
  rotation: number;
  centerX: number;
  centerZ: number;
  heightY: number;
  width: number;
  height: number;
}

/**
 * SelectionGroup3D handles multi-selection with a gizmo positioned
 * at the geometric center of all selected pieces.
 *
 * Features:
 * - Calculates center point of all selected pieces
 * - Attaches transform gizmo to group center
 * - Supports translate (W key) and rotate (E key) modes
 * - Snaps position to grid (GRID_CELL_SIZE)
 * - Snaps rotation to 90-degree increments
 * - Enforces height limits per layer
 * - Disables OrbitControls while dragging
 * - Tracks initial positions for delta calculations during transforms
 */
export function SelectionGroup3D({
  cameraControlsRef,
  onTransformStart,
  onTransformEnd,
}: SelectionGroup3DProps) {
  const targetRef = useRef<THREE.Group>(null!);
  const transformControlsRef = useRef<TransformControlsImpl>(null!);
  const isDraggingRef = useRef(false);
  const initialPositionRef = useRef<THREE.Vector3 | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialPiecesRef = useRef<SelectedPieceInfo[]>([]);
  const lastCollisionCheckRef = useRef(0);
  const collisionThrottleMs = 50; // Update every 50ms for smoother preview

  const {
    selectedPlacedPieceIds,
    placedPieces,
    availablePieces,
    customProps,
    transform3DMode,
    currentLevel,
    updatePlacedPieces,
    setColliding3DPieceIds,
    clearColliding3DPieceIds,
  } = useMapStore();

  // Get all selected pieces with their computed properties
  const selectedPiecesInfo = useMemo((): SelectedPieceInfo[] => {
    if (selectedPlacedPieceIds.length === 0) return [];

    const selectedSet = new Set(selectedPlacedPieceIds);
    const result: SelectedPieceInfo[] = [];

    for (const placedPiece of placedPieces) {
      if (!selectedSet.has(placedPiece.id)) continue;

      const pieceDefinition = availablePieces.find(p => p.id === placedPiece.pieceId) ||
                             customProps.find(p => p.id === placedPiece.pieceId);
      if (!pieceDefinition) continue;

      // Calculate effective dimensions based on rotation
      const isRotated = placedPiece.rotation === 90 || placedPiece.rotation === 270;
      const effectiveWidth = isRotated ? pieceDefinition.size.height : pieceDefinition.size.width;
      const effectiveHeight = isRotated ? pieceDefinition.size.width : pieceDefinition.size.height;

      // Calculate center position in 3D
      const centerX = placedPiece.x + effectiveWidth / 2;
      const centerZ = placedPiece.y + effectiveHeight / 2;
      const heightY = placedPiece.level * LEVEL_HEIGHT_INCHES;

      result.push({
        id: placedPiece.id,
        x: placedPiece.x,
        y: placedPiece.y,
        level: placedPiece.level,
        rotation: placedPiece.rotation,
        centerX,
        centerZ,
        heightY,
        width: effectiveWidth,
        height: effectiveHeight,
      });
    }

    return result;
  }, [selectedPlacedPieceIds, placedPieces, availablePieces, customProps]);

  // Calculate the geometric center of all selected pieces
  const groupCenter = useMemo(() => {
    if (selectedPiecesInfo.length === 0) return null;

    let sumX = 0;
    let sumZ = 0;
    let sumY = 0;

    for (const piece of selectedPiecesInfo) {
      sumX += piece.centerX;
      sumZ += piece.centerZ;
      sumY += piece.heightY;
    }

    const count = selectedPiecesInfo.length;
    return new THREE.Vector3(
      sumX / count,
      sumY / count,
      sumZ / count
    );
  }, [selectedPiecesInfo]);

  // Snap value to grid
  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  }, []);

  // Helper function to get piece info for collision detection
  const getPieceInfo = useCallback((pieceId: string) => {
    const piece = availablePieces.find(p => p.id === pieceId) ||
                  customProps.find(p => p.id === pieceId);
    if (!piece) return null;
    return {
      width: piece.size.width,
      height: piece.size.height,
      isDiagonal: piece.isDiagonal,
    };
  }, [availablePieces, customProps]);

  // Update target position when selection changes
  useEffect(() => {
    if (!targetRef.current || !groupCenter) return;

    targetRef.current.position.copy(groupCenter);
    targetRef.current.rotation.set(0, 0, 0);
  }, [groupCenter]);

  // Disable camera controls while dragging the transform gizmo
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    const handleDraggingChanged = (event: { value: boolean }) => {
      // Check if camera is currently moving (user navigating)
      if (event.value && cameraControlsRef?.current?.isMoving) {
        return;
      }
      if (cameraControlsRef?.current) {
        cameraControlsRef.current.enabled = !event.value;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transformControls as any).addEventListener('dragging-changed', handleDraggingChanged);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transformControls as any).removeEventListener('dragging-changed', handleDraggingChanged);
      if (cameraControlsRef?.current) {
        cameraControlsRef.current.enabled = true;
      }
    };
  }, [cameraControlsRef]);

  // Handle drag start - store initial state for delta calculations
  const handleMouseDown = useCallback(() => {
    // Don't start transform if user is navigating
    if (cameraControlsRef?.current?.isMoving) return;

    isDraggingRef.current = true;
    onTransformStart?.();

    // Store initial group center position for delta calculation
    if (targetRef.current) {
      initialPositionRef.current = targetRef.current.position.clone();
      initialRotationRef.current = targetRef.current.rotation.y;
    }

    // Store initial piece positions for applying transforms
    initialPiecesRef.current = selectedPiecesInfo.map(piece => ({ ...piece }));
  }, [onTransformStart, selectedPiecesInfo, cameraControlsRef]);

  // Height limits for 3D movement (allow all levels: -1 to 2)
  // Pieces render at Y = level * LEVEL_HEIGHT_INCHES (2.5")
  // Level -1: Y = -2.5, Level 0: Y = 0, Level 1: Y = 2.5, Level 2: Y = 5
  const heightLimits = useMemo(() => {
    return { min: -2.5, max: 6 }; // Allow movement across all levels with some margin
  }, []);

  // Handle drag end - apply final transforms to all pieces
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    onTransformEnd?.();

    // Clear collision state when drag ends
    clearColliding3DPieceIds();

    if (!targetRef.current || !initialPositionRef.current || initialPiecesRef.current.length === 0) {
      return;
    }

    const currentPos = targetRef.current.position;
    const currentRotY = targetRef.current.rotation.y;

    // Calculate deltas from initial position
    const deltaX = snapToGrid(currentPos.x - initialPositionRef.current.x);
    const deltaZ = snapToGrid(currentPos.z - initialPositionRef.current.z);
    const deltaRotation = currentRotY - initialRotationRef.current;

    // Snap rotation delta to 90 degrees
    const snappedRotationDelta = Math.round(deltaRotation / (Math.PI / 2)) * (Math.PI / 2);
    const rotationDegreesDelta = (snappedRotationDelta * 180) / Math.PI;

    if (transform3DMode === 'translate') {
      // Apply position delta to all pieces
      const updates = initialPiecesRef.current.map(piece => ({
        id: piece.id,
        updates: {
          x: snapToGrid(piece.x + deltaX),
          y: snapToGrid(piece.y + deltaZ),
        },
      }));
      updatePlacedPieces(updates);
    } else if (transform3DMode === 'rotate') {
      // Rotate pieces around the group center
      const centerX = initialPositionRef.current.x;
      const centerZ = initialPositionRef.current.z;

      const updates = initialPiecesRef.current.map(piece => {
        // Calculate piece center relative to group center
        const relX = piece.centerX - centerX;
        const relZ = piece.centerZ - centerZ;

        // Rotate the relative position
        const cos = Math.cos(snappedRotationDelta);
        const sin = Math.sin(snappedRotationDelta);
        const newRelX = relX * cos - relZ * sin;
        const newRelZ = relX * sin + relZ * cos;

        // Calculate new corner position from new center
        const newCenterX = centerX + newRelX;
        const newCenterZ = centerZ + newRelZ;
        const newX = snapToGrid(newCenterX - piece.width / 2);
        const newY = snapToGrid(newCenterZ - piece.height / 2);

        // Add rotation to piece's individual rotation
        const newRotation = ((piece.rotation + rotationDegreesDelta) % 360 + 360) % 360;

        return {
          id: piece.id,
          updates: {
            x: newX,
            y: newY,
            rotation: newRotation,
          },
        };
      });
      updatePlacedPieces(updates);
    }

    // Reset refs
    initialPositionRef.current = null;
    initialRotationRef.current = 0;
    initialPiecesRef.current = [];

    // Reset target to new center after update
    if (groupCenter) {
      targetRef.current.position.copy(groupCenter);
      targetRef.current.rotation.set(0, 0, 0);
    }
  }, [transform3DMode, snapToGrid, updatePlacedPieces, onTransformEnd, groupCenter, heightLimits, clearColliding3DPieceIds]);

  // Handle continuous transform updates (for visual feedback during drag)
  const handleChange = useCallback(() => {
    if (!isDraggingRef.current || !targetRef.current || !initialPositionRef.current || initialPiecesRef.current.length === 0) return;

    if (transform3DMode === 'translate') {
      // Apply visual snapping during drag
      targetRef.current.position.x = snapToGrid(targetRef.current.position.x);
      targetRef.current.position.z = snapToGrid(targetRef.current.position.z);
      // Clamp Y position within layer height limits
      targetRef.current.position.y = Math.max(
        heightLimits.min,
        Math.min(heightLimits.max, targetRef.current.position.y)
      );
    } else if (transform3DMode === 'rotate') {
      // Snap rotation to 90-degree increments
      const snappedY = Math.round(targetRef.current.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
      targetRef.current.rotation.y = snappedY;
    }

    // Throttle store updates and collision detection to avoid performance issues
    const now = Date.now();
    if (now - lastCollisionCheckRef.current < collisionThrottleMs) {
      return;
    }
    lastCollisionCheckRef.current = now;

    // Check collisions during drag for visual feedback
    const currentPos = targetRef.current.position;
    const currentRotY = targetRef.current.rotation.y;

    // Calculate deltas from initial position
    const deltaX = snapToGrid(currentPos.x - initialPositionRef.current.x);
    const deltaZ = snapToGrid(currentPos.z - initialPositionRef.current.z);
    const deltaRotation = currentRotY - initialRotationRef.current;
    const snappedRotationDelta = Math.round(deltaRotation / (Math.PI / 2)) * (Math.PI / 2);
    const rotationDegreesDelta = (snappedRotationDelta * 180) / Math.PI;

    // Calculate temporary positions for all selected pieces
    const selectedIds = new Set(initialPiecesRef.current.map(p => p.id));
    const tempPieces = placedPieces.map(p => {
      if (!selectedIds.has(p.id)) return p;

      const initialPiece = initialPiecesRef.current.find(ip => ip.id === p.id);
      if (!initialPiece) return p;

      if (transform3DMode === 'translate') {
        return {
          ...p,
          x: snapToGrid(initialPiece.x + deltaX),
          y: snapToGrid(initialPiece.y + deltaZ),
        };
      } else {
        // Rotate pieces around the group center
        const centerX = initialPositionRef.current!.x;
        const centerZ = initialPositionRef.current!.z;

        const relX = initialPiece.centerX - centerX;
        const relZ = initialPiece.centerZ - centerZ;

        const cos = Math.cos(snappedRotationDelta);
        const sin = Math.sin(snappedRotationDelta);
        const newRelX = relX * cos - relZ * sin;
        const newRelZ = relX * sin + relZ * cos;

        const newCenterX = centerX + newRelX;
        const newCenterZ = centerZ + newRelZ;
        const newX = snapToGrid(newCenterX - initialPiece.width / 2);
        const newY = snapToGrid(newCenterZ - initialPiece.height / 2);
        const newRotation = ((initialPiece.rotation + rotationDegreesDelta) % 360 + 360) % 360;

        return {
          ...p,
          x: newX,
          y: newY,
          rotation: newRotation,
        };
      }
    });

    // Check collisions with all pieces on the current level
    const collidingIds = check3DCollisions(tempPieces, getPieceInfo, currentLevel);
    setColliding3DPieceIds(collidingIds);
  }, [transform3DMode, snapToGrid, heightLimits, placedPieces, currentLevel, getPieceInfo, setColliding3DPieceIds]);

  // Don't render if less than 2 pieces selected (use TransformGizmo3D for single selection)
  if (selectedPiecesInfo.length < 2 || !groupCenter) {
    return null;
  }

  return (
    <>
      {/* Invisible target group at the center of selection */}
      <group ref={targetRef} position={groupCenter}>
        {/* Small invisible box for gizmo attachment */}
        <mesh visible={false}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      {/* Transform controls for group manipulation */}
      <TransformControls
        ref={transformControlsRef}
        object={targetRef}
        mode={transform3DMode === 'rotate' ? 'rotate' : 'translate'}
        size={0.75}
        translationSnap={GRID_CELL_SIZE}
        rotationSnap={Math.PI / 2}
        space="world"
        showX={transform3DMode === 'translate'}
        showY={transform3DMode === 'translate'}
        showZ={transform3DMode === 'translate'}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onChange={handleChange}
      />
    </>
  );
}
