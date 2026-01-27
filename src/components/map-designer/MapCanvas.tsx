'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle } from 'react-konva';
import Konva from 'konva';
import { useMapStore } from '@/store/mapStore';
import { BASE_PIXELS_PER_INCH } from '@/config/terrain';
import { PlacedPiece } from '@/types';
import { checkCollisionWithPieces } from '@/lib/collisionUtils';
import { setStageInstance } from '@/lib/stageRef';
import { getGridDimensions } from '@/lib/gridUtils';

interface DragPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  visible: boolean;
  label: string;
  rotation: number;
  hasCollision: boolean;
  isDiagonal: boolean;
  isCustom?: boolean;
  isVariant?: boolean;
  cellColors?: string[][]; // Grid of terrain IDs
}

interface MapCanvasProps {
  onDrop: (x: number, y: number, rotation: number) => void;
}

export function MapCanvas({ onDrop }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Register stage instance for thumbnail generation
  useEffect(() => {
    if (stageRef.current) {
      setStageInstance(stageRef.current);
    }
    return () => setStageInstance(null);
  }, []);
  const [dragPreview, setDragPreview] = useState<DragPreview>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: '#666',
    visible: false,
    label: '',
    rotation: 0,
    hasCollision: false,
    isDiagonal: false,
  });
  // Track which placed piece is being dragged
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  // Track if we're dragging from sidebar
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  // Track mouse position for radial menu
  const mousePosRef = useRef({ x: 0, y: 0 });
  // Track current preview position with ref (to avoid stale closure issues)
  const dragPreviewRef = useRef<DragPreview>(dragPreview);
  // Track current rotation with ref (to avoid stale closure issues during drag)
  const currentRotationRef = useRef(0);
  // State to track piece being dragged from map
  const [mapDragPiece, setMapDragPiece] = useState<{
    id: string;
    pieceId: string;
    rotation: number;
    level: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  // Track potential drag start (before threshold is met)
  const [pendingDrag, setPendingDrag] = useState<{
    placedId: string;
    startX: number;
    startY: number;
  } | null>(null);

  // Selection rectangle state
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  // Ref to track selection mode (for immediate drag cancellation)
  const isSelectingRef = useRef(false);

  // Right-click panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);

  // Multi-drag state (for moving multiple selected pieces)
  const [multiDragState, setMultiDragState] = useState<{
    pieces: Array<{
      id: string;
      pieceId: string;
      originalX: number;
      originalY: number;
      rotation: number;
      level: number;
    }>;
    startMouseX: number;
    startMouseY: number;
  } | null>(null);

  // Drag threshold in pixels
  const DRAG_THRESHOLD = 5;

  const {
    mapWidth,
    mapHeight,
    gridConfig,
    zoom,
    panX,
    panY,
    placedPieces,
    availablePieces,
    terrainTypes,
    currentLevel,
    selectedPieceId,
    selectedPlacedPieceIds,
    isViewLocked,
    currentRotation,
    isSidebarDragging,
    setPan,
    setZoom,
    removePlacedPiece,
    updatePlacedPiece,
    updatePlacedPieces,
    setSelectedPlacedPieceIds,
    addToSelection,
    toggleSelection,
    clearSelection,
    setSelectedPieceId,
    setCurrentRotation,
    rotateCurrentPiece,
    rotateSelectedPlacedPiece,
    endSidebarDrag,
    openRadialMenu,
    isRadialMenuOpen,
    isPlacementMode,
    exitPlacementMode,
    addPlacedPiece,
    toggle3DMode,
  } = useMapStore();

  const pixelsPerInch = BASE_PIXELS_PER_INCH * zoom;
  const canvasWidth = mapWidth * pixelsPerInch;
  const canvasHeight = mapHeight * pixelsPerInch;

  // Get selected piece info for preview (from sidebar)
  const selectedPiece = selectedPieceId
    ? availablePieces.find((p) => p.id === selectedPieceId)
    : null;
  const selectedTerrain = selectedPiece
    ? terrainTypes.find((t) => t.id === selectedPiece.terrainTypeId)
    : null;

  // Check collision with support for diagonal (triangular) pieces
  const checkCollision = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      excludePieceId?: string,
      isDiagonal: boolean = false,
      rotation: number = 0
    ): boolean => {
      const currentLevelPieces = placedPieces.filter(
        (p) => p.level === currentLevel
      );

      const newPieceGeometry = {
        x,
        y,
        width,
        height,
        rotation,
        isDiagonal,
      };

      const getPieceInfo = (pieceId: string) => {
        const piece = availablePieces.find((p) => p.id === pieceId);
        if (!piece) return null;
        return {
          width: piece.size.width,
          height: piece.size.height,
          isDiagonal: piece.isDiagonal,
        };
      };

      return checkCollisionWithPieces(
        newPieceGeometry,
        currentLevelPieces,
        getPieceInfo,
        excludePieceId
      );
    },
    [placedPieces, availablePieces, currentLevel]
  );

  // Keep dragPreviewRef in sync with dragPreview state
  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  // Keep currentRotationRef in sync with currentRotation state
  useEffect(() => {
    currentRotationRef.current = currentRotation;
  }, [currentRotation]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Magnetic snap threshold (in inches)
  const MAGNETIC_SNAP_THRESHOLD = 0.75;

  // Calculate snapped position with magnetic snap to nearby pieces
  const getSnappedPosition = useCallback(
    (x: number, y: number, pieceWidth: number, pieceHeight: number, excludePieceId?: string) => {
      let snappedX = x;
      let snappedY = y;

      // First apply grid snap if enabled
      if (gridConfig.snapToGrid) {
        snappedX = Math.round(x / gridConfig.cellSize) * gridConfig.cellSize;
        snappedY = Math.round(y / gridConfig.cellSize) * gridConfig.cellSize;
      }

      // Apply magnetic snap to nearby pieces
      if (gridConfig.magneticSnap) {
        const currentLevelPieces = placedPieces.filter(
          (p) => p.level === currentLevel && p.id !== excludePieceId
        );

        // New piece edges
        const newLeft = snappedX;
        const newRight = snappedX + pieceWidth;
        const newTop = snappedY;
        const newBottom = snappedY + pieceHeight;

        let bestSnapX: number | null = null;
        let bestSnapY: number | null = null;
        let closestDistX = MAGNETIC_SNAP_THRESHOLD;
        let closestDistY = MAGNETIC_SNAP_THRESHOLD;

        for (const placed of currentLevelPieces) {
          const piece = availablePieces.find((p) => p.id === placed.pieceId);
          if (!piece) continue;

          // Calculate effective dimensions based on rotation
          const isRotated = placed.rotation === 90 || placed.rotation === 270;
          const placedWidth = isRotated ? piece.size.height : piece.size.width;
          const placedHeight = isRotated ? piece.size.width : piece.size.height;

          // Existing piece edges
          const placedLeft = placed.x;
          const placedRight = placed.x + placedWidth;
          const placedTop = placed.y;
          const placedBottom = placed.y + placedHeight;

          // Check vertical alignment (pieces need to overlap vertically to snap horizontally)
          const verticalOverlap = newBottom > placedTop && newTop < placedBottom;
          // Check horizontal alignment (pieces need to overlap horizontally to snap vertically)
          const horizontalOverlap = newRight > placedLeft && newLeft < placedRight;

          if (verticalOverlap) {
            // Snap new piece's right edge to placed piece's left edge
            const distRightToLeft = Math.abs(newRight - placedLeft);
            if (distRightToLeft < closestDistX) {
              closestDistX = distRightToLeft;
              bestSnapX = placedLeft - pieceWidth;
            }

            // Snap new piece's left edge to placed piece's right edge
            const distLeftToRight = Math.abs(newLeft - placedRight);
            if (distLeftToRight < closestDistX) {
              closestDistX = distLeftToRight;
              bestSnapX = placedRight;
            }

            // Snap new piece's left edge to placed piece's left edge (align)
            const distLeftToLeft = Math.abs(newLeft - placedLeft);
            if (distLeftToLeft < closestDistX) {
              closestDistX = distLeftToLeft;
              bestSnapX = placedLeft;
            }

            // Snap new piece's right edge to placed piece's right edge (align)
            const distRightToRight = Math.abs(newRight - placedRight);
            if (distRightToRight < closestDistX) {
              closestDistX = distRightToRight;
              bestSnapX = placedRight - pieceWidth;
            }
          }

          if (horizontalOverlap) {
            // Snap new piece's bottom edge to placed piece's top edge
            const distBottomToTop = Math.abs(newBottom - placedTop);
            if (distBottomToTop < closestDistY) {
              closestDistY = distBottomToTop;
              bestSnapY = placedTop - pieceHeight;
            }

            // Snap new piece's top edge to placed piece's bottom edge
            const distTopToBottom = Math.abs(newTop - placedBottom);
            if (distTopToBottom < closestDistY) {
              closestDistY = distTopToBottom;
              bestSnapY = placedBottom;
            }

            // Snap new piece's top edge to placed piece's top edge (align)
            const distTopToTop = Math.abs(newTop - placedTop);
            if (distTopToTop < closestDistY) {
              closestDistY = distTopToTop;
              bestSnapY = placedTop;
            }

            // Snap new piece's bottom edge to placed piece's bottom edge (align)
            const distBottomToBottom = Math.abs(newBottom - placedBottom);
            if (distBottomToBottom < closestDistY) {
              closestDistY = distBottomToBottom;
              bestSnapY = placedBottom - pieceHeight;
            }
          }
        }

        // Apply the best snap found
        if (bestSnapX !== null) {
          snappedX = bestSnapX;
        }
        if (bestSnapY !== null) {
          snappedY = bestSnapY;
        }
      }

      // Clamp to map bounds
      snappedX = Math.max(0, Math.min(snappedX, mapWidth - pieceWidth));
      snappedY = Math.max(0, Math.min(snappedY, mapHeight - pieceHeight));

      return { x: snappedX, y: snappedY };
    },
    [gridConfig.snapToGrid, gridConfig.magneticSnap, gridConfig.cellSize, mapWidth, mapHeight, placedPieces, availablePieces, currentLevel]
  );

  // Function to update preview after rotation
  const updatePreviewAfterRotation = useCallback((newRotation: number) => {
    const piece = selectedPieceId ? availablePieces.find((p) => p.id === selectedPieceId) : null;
    if (!piece) return;

    const currentPreview = dragPreviewRef.current;
    if (!currentPreview.visible) return;

    const isRotated = newRotation === 90 || newRotation === 270;
    const effectiveWidth = isRotated ? piece.size.height : piece.size.width;
    const effectiveHeight = isRotated ? piece.size.width : piece.size.height;

    const { x: newX, y: newY } = getSnappedPosition(
      currentPreview.x,
      currentPreview.y,
      effectiveWidth,
      effectiveHeight
    );

    const hasCollision = checkCollision(
      newX,
      newY,
      effectiveWidth,
      effectiveHeight,
      undefined,
      piece.isDiagonal,
      newRotation
    );

    const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId);

    const newPreview = {
      x: newX,
      y: newY,
      width: effectiveWidth,
      height: effectiveHeight,
      color: terrain?.color || '#666',
      visible: true,
      label: piece.isDiagonal
        ? `${effectiveWidth}" x ${effectiveHeight}" △ (${newRotation}°)`
        : `${effectiveWidth}" x ${effectiveHeight}" (${newRotation}°)`,
      rotation: newRotation,
      hasCollision,
      isDiagonal: piece.isDiagonal,
    };

    dragPreviewRef.current = newPreview;
    setDragPreview(newPreview);
  }, [selectedPieceId, availablePieces, terrainTypes, getSnappedPosition, checkCollision]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      // R key only rotates already placed pieces (not during drag)
      if (e.key === 'r' || e.key === 'R') {
        // Only rotate if we have placed pieces selected and not dragging
        if (selectedPlacedPieceIds.length > 0 && !draggingPieceId && !isSidebarDragging && !mapDragPiece && !isPlacementMode && !multiDragState) {
          e.preventDefault();
          rotateSelectedPlacedPiece();
        }
      }
      // Delete selected pieces with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPlacedPieceIds.length > 0) {
        e.preventDefault();
        // Remove all selected pieces
        selectedPlacedPieceIds.forEach((id) => removePlacedPiece(id));
      }
      // Escape also clears selection
      if (e.key === 'Escape' && selectedPlacedPieceIds.length > 0 && !isPlacementMode && !mapDragPiece) {
        clearSelection();
      }
      // Open radial menu with T key (only if not already open and not dragging)
      // e.repeat checks if this is a repeated keydown from holding the key
      if ((e.key === 't' || e.key === 'T') && !e.repeat && !isRadialMenuOpen && !draggingPieceId && !isSidebarDragging && !isPlacementMode) {
        e.preventDefault();
        openRadialMenu(mousePosRef.current.x, mousePosRef.current.y);
      }
      // V key to toggle between 2D and 3D view
      if ((e.key === 'v' || e.key === 'V') && !e.repeat) {
        e.preventDefault();
        toggle3DMode();
      }
      // Escape to cancel placement mode or map drag
      if (e.key === 'Escape') {
        if (isPlacementMode) {
          e.preventDefault();
          exitPlacementMode();
          setDragPreview((prev) => ({ ...prev, visible: false }));
        }
        if (mapDragPiece) {
          e.preventDefault();
          // Restore original piece
          addPlacedPiece({
            id: mapDragPiece.id,
            pieceId: mapDragPiece.pieceId,
            x: mapDragPiece.originalX,
            y: mapDragPiece.originalY,
            rotation: mapDragPiece.rotation,
            level: mapDragPiece.level,
          });
          setMapDragPiece(null);
          setDraggingPieceId(null);
          setSelectedPieceId(null);
          setDragPreview((prev) => ({ ...prev, visible: false }));
        }
      }
    };

    // Track mouse position globally for radial menu
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    // Use document with capture phase for better compatibility during drag operations
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [
    isSidebarDragging,
    isDraggingFromSidebar,
    selectedPieceId,
    selectedPlacedPieceIds,
    draggingPieceId,
    mapDragPiece,
    multiDragState,
    currentRotation,
    setCurrentRotation,
    updatePreviewAfterRotation,
    rotateSelectedPlacedPiece,
    removePlacedPiece,
    clearSelection,
    isPlacementMode,
    exitPlacementMode,
    isRadialMenuOpen,
    openRadialMenu,
    addPlacedPiece,
    setMapDragPiece,
    setDraggingPieceId,
    setSelectedPieceId,
    toggle3DMode,
  ]);

  // Generate grid lines
  const gridLines = [];
  if (gridConfig.showGrid) {
    // Vertical lines
    for (let x = 0; x <= mapWidth; x += gridConfig.cellSize) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x * pixelsPerInch, 0, x * pixelsPerInch, canvasHeight]}
          stroke="#374151"
          strokeWidth={x % 3 === 0 ? 1 : 0.5}
          opacity={x % 3 === 0 ? 0.5 : 0.3}
        />
      );
    }
    // Horizontal lines
    for (let y = 0; y <= mapHeight; y += gridConfig.cellSize) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[0, y * pixelsPerInch, canvasWidth, y * pixelsPerInch]}
          stroke="#374151"
          strokeWidth={y % 3 === 0 ? 1 : 0.5}
          opacity={y % 3 === 0 ? 0.5 : 0.3}
        />
      );
    }
  }

  // Filter pieces for current level, deduplicate, and sort so selected pieces render last (on top)
  const selectedSet = useMemo(() => new Set(selectedPlacedPieceIds), [selectedPlacedPieceIds]);

  const visiblePieces = useMemo(() => {
    const pieces = placedPieces.filter((p) => p.level === currentLevel);
    // Deduplicate by id (keep first occurrence)
    const seen = new Set<string>();
    const uniquePieces = pieces.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    // Sort: selected pieces last so they render on top
    return uniquePieces.sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      if (aSelected && !bSelected) return 1;
      if (!aSelected && bSelected) return -1;
      return 0;
    });
  }, [placedPieces, currentLevel, selectedSet]);

  // Handle wheel zoom - using native event listener for passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, setZoom]);

  // Handle mousedown on placed piece - prepare for potential drag
  const handlePieceMouseDown = (placedId: string, e: any) => {
    e.cancelBubble = true;

    // If in placement mode, exit it first
    if (isPlacementMode) {
      exitPlacementMode();
      setDragPreview((prev) => ({ ...prev, visible: false }));
    }

    const isShiftKey = e.evt?.shiftKey;
    const isAlreadySelected = selectedSet.has(placedId);

    // Record the start position for drag threshold detection
    const stage = e.target.getStage();
    const pointerPos = stage?.getPointerPosition();
    if (pointerPos) {
      // If Shift is held, we'll handle selection toggle on click, not drag
      if (!isShiftKey) {
        // If clicking on an unselected piece, select it first (for single selection)
        if (!isAlreadySelected) {
          setSelectedPlacedPieceIds([placedId]);
        }
        // Set up pending drag
        setPendingDrag({
          placedId,
          startX: pointerPos.x,
          startY: pointerPos.y,
        });
      }
    }
  };

  // Actually start the drag (called after threshold is met)
  const startMapDrag = (placedId: string) => {
    const placed = placedPieces.find((p) => p.id === placedId);
    if (!placed) return;

    const piece = availablePieces.find((p) => p.id === placed.pieceId);
    if (!piece) return;

    // Check if we're dragging multiple selected pieces
    if (selectedPlacedPieceIds.length > 1 && selectedSet.has(placedId)) {
      // Multi-drag: store all selected pieces' original positions
      const selectedPieces = placedPieces.filter((p) => selectedSet.has(p.id));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setMultiDragState({
          pieces: selectedPieces.map((p) => ({
            id: p.id,
            pieceId: p.pieceId,
            originalX: p.x,
            originalY: p.y,
            rotation: p.rotation,
            level: p.level,
          })),
          startMouseX: (pendingDrag?.startX || 0 - panX) / pixelsPerInch,
          startMouseY: (pendingDrag?.startY || 0 - panY) / pixelsPerInch,
        });
      }
      setPendingDrag(null);
      return;
    }

    // Single piece drag (original behavior)
    // Store the piece info and mark as dragging
    setMapDragPiece({
      id: placed.id,
      pieceId: placed.pieceId,
      rotation: placed.rotation,
      level: placed.level,
      originalX: placed.x,
      originalY: placed.y,
    });

    // Don't remove the piece - just hide it visually via draggingPieceId
    // The piece will be updated in place when dropped

    // Select the piece type (like sidebar) for preview
    setSelectedPieceId(piece.id);
    setCurrentRotation(placed.rotation);
    setDraggingPieceId(placed.id);
    setPendingDrag(null);
  };

  // Handle drag over - show preview (from sidebar)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFromSidebar(true);

    if (!selectedPiece || !containerRef.current) {
      setDragPreview((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - panX) / pixelsPerInch;
    const rawY = (e.clientY - rect.top - panY) / pixelsPerInch;

    // For sidebar drag, use defaultRotation for diagonal pieces or currentRotation
    const rotation = currentRotation ?? selectedPiece.defaultRotation ?? 0;

    // Swap dimensions if rotated 90 or 270 degrees
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveWidth = isRotated ? selectedPiece.size.height : selectedPiece.size.width;
    const effectiveHeight = isRotated ? selectedPiece.size.width : selectedPiece.size.height;

    // Center the piece on cursor
    const centeredX = rawX - effectiveWidth / 2;
    const centeredY = rawY - effectiveHeight / 2;

    const { x: snappedX, y: snappedY } = getSnappedPosition(
      centeredX,
      centeredY,
      effectiveWidth,
      effectiveHeight
    );

    const hasCollision = checkCollision(snappedX, snappedY, effectiveWidth, effectiveHeight, undefined, selectedPiece.isDiagonal, rotation);

    setDragPreview({
      x: snappedX,
      y: snappedY,
      width: effectiveWidth,
      height: effectiveHeight,
      color: selectedTerrain?.color || '#666',
      visible: true,
      label: selectedPiece.isDiagonal
        ? `${selectedPiece.size.label}`
        : `${effectiveWidth}" x ${effectiveHeight}"`,
      rotation: rotation,
      hasCollision,
      isDiagonal: selectedPiece.isDiagonal,
      isCustom: selectedPiece.isCustom,
      isVariant: selectedPiece.isVariant,
      cellColors: selectedPiece.cellColors,
    });
  };

  // Handle drag leave - hide preview
  const handleDragLeave = (e: React.DragEvent) => {
    // Only hide if leaving the container entirely
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDragPreview((prev) => ({ ...prev, visible: false }));
        setIsDraggingFromSidebar(false);
      }
    }
  };

  // Handle drop from sidebar
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use the ref to get the latest preview position
    const currentPreview = dragPreviewRef.current;

    setDragPreview((prev) => ({ ...prev, visible: false }));
    setIsDraggingFromSidebar(false);

    // Don't place if there's a collision
    if (currentPreview.hasCollision) return;

    if (!selectedPiece) return;

    // Always use the preview position (already snapped)
    onDrop(currentPreview.x, currentPreview.y, currentRotation);
  };

  // Handle mouse move for sidebar drag, placement mode, map drag, selection rect, multi-drag, AND panning
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Handle right-click panning
    if (isPanning && panStartRef.current) {
      const deltaX = e.clientX - panStartRef.current.mouseX;
      const deltaY = e.clientY - panStartRef.current.mouseY;
      setPan(panStartRef.current.panX + deltaX, panStartRef.current.panY + deltaY);
      return;
    }

    const rawX = (e.clientX - rect.left - panX) / pixelsPerInch;
    const rawY = (e.clientY - rect.top - panY) / pixelsPerInch;

    // Handle selection rectangle
    if (selectionRect?.active) {
      setSelectionRect((prev) =>
        prev ? { ...prev, currentX: rawX, currentY: rawY } : null
      );
      return;
    }

    // Handle multi-drag (moving multiple selected pieces)
    if (multiDragState) {
      const deltaX = rawX - multiDragState.startMouseX;
      const deltaY = rawY - multiDragState.startMouseY;

      // Calculate new positions for all selected pieces
      const updates = multiDragState.pieces.map((p) => {
        let newX = p.originalX + deltaX;
        let newY = p.originalY + deltaY;

        // Apply grid snap if enabled
        if (gridConfig.snapToGrid) {
          newX = Math.round(newX / gridConfig.cellSize) * gridConfig.cellSize;
          newY = Math.round(newY / gridConfig.cellSize) * gridConfig.cellSize;
        }

        // Clamp to map bounds
        const piece = availablePieces.find((ap) => ap.id === p.pieceId);
        if (piece) {
          const isRotated = p.rotation === 90 || p.rotation === 270;
          const w = isRotated ? piece.size.height : piece.size.width;
          const h = isRotated ? piece.size.width : piece.size.height;
          newX = Math.max(0, Math.min(newX, mapWidth - w));
          newY = Math.max(0, Math.min(newY, mapHeight - h));
        }

        return { id: p.id, updates: { x: newX, y: newY } };
      });

      // Update all pieces in real-time
      updatePlacedPieces(updates);
      return;
    }

    // Check if we should start a map drag (threshold detection)
    if (pendingDrag && !mapDragPiece) {
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const deltaX = Math.abs(currentX - (pendingDrag.startX - panX));
      const deltaY = Math.abs(currentY - (pendingDrag.startY - panY));

      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        startMapDrag(pendingDrag.placedId);
      }
      return;
    }

    // Handle sidebar drag, placement mode, or map drag
    const isDragging = isSidebarDragging || isPlacementMode || mapDragPiece;
    if (!isDragging || !selectedPiece || !containerRef.current) return;

    // For map drag, preserve the piece's rotation; for sidebar/placement, use currentRotation
    const rotation = mapDragPiece?.rotation ?? currentRotation ?? selectedPiece.defaultRotation ?? 0;

    // Swap dimensions if rotated 90 or 270 degrees
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveWidth = isRotated ? selectedPiece.size.height : selectedPiece.size.width;
    const effectiveHeight = isRotated ? selectedPiece.size.width : selectedPiece.size.height;

    // Center the piece on cursor
    const centeredX = rawX - effectiveWidth / 2;
    const centeredY = rawY - effectiveHeight / 2;

    const { x: snappedX, y: snappedY } = getSnappedPosition(
      centeredX,
      centeredY,
      effectiveWidth,
      effectiveHeight
    );

    // Exclude the piece being dragged from collision check
    const excludeId = mapDragPiece?.id;
    const hasCollision = checkCollision(snappedX, snappedY, effectiveWidth, effectiveHeight, excludeId, selectedPiece.isDiagonal, rotation);
    const terrain = terrainTypes.find((t) => t.id === selectedPiece.terrainTypeId);

    const newPreview = {
      x: snappedX,
      y: snappedY,
      width: effectiveWidth,
      height: effectiveHeight,
      color: terrain?.color || '#666',
      visible: true,
      label: selectedPiece.isDiagonal
        ? `${selectedPiece.size.label}`
        : `${effectiveWidth}" x ${effectiveHeight}"`,
      rotation: rotation,
      hasCollision,
      isDiagonal: selectedPiece.isDiagonal,
      isCustom: selectedPiece.isCustom,
      isVariant: selectedPiece.isVariant,
      cellColors: selectedPiece.cellColors,
    };

    // Update both ref and state
    dragPreviewRef.current = newPreview;
    setDragPreview(newPreview);
  };

  // Handle mouse up to place piece from sidebar drag or map drag
  // KEY INSIGHT: The preview is ALWAYS accurate, so we just use its position directly
  const handleMouseUp = (e: React.MouseEvent) => {
    // Handle right-click panning end
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    // Handle selection rectangle finalization
    if (selectionRect?.active) {
      isSelectingRef.current = false;

      const minX = Math.min(selectionRect.startX, selectionRect.currentX);
      const maxX = Math.max(selectionRect.startX, selectionRect.currentX);
      const minY = Math.min(selectionRect.startY, selectionRect.currentY);
      const maxY = Math.max(selectionRect.startY, selectionRect.currentY);

      // Only select if rectangle is big enough (not just a click)
      const rectWidth = maxX - minX;
      const rectHeight = maxY - minY;

      if (rectWidth > 0.5 || rectHeight > 0.5) {
        // Find pieces that intersect with the selection rectangle
        const piecesInRect = placedPieces.filter((placed) => {
          if (placed.level !== currentLevel) return false;

          const piece = availablePieces.find((p) => p.id === placed.pieceId);
          if (!piece) return false;

          // Calculate effective dimensions based on rotation
          const isRotated = placed.rotation === 90 || placed.rotation === 270;
          const pieceWidth = isRotated ? piece.size.height : piece.size.width;
          const pieceHeight = isRotated ? piece.size.width : piece.size.height;

          // Check intersection
          const pieceLeft = placed.x;
          const pieceRight = placed.x + pieceWidth;
          const pieceTop = placed.y;
          const pieceBottom = placed.y + pieceHeight;

          return (
            pieceRight > minX &&
            pieceLeft < maxX &&
            pieceBottom > minY &&
            pieceTop < maxY
          );
        });

        if (piecesInRect.length > 0) {
          const isShiftKey = e.shiftKey;
          if (isShiftKey) {
            // Add to existing selection
            const newIds = piecesInRect.map((p) => p.id);
            const combined = [...new Set([...selectedPlacedPieceIds, ...newIds])];
            setSelectedPlacedPieceIds(combined);
          } else {
            // Replace selection
            setSelectedPlacedPieceIds(piecesInRect.map((p) => p.id));
          }
        } else if (!e.shiftKey) {
          // Clear selection if no pieces in rect and not holding shift
          clearSelection();
        }
      }

      setSelectionRect(null);
      return;
    }

    // Handle multi-drag finalization
    if (multiDragState) {
      setMultiDragState(null);
      return;
    }

    // Clear pending drag if threshold wasn't met (it was just a click)
    if (pendingDrag) {
      setPendingDrag(null);
      return;
    }

    // Get the current preview (always accurate and up-to-date)
    const preview = dragPreviewRef.current;

    // Handle map drag - use preview position directly
    if (mapDragPiece && selectedPiece) {
      setDragPreview((prev) => ({ ...prev, visible: false }));
      const pieceId = mapDragPiece.id;
      setMapDragPiece(null);
      setDraggingPieceId(null);
      setSelectedPieceId(null);

      // If collision or preview not visible, keep piece at original position (do nothing)
      if (preview.hasCollision || !preview.visible) {
        // Piece stays where it was - no update needed
        return;
      }

      // Update piece position in place (no delete/recreate)
      updatePlacedPiece(pieceId, {
        x: preview.x,
        y: preview.y,
        rotation: preview.rotation,
      });
      return;
    }

    // Handle sidebar drag - use preview position directly
    if (!isSidebarDragging || !selectedPiece) return;

    setDragPreview((prev) => ({ ...prev, visible: false }));
    endSidebarDrag();

    // Don't place if there's a collision or preview not visible
    if (preview.hasCollision || !preview.visible) return;

    // Use the preview position directly - it's always correct!
    onDrop(preview.x, preview.y, preview.rotation);
  };

  // Handle mouse leave to hide preview and cancel map drag
  const handleMouseLeave = () => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    // Clear selection rectangle
    if (selectionRect) {
      isSelectingRef.current = false;
      setSelectionRect(null);
    }
    // Cancel multi-drag and restore original positions
    if (multiDragState) {
      const restoreUpdates = multiDragState.pieces.map((p) => ({
        id: p.id,
        updates: { x: p.originalX, y: p.originalY },
      }));
      updatePlacedPieces(restoreUpdates);
      setMultiDragState(null);
    }
    // Clear pending drag
    if (pendingDrag) {
      setPendingDrag(null);
    }
    if (mapDragPiece) {
      // Restore original piece on mouse leave
      addPlacedPiece({
        id: mapDragPiece.id,
        pieceId: mapDragPiece.pieceId,
        x: mapDragPiece.originalX,
        y: mapDragPiece.originalY,
        rotation: mapDragPiece.rotation,
        level: mapDragPiece.level,
      });
      setMapDragPiece(null);
      setDraggingPieceId(null);
      setSelectedPieceId(null);
    }
    if (isSidebarDragging || isPlacementMode || mapDragPiece) {
      setDragPreview((prev) => ({ ...prev, visible: false }));
    }
  };

  // Handle click on canvas background to deselect or place piece in placement mode
  const handleCanvasClick = (e: any) => {
    // Check if clicking on background (not on a piece)
    const isBackground = e.target === e.currentTarget || e.target.attrs?.name === 'background';

    // Only handle clicks on background - piece clicks are handled by their own handlers
    if (!isBackground) return;

    // Use the ref to get the latest preview position
    const currentPreview = dragPreviewRef.current;

    // If in placement mode, place the piece (only if preview is visible and valid)
    if (isPlacementMode && selectedPiece && currentPreview.visible && !currentPreview.hasCollision) {
      onDrop(currentPreview.x, currentPreview.y, currentRotation);
      exitPlacementMode();
      setDragPreview((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Deselect if clicking on the background (and not finishing a selection rectangle)
    if (!selectionRect) {
      clearSelection();
    }
  };

  // Handle mousedown on stage background to start selection rectangle or panning
  const handleStageMouseDown = (e: any) => {
    const isBackground = e.target === e.currentTarget || e.target.attrs?.name === 'background';
    const mouseButton = e.evt?.button;

    // Right click (button 2): start panning
    if (mouseButton === 2 && !isViewLocked) {
      e.evt?.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        panStartRef.current = {
          mouseX: e.evt.clientX,
          mouseY: e.evt.clientY,
          panX: panX,
          panY: panY,
        };
        setIsPanning(true);
      }
      return;
    }

    // Left click (button 0): start selection rectangle on background
    if (mouseButton === 0 && isBackground) {
      // Don't start selection if view is locked
      if (isViewLocked) return;

      const stage = e.target.getStage();
      const pointerPos = stage?.getPointerPosition();
      if (pointerPos && containerRef.current) {
        // Mark that we're starting a selection
        isSelectingRef.current = true;

        const rawX = (pointerPos.x - panX) / pixelsPerInch;
        const rawY = (pointerPos.y - panY) / pixelsPerInch;
        setSelectionRect({
          startX: rawX,
          startY: rawY,
          currentX: rawX,
          currentY: rawY,
          active: true,
        });
      }
    }
  };

  // Handle piece click to select
  const handlePieceClick = (placedId: string, e: any) => {
    e.cancelBubble = true; // Prevent event from bubbling to stage

    // If in placement mode, exit it (user clicked on existing piece instead)
    if (isPlacementMode) {
      exitPlacementMode();
      setDragPreview((prev) => ({ ...prev, visible: false }));
    }

    const isShiftKey = e.evt?.shiftKey;

    if (isShiftKey) {
      // Shift+click: toggle selection
      toggleSelection(placedId);
    } else {
      // Normal click: if not already in a multi-selection being maintained, select only this piece
      // This is already handled in mousedown for non-shift clicks
    }
  };

  // Format piece label for display
  const formatPieceLabel = (piece: typeof availablePieces[0]) => {
    const sizeLabel = piece.isDiagonal
      ? `${piece.size.width}"x${piece.size.height}" △`
      : `${piece.size.width}"x${piece.size.height}"`;
    return `${piece.name}\n${sizeLabel}`;
  };

  // Get preview color based on collision state
  const getPreviewColor = () => {
    if (dragPreview.hasCollision) {
      return '#ef4444'; // Red
    }
    return dragPreview.color;
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 h-full min-h-0 overflow-hidden bg-gray-900 relative ${isPanning ? 'cursor-grabbing' : ''}`}
      onDrop={handleCanvasDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={panX}
        y={panY}
        draggable={false}
        onClick={handleCanvasClick}
        onMouseDown={handleStageMouseDown}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        {/* Background */}
        <Layer>
          <Rect
            name="background"
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="#1f2937"
            onClick={handleCanvasClick}
          />
        </Layer>

        {/* Grid */}
        <Layer listening={false}>{gridLines}</Layer>

        {/* Selection rectangle */}
        {selectionRect && (
          <Layer listening={false}>
            <Rect
              x={Math.min(selectionRect.startX, selectionRect.currentX) * pixelsPerInch}
              y={Math.min(selectionRect.startY, selectionRect.currentY) * pixelsPerInch}
              width={Math.abs(selectionRect.currentX - selectionRect.startX) * pixelsPerInch}
              height={Math.abs(selectionRect.currentY - selectionRect.startY) * pixelsPerInch}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[6, 3]}
            />
          </Layer>
        )}

        {/* Drop preview / highlight */}
        <Layer listening={false}>
          {dragPreview.visible && (
            <Group
              x={dragPreview.x * pixelsPerInch}
              y={dragPreview.y * pixelsPerInch}
            >
              {/* Highlight area - shows actual grid position */}
              {dragPreview.isDiagonal ? (
                <Group
                  offsetX={dragPreview.width * pixelsPerInch / 2}
                  offsetY={dragPreview.height * pixelsPerInch / 2}
                  x={dragPreview.width * pixelsPerInch / 2}
                  y={dragPreview.height * pixelsPerInch / 2}
                  rotation={dragPreview.rotation}
                >
                  <Line
                    points={[
                      0, 0,
                      dragPreview.width * pixelsPerInch, 0,
                      0, dragPreview.height * pixelsPerInch,
                    ]}
                    closed
                    fill={getPreviewColor()}
                    opacity={dragPreview.hasCollision ? 0.5 : 0.4}
                    stroke="#fff"
                    strokeWidth={2}
                    dash={[8, 4]}
                  />
                </Group>
              ) : (dragPreview.isCustom || dragPreview.isVariant) && dragPreview.cellColors && dragPreview.cellColors.length > 0 ? (
                // Grid-based custom/variant piece preview
                <>
                  {(() => {
                    const { rows, cols } = getGridDimensions(dragPreview.width, dragPreview.height);
                    const cellWidth = (dragPreview.width * pixelsPerInch) / cols;
                    const cellHeight = (dragPreview.height * pixelsPerInch) / rows;
                    return dragPreview.cellColors.map((row, rowIdx) =>
                      row.map((terrainId, colIdx) => {
                        const terrain = terrainTypes.find((t) => t.id === terrainId);
                        return (
                          <Rect
                            key={`${rowIdx}-${colIdx}`}
                            x={colIdx * cellWidth}
                            y={rowIdx * cellHeight}
                            width={cellWidth}
                            height={cellHeight}
                            fill={dragPreview.hasCollision ? '#ef4444' : (terrain?.color || '#666')}
                            opacity={dragPreview.hasCollision ? 0.5 : 0.4}
                            stroke="#fff"
                            strokeWidth={1}
                            dash={[4, 2]}
                          />
                        );
                      })
                    );
                  })()}
                </>
              ) : (
                <Rect
                  x={0}
                  y={0}
                  width={dragPreview.width * pixelsPerInch}
                  height={dragPreview.height * pixelsPerInch}
                  fill={getPreviewColor()}
                  opacity={dragPreview.hasCollision ? 0.5 : 0.4}
                  stroke="#fff"
                  strokeWidth={2}
                  dash={[8, 4]}
                  cornerRadius={4}
                />
              )}
              {/* Size label */}
              <Text
                x={4}
                y={4}
                text={dragPreview.label}
                fontSize={11}
                fill="#fff"
                fontStyle="bold"
                opacity={0.9}
              />
              {/* Collision warning */}
              {dragPreview.hasCollision && (
                <Text
                  x={4}
                  y={dragPreview.height * pixelsPerInch - 20}
                  text="⚠ Collision!"
                  fontSize={12}
                  fill="#fff"
                  fontStyle="bold"
                />
              )}
            </Group>
          )}
        </Layer>

        {/* Placed pieces */}
        <Layer>
          {visiblePieces.map((placed) => {
            const piece = availablePieces.find((p) => p.id === placed.pieceId);
            if (!piece) return null;

            // Look up by id (UUID) or slug for backward compatibility
            const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
            const pieceWidth = piece.size.width * pixelsPerInch;
            const pieceHeight = piece.size.height * pixelsPerInch;
            const isDragging = draggingPieceId === placed.id;
            const isSelected = selectedSet.has(placed.id);

            return (
              <Group
                key={placed.id}
                x={placed.x * pixelsPerInch + pieceWidth / 2}
                y={placed.y * pixelsPerInch + pieceHeight / 2}
                offsetX={pieceWidth / 2}
                offsetY={pieceHeight / 2}
                onMouseDown={(e) => handlePieceMouseDown(placed.id, e)}
                onDblClick={() => removePlacedPiece(placed.id)}
                onClick={(e) => handlePieceClick(placed.id, e)}
                rotation={placed.rotation}
                opacity={isDragging ? 0 : 1}
                visible={!isDragging}
              >
                {piece.isDiagonal ? (
                  <Line
                    points={[0, 0, pieceWidth, 0, 0, pieceHeight]}
                    closed
                    fill={terrain?.color || '#666'}
                    stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                ) : (piece.isCustom || piece.isVariant) && piece.cellColors && piece.cellColors.length > 0 ? (
                  // Grid-based custom/variant piece rendering
                  <>
                    {(() => {
                      const { rows, cols } = getGridDimensions(piece.size.width, piece.size.height);
                      const cellWidth = pieceWidth / cols;
                      const cellHeight = pieceHeight / rows;
                      return piece.cellColors.map((row, rowIdx) =>
                        row.map((terrainId, colIdx) => {
                          const cellTerrain = terrainTypes.find((t) => t.id === terrainId);
                          return (
                            <Rect
                              key={`${rowIdx}-${colIdx}`}
                              x={colIdx * cellWidth}
                              y={rowIdx * cellHeight}
                              width={cellWidth}
                              height={cellHeight}
                              fill={cellTerrain?.color || '#666'}
                              stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}
                              strokeWidth={isSelected ? 2 : 0.5}
                            />
                          );
                        })
                      );
                    })()}
                    {/* Selection outline */}
                    {isSelected && (
                      <Rect
                        width={pieceWidth}
                        height={pieceHeight}
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="transparent"
                        cornerRadius={2}
                      />
                    )}
                  </>
                ) : (
                  <Rect
                    width={pieceWidth}
                    height={pieceHeight}
                    fill={terrain?.color || '#666'}
                    stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isSelected ? 3 : 1}
                    cornerRadius={2}
                  />
                )}
                {/* Piece label */}
                <Text
                  text={formatPieceLabel(piece)}
                  width={pieceWidth}
                  height={piece.isDiagonal ? pieceHeight / 2 : pieceHeight}
                  align="center"
                  verticalAlign={piece.isDiagonal ? 'top' : 'middle'}
                  fontSize={10}
                  lineHeight={1.3}
                  fill="#fff"
                  fontStyle="bold"
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOpacity={0.8}
                  y={piece.isDiagonal ? 4 : 0}
                />
                {/* Elevation indicators at corners */}
                {piece.elevation && !piece.isDiagonal && (
                  <>
                    {/* NW corner (top-left) */}
                    {piece.elevation.nw > 0 && (
                      <Group x={0} y={0}>
                        <Circle
                          radius={isSelected ? 10 : 8}
                          fill={isSelected ? '#facc15' : '#3b82f6'}
                          stroke={isSelected ? '#fff' : '#fff'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <Text
                          x={-6}
                          y={-5}
                          text={piece.elevation.nw.toFixed(1)}
                          fontSize={8}
                          fill={isSelected ? '#000' : '#fff'}
                          fontStyle="bold"
                        />
                      </Group>
                    )}
                    {/* NE corner (top-right) */}
                    {piece.elevation.ne > 0 && (
                      <Group x={pieceWidth} y={0}>
                        <Circle
                          radius={isSelected ? 10 : 8}
                          fill={isSelected ? '#facc15' : '#3b82f6'}
                          stroke={isSelected ? '#fff' : '#fff'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <Text
                          x={-6}
                          y={-5}
                          text={piece.elevation.ne.toFixed(1)}
                          fontSize={8}
                          fill={isSelected ? '#000' : '#fff'}
                          fontStyle="bold"
                        />
                      </Group>
                    )}
                    {/* SW corner (bottom-left) */}
                    {piece.elevation.sw > 0 && (
                      <Group x={0} y={pieceHeight}>
                        <Circle
                          radius={isSelected ? 10 : 8}
                          fill={isSelected ? '#facc15' : '#3b82f6'}
                          stroke={isSelected ? '#fff' : '#fff'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <Text
                          x={-6}
                          y={-5}
                          text={piece.elevation.sw.toFixed(1)}
                          fontSize={8}
                          fill={isSelected ? '#000' : '#fff'}
                          fontStyle="bold"
                        />
                      </Group>
                    )}
                    {/* SE corner (bottom-right) */}
                    {piece.elevation.se > 0 && (
                      <Group x={pieceWidth} y={pieceHeight}>
                        <Circle
                          radius={isSelected ? 10 : 8}
                          fill={isSelected ? '#facc15' : '#3b82f6'}
                          stroke={isSelected ? '#fff' : '#fff'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <Text
                          x={-6}
                          y={-5}
                          text={piece.elevation.se.toFixed(1)}
                          fontSize={8}
                          fill={isSelected ? '#000' : '#fff'}
                          fontStyle="bold"
                        />
                      </Group>
                    )}
                  </>
                )}
                {/* Rotate button - appears when selected, at top center */}
                {isSelected && (
                  <Group
                    x={pieceWidth / 2}
                    y={-12}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      // Rotate 90 degrees clockwise
                      const newRotation = (placed.rotation + 90) % 360;
                      updatePlacedPiece(placed.id, { rotation: newRotation });
                    }}
                    onMouseEnter={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = 'default';
                    }}
                  >
                    <Circle
                      radius={10}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={2}
                      shadowColor="black"
                      shadowBlur={4}
                      shadowOpacity={0.5}
                    />
                    <Text
                      text="↻"
                      fontSize={14}
                      fill="#fff"
                      fontStyle="bold"
                      x={-5}
                      y={-7}
                    />
                  </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Coordinates overlay */}
      <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
        {mapWidth}&quot; x {mapHeight}&quot; | Zoom: {Math.round(zoom * 100)}%
        {isViewLocked && <span className="ml-2 text-yellow-400">🔒 Locked</span>}
        {dragPreview.visible && (
          <span className={`ml-2 ${dragPreview.hasCollision ? 'text-red-400' : 'text-green-400'}`}>
            Drop at: {dragPreview.x}&quot;, {dragPreview.y}&quot;
            {dragPreview.hasCollision && ' (Blocked)'}
          </span>
        )}
      </div>

      {/* Help text */}
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-gray-400">
        Left drag: Select | Right drag: Pan | Shift+Click: Add to selection | R: Rotate | Del: Delete
      </div>
    </div>
  );
}
