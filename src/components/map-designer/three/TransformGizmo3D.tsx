'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '@/store/mapStore';
import { GRID_CELL_SIZE, LEVEL_HEIGHT_INCHES, PIECE_HEIGHT_INCHES } from '@/config/terrain';
import { check3DCollisions } from '@/lib/collisionUtils';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import type { UnityCameraControllerRef } from './UnityCameraController';

interface TransformGizmo3DProps {
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

/**
 * TransformGizmo3D provides Unity/Unreal-style transform controls
 * for selected pieces in the 3D view.
 *
 * Features:
 * - Attaches to the first selected piece
 * - Supports translate (W key) and rotate (E key) modes
 * - Snaps position to grid (GRID_CELL_SIZE)
 * - Snaps rotation to 90-degree increments
 * - Enforces height limits per layer
 * - Disables OrbitControls while dragging
 */
export function TransformGizmo3D({
  cameraControlsRef,
  onTransformStart,
  onTransformEnd,
}: TransformGizmo3DProps) {
  const targetRef = useRef<THREE.Group>(null!);
  const transformControlsRef = useRef<TransformControlsImpl>(null!);
  const isDraggingRef = useRef(false);
  const lastCollisionCheckRef = useRef(0);
  const collisionThrottleMs = 50; // Update every 50ms for smoother preview
  const [isDragging, setIsDragging] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<THREE.Vector3 | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);

  const {
    selectedPlacedPieceIds,
    placedPieces,
    availablePieces,
    customProps,
    transform3DMode,
    updatePlacedPiecePosition3D,
    setColliding3DPieceIds,
    clearColliding3DPieceIds,
  } = useMapStore();

  // Get the first selected piece (for single selection gizmo attachment)
  const selectedPiece = useMemo(() => {
    if (selectedPlacedPieceIds.length === 0) return null;
    return placedPieces.find(p => p.id === selectedPlacedPieceIds[0]) || null;
  }, [selectedPlacedPieceIds, placedPieces]);

  // Get piece definition to calculate center position
  const pieceDefinition = useMemo(() => {
    if (!selectedPiece) return null;
    return availablePieces.find(p => p.id === selectedPiece.pieceId) ||
           customProps.find(p => p.id === selectedPiece.pieceId) ||
           null;
  }, [selectedPiece, availablePieces, customProps]);

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

  // Calculate piece center position in 3D coordinates
  const piecePosition = useMemo(() => {
    if (!selectedPiece || !pieceDefinition) return null;

    // Calculate effective dimensions based on rotation
    const isRotated = selectedPiece.rotation === 90 || selectedPiece.rotation === 270;
    const effectiveWidth = isRotated ? pieceDefinition.size.height : pieceDefinition.size.width;
    const effectiveHeight = isRotated ? pieceDefinition.size.width : pieceDefinition.size.height;

    // Piece position in 3D (center of the piece)
    const centerX = selectedPiece.x + effectiveWidth / 2;
    const centerZ = selectedPiece.y + effectiveHeight / 2;
    const heightY = selectedPiece.level * LEVEL_HEIGHT_INCHES;

    return new THREE.Vector3(centerX, heightY, centerZ);
  }, [selectedPiece, pieceDefinition]);

  // Update target position when selection changes
  useEffect(() => {
    if (!targetRef.current || !piecePosition || !selectedPiece) return;

    targetRef.current.position.copy(piecePosition);
    targetRef.current.rotation.set(0, -(selectedPiece.rotation * Math.PI) / 180, 0);
  }, [piecePosition, selectedPiece]);

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
        // Disable camera controls when starting to drag, re-enable when done
        cameraControlsRef.current.enabled = !event.value;
      }
    };

    // Listen to the dragging-changed event from TransformControls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transformControls as any).addEventListener('dragging-changed', handleDraggingChanged);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transformControls as any).removeEventListener('dragging-changed', handleDraggingChanged);
      // Ensure camera controls are re-enabled on cleanup
      if (cameraControlsRef?.current) {
        cameraControlsRef.current.enabled = true;
      }
    };
  }, [cameraControlsRef]);

  // Handle drag start
  const handleMouseDown = useCallback(() => {
    // Don't start transform if user is navigating
    if (cameraControlsRef?.current?.isMoving) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    if (targetRef.current) {
      setPreviewPosition(targetRef.current.position.clone());
      setPreviewRotation(targetRef.current.rotation.y);
    }
    onTransformStart?.();
  }, [onTransformStart, cameraControlsRef]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setPreviewPosition(null);
    onTransformEnd?.();

    // Clear collision state when drag ends
    clearColliding3DPieceIds();

    // Final update to piece position using the store action
    if (selectedPiece && targetRef.current) {
      // Get current rotation in degrees (negate because Three.js Y rotation is opposite)
      const rotationDegrees = (-targetRef.current.rotation.y * 180) / Math.PI;

      // Use the store action to convert 3D position to 2D and update the piece
      updatePlacedPiecePosition3D(
        selectedPiece.id,
        {
          x: targetRef.current.position.x,
          y: targetRef.current.position.y,
          z: targetRef.current.position.z,
        },
        rotationDegrees
      );
    }
  }, [selectedPiece, updatePlacedPiecePosition3D, onTransformEnd, clearColliding3DPieceIds]);

  // Height limits for 3D movement (allow all levels: -1 to 2)
  // Pieces render at Y = level * LEVEL_HEIGHT_INCHES (2.5")
  // Level -1: Y = -2.5, Level 0: Y = 0, Level 1: Y = 2.5, Level 2: Y = 5
  const heightLimits = useMemo(() => {
    return { min: -2.5, max: 6 }; // Allow movement across all levels with some margin
  }, []);

  // Handle continuous transform updates (for snapping during drag)
  const handleChange = useCallback(() => {
    if (!isDraggingRef.current || !targetRef.current || !selectedPiece || !pieceDefinition) return;

    if (transform3DMode === 'translate') {
      // Apply grid snapping during drag
      targetRef.current.position.x = snapToGrid(targetRef.current.position.x);
      targetRef.current.position.z = snapToGrid(targetRef.current.position.z);
      // Clamp Y position within overall height limits (all levels)
      targetRef.current.position.y = Math.max(
        heightLimits.min,
        Math.min(heightLimits.max, targetRef.current.position.y)
      );
    } else if (transform3DMode === 'rotate') {
      // Snap rotation to 90-degree increments during drag
      const snappedY = Math.round(targetRef.current.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
      targetRef.current.rotation.y = snappedY;
    }

    // Update preview position for visual feedback
    setPreviewPosition(targetRef.current.position.clone());
    setPreviewRotation(targetRef.current.rotation.y);

    // Throttle collision detection to avoid performance issues
    const now = Date.now();
    if (now - lastCollisionCheckRef.current < collisionThrottleMs) {
      return;
    }
    lastCollisionCheckRef.current = now;

    // Calculate the current snapped rotation in degrees
    const currentRotationDegrees = ((-targetRef.current.rotation.y * 180) / Math.PI % 360 + 360) % 360;
    const snappedRotation = Math.round(currentRotationDegrees / 90) * 90;

    // Calculate effective dimensions based on current rotation
    const isRotated = snappedRotation === 90 || snappedRotation === 270;
    const effectiveWidth = isRotated ? pieceDefinition.size.height : pieceDefinition.size.width;
    const effectiveHeight = isRotated ? pieceDefinition.size.width : pieceDefinition.size.height;

    // Calculate the corner position from the center position
    const snappedX = snapToGrid(targetRef.current.position.x - effectiveWidth / 2);
    const snappedZ = snapToGrid(targetRef.current.position.z - effectiveHeight / 2);

    // Create a temporary piece with the current drag position for collision checking
    const tempPieces = placedPieces.map(p => {
      if (p.id === selectedPiece.id) {
        return {
          ...p,
          x: snappedX,
          y: snappedZ,
          rotation: snappedRotation,
        };
      }
      return p;
    });

    // Check collisions with all pieces on the same level
    const collidingIds = check3DCollisions(tempPieces, getPieceInfo, selectedPiece.level);
    setColliding3DPieceIds(collidingIds);
  }, [transform3DMode, snapToGrid, heightLimits, selectedPiece, pieceDefinition, placedPieces, getPieceInfo, setColliding3DPieceIds]);

  // Don't render if no piece is selected
  if (!selectedPiece || !piecePosition) {
    return null;
  }

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    if (!pieceDefinition) return { width: 3, height: 3 };
    return {
      width: pieceDefinition.size.width,
      height: pieceDefinition.size.height,
    };
  }, [pieceDefinition]);

  return (
    <>
      {/* Invisible target group that the transform controls attach to */}
      <group ref={targetRef} position={piecePosition}>
        {/* Invisible box just to have something the controls can attach to */}
        <mesh visible={false}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      {/* Preview box showing where piece will land during drag */}
      {isDragging && previewPosition && (
        <group position={previewPosition} rotation={[0, previewRotation, 0]}>
          {/* Semi-transparent preview box */}
          <mesh>
            <boxGeometry args={[previewDimensions.width, PIECE_HEIGHT_INCHES, previewDimensions.height]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Wireframe outline */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(previewDimensions.width, PIECE_HEIGHT_INCHES, previewDimensions.height)]} />
            <lineBasicMaterial color="#00ff00" linewidth={2} />
          </lineSegments>
        </group>
      )}

      {/* Transform controls */}
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
