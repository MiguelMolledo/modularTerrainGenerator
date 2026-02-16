'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useMapStore } from '@/store/mapStore';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useMapNavigation } from '@/hooks/useMapNavigation';
import { BASE_PIXELS_PER_INCH } from '@/config/terrain';
import { PlacedPiece, ModularPiece } from '@/types';
import { DEFAULT_PROPS } from '@/config/props';
import { checkCollisionWithPieces } from '@/lib/collisionUtils';
import { desaturateColor } from '@/lib/colorUtils';
import { setStageInstance, setMapDimensions, setCurrentZoom } from '@/lib/stageRef';
import { getGridDimensions } from '@/lib/gridUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Info } from 'lucide-react';

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
  isProp?: boolean;
  propEmoji?: string;
  propImage?: string;
  // Original dimensions for diagonal pieces (before rotation swap)
  originalWidth?: number;
  originalHeight?: number;
}

// Hook to load image for Konva
function useLoadedImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return image;
}

// Component to render a prop image in Konva
function PropImage({
  src,
  x,
  y,
  width,
  height,
  opacity = 1,
}: {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}) {
  const image = useLoadedImage(src);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={opacity}
    />
  );
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

  // Help dialog state
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  // Ref to track selection mode (for immediate drag cancellation)
  const isSelectingRef = useRef(false);

  // Navigation hook (handles wheel pan/zoom, space+drag, right-click pan, animated focus)
  const {
    isPanning: isNavPanning,
    isSpaceHeld,
    cursorClass: navCursorClass,
    handleNavigationMouseDown,
    handleNavigationMouseMove,
    handleNavigationMouseUp,
    handleNavigationMouseLeave,
    focusOnPoint,
    focusOnBounds,
  } = useMapNavigation({ containerRef, containerSize });

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
    showReferenceLevels,
    referenceLevelOpacity,
    editMode,
    customProps,
    openPropSearch,
    isPropSearchOpen,
    showTerrain,
    showProps,
  } = useMapStore();

  const { recordRemovePiece, recordRemovePieces, recordMovePiece, recordMovePieces } = useUndoRedo();

  const pixelsPerInch = BASE_PIXELS_PER_INCH * zoom;
  const canvasWidth = mapWidth * pixelsPerInch;
  const canvasHeight = mapHeight * pixelsPerInch;

  // Update map dimensions for full map snapshot (used by Generate Art)
  useEffect(() => {
    setMapDimensions(mapWidth, mapHeight);
  }, [mapWidth, mapHeight]);

  // Update zoom level for full map snapshot (used by Generate Art)
  useEffect(() => {
    setCurrentZoom(zoom);
  }, [zoom]);

  // Combined pieces array (terrain pieces + custom props)
  // Combined pieces array (terrain pieces + default props + custom props)
  const allPieces = useMemo(() => {
    return [...availablePieces, ...DEFAULT_PROPS, ...customProps];
  }, [availablePieces, customProps]);

  // Get selected piece info for preview (from sidebar)
  const selectedPiece = selectedPieceId
    ? allPieces.find((p) => p.id === selectedPieceId)
    : null;
  const selectedTerrain = selectedPiece
    ? terrainTypes.find((t) => t.id === selectedPiece.terrainTypeId)
    : null;

  // Helper to delete a piece with undo recording
  const handleDeletePiece = useCallback((pieceId: string) => {
    const piece = placedPieces.find((p) => p.id === pieceId);
    if (piece) {
      recordRemovePiece(piece);
      removePlacedPiece(pieceId);
    }
  }, [placedPieces, recordRemovePiece, removePlacedPiece]);

  // Check collision with support for diagonal (triangular) pieces
  // Props do NOT collide with terrain (they sit on top)
  // Props can optionally collide with other props
  const checkCollision = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      excludePieceId?: string,
      isDiagonal: boolean = false,
      rotation: number = 0,
      isProp: boolean = false
    ): boolean => {
      // Filter pieces on current level
      // Props only collide with other props, terrain only collides with terrain
      const currentLevelPieces = placedPieces.filter((p) => {
        if (p.level !== currentLevel) return false;
        const piece = allPieces.find((ap) => ap.id === p.pieceId);
        const pieceIsProp = piece?.pieceType === 'prop';
        // Only check collision with same type (prop vs prop, terrain vs terrain)
        return isProp === pieceIsProp;
      });

      const newPieceGeometry = {
        x,
        y,
        width,
        height,
        rotation,
        isDiagonal,
      };

      const getPieceInfo = (pieceId: string) => {
        const piece = allPieces.find((p) => p.id === pieceId);
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
    [placedPieces, allPieces, currentLevel]
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
        const beforeSnapX = snappedX;
        const beforeSnapY = snappedY;
        snappedX = Math.round(x / gridConfig.cellSize) * gridConfig.cellSize;
        snappedY = Math.round(y / gridConfig.cellSize) * gridConfig.cellSize;
        console.log('[SNAP] Grid snap:', {
          cellSize: gridConfig.cellSize,
          before: { x: beforeSnapX.toFixed(2), y: beforeSnapY.toFixed(2) },
          after: { x: snappedX.toFixed(2), y: snappedY.toFixed(2) },
        });
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
          const piece = allPieces.find((p) => p.id === placed.pieceId);
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

      console.log('[SNAP] Final position:', { x: snappedX.toFixed(2), y: snappedY.toFixed(2) });
      return { x: snappedX, y: snappedY };
    },
    [gridConfig.snapToGrid, gridConfig.magneticSnap, gridConfig.cellSize, mapWidth, mapHeight, placedPieces, allPieces, currentLevel]
  );

  // Function to update preview after rotation
  const updatePreviewAfterRotation = useCallback((newRotation: number, excludeId?: string) => {
    const piece = selectedPieceId ? allPieces.find((p) => p.id === selectedPieceId) : null;
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
      excludeId,
      piece.isDiagonal,
      newRotation,
      piece.pieceType === 'prop'
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
        ? `${piece.size.width}" x ${piece.size.height}" △ (${newRotation}°)`
        : `${effectiveWidth}" x ${effectiveHeight}" (${newRotation}°)`,
      rotation: newRotation,
      hasCollision,
      isDiagonal: piece.isDiagonal,
      // Store original dimensions for diagonal piece rendering
      originalWidth: piece.isDiagonal ? piece.size.width : undefined,
      originalHeight: piece.isDiagonal ? piece.size.height : undefined,
    };

    dragPreviewRef.current = newPreview;
    setDragPreview(newPreview);
  }, [selectedPieceId, allPieces, terrainTypes, getSnappedPosition, checkCollision]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      // R key to rotate pieces
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();

        // Case 1: Rotate during sidebar drag or placement mode
        if (isSidebarDragging || isPlacementMode) {
          const newRotation = (currentRotationRef.current + 90) % 360;
          currentRotationRef.current = newRotation; // Update ref immediately
          setCurrentRotation(newRotation);
          updatePreviewAfterRotation(newRotation);
          return;
        }

        // Case 2: Rotate during map drag (moving existing piece)
        if (mapDragPiece) {
          const newRotation = (mapDragPiece.rotation + 90) % 360;
          setMapDragPiece({ ...mapDragPiece, rotation: newRotation });
          updatePreviewAfterRotation(newRotation, mapDragPiece.id);
          return;
        }

        // Case 3: Rotate already placed pieces (when selected and not dragging)
        if (selectedPlacedPieceIds.length > 0 && !draggingPieceId && !multiDragState) {
          rotateSelectedPlacedPiece();
        }
      }
      // Delete selected pieces with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPlacedPieceIds.length > 0) {
        e.preventDefault();
        // Record pieces for undo before removing
        const piecesToRemove = placedPieces.filter((p) => selectedPlacedPieceIds.includes(p.id));
        if (piecesToRemove.length > 1) {
          recordRemovePieces(piecesToRemove);
        } else if (piecesToRemove.length === 1) {
          recordRemovePiece(piecesToRemove[0]);
        }
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
      // P key to open prop search dialog
      if ((e.key === 'p' || e.key === 'P') && !e.repeat && !isRadialMenuOpen && !isPropSearchOpen && !draggingPieceId && !isSidebarDragging && !isPlacementMode) {
        e.preventDefault();
        // Deselect any selected piece to avoid replacing it when placing new prop
        setSelectedPieceId(null);
        openPropSearch(mousePosRef.current.x, mousePosRef.current.y);
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
          // Cancel the drag - piece was never removed, just hidden
          // Simply unhide it by clearing draggingPieceId
          setMapDragPiece(null);
          setDraggingPieceId(null);
          setSelectedPieceId(null);
          setDragPreview((prev) => ({ ...prev, visible: false }));
        }
      }

      // F key to focus view (center on selection or map) with animation
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();

        if (selectedPlacedPieceIds.length > 0) {
          // Focus on selected pieces - calculate their bounding box
          const selectedPieces = placedPieces.filter(p => selectedPlacedPieceIds.includes(p.id));
          if (selectedPieces.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            selectedPieces.forEach(placed => {
              const piece = allPieces.find(p => p.id === placed.pieceId);
              if (piece) {
                const isRotated = placed.rotation === 90 || placed.rotation === 270;
                const w = isRotated ? piece.size.height : piece.size.width;
                const h = isRotated ? piece.size.width : piece.size.height;

                minX = Math.min(minX, placed.x);
                minY = Math.min(minY, placed.y);
                maxX = Math.max(maxX, placed.x + w);
                maxY = Math.max(maxY, placed.y + h);
              }
            });

            focusOnBounds(minX, minY, maxX, maxY);
          }
        } else {
          // Focus on entire map center
          focusOnPoint(mapWidth / 2, mapHeight / 2);
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
    openPropSearch,
    isPropSearchOpen,
    // Focus view dependencies
    placedPieces,
    allPieces,
    mapWidth,
    mapHeight,
    focusOnPoint,
    focusOnBounds,
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

  // Helper to check if a piece definition is a prop
  const isPropPiece = useCallback((piece: ModularPiece | undefined) => {
    return piece?.pieceType === 'prop';
  }, []);

  // Helper to check if a placed piece is a prop
  const isPlacedPieceProp = useCallback((placedId: string) => {
    const placed = placedPieces.find((p) => p.id === placedId);
    if (!placed) return false;
    const piece = allPieces.find((p) => p.id === placed.pieceId);
    return isPropPiece(piece);
  }, [placedPieces, allPieces, isPropPiece]);

  // Check if a placed piece should be interactive based on edit mode
  const isPlacedPieceInteractive = useCallback((placedId: string) => {
    const isProp = isPlacedPieceProp(placedId);
    return editMode === 'props' ? isProp : !isProp;
  }, [editMode, isPlacedPieceProp]);

  const visiblePieces = useMemo(() => {
    const pieces = placedPieces.filter((p) => p.level === currentLevel);
    // Deduplicate by id (keep first occurrence)
    const seen = new Set<string>();
    const uniquePieces = pieces.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Filter by visibility settings
    const filteredPieces = uniquePieces.filter((placed) => {
      const piece = allPieces.find((p) => p.id === placed.pieceId);
      const isProp = piece?.pieceType === 'prop';
      if (isProp && !showProps) return false;
      if (!isProp && !showTerrain) return false;
      return true;
    });

    // Sort: selected pieces last so they render on top
    return filteredPieces.sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      if (aSelected && !bSelected) return 1;
      if (!aSelected && bSelected) return -1;
      return 0;
    });
  }, [placedPieces, currentLevel, selectedSet, allPieces, isPropPiece, showTerrain, showProps]);

  // Separate terrain and props for rendering in different layers
  const { terrainPieces, propPieces } = useMemo(() => {
    const terrain: PlacedPiece[] = [];
    const props: PlacedPiece[] = [];
    for (const placed of visiblePieces) {
      const piece = allPieces.find((p) => p.id === placed.pieceId);
      if (piece?.pieceType === 'prop') {
        props.push(placed);
      } else {
        terrain.push(placed);
      }
    }
    return { terrainPieces: terrain, propPieces: props };
  }, [visiblePieces, allPieces]);

  // Reference level pieces (other levels shown as guides)
  const referencePieces = useMemo(() => {
    if (!showReferenceLevels) return [];
    return placedPieces.filter((p) => p.level !== currentLevel);
  }, [placedPieces, currentLevel, showReferenceLevels]);

  // Handle mousedown on placed piece - prepare for potential drag
  const handlePieceMouseDown = (placedId: string, e: any) => {
    e.cancelBubble = true;

    // If space is held, skip piece interactions (we're in hand/pan mode)
    if (isSpaceHeld) return;

    // If in sidebar drag mode (placing new piece), don't intercept - let the piece be placed
    if (isSidebarDragging) {
      return;
    }

    // If in placement mode, exit it first
    if (isPlacementMode) {
      exitPlacementMode();
      setDragPreview((prev) => ({ ...prev, visible: false }));
    }

    // Clear sidebar piece selection to avoid accidental duplicates
    if (selectedPieceId && !mapDragPiece) {
      setSelectedPieceId(null);
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
    if (!placed) {
      return;
    }

    const piece = allPieces.find((p) => p.id === placed.pieceId);
    if (!piece) {
      return;
    }

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

    // For sidebar drag, use currentRotationRef (sync) to avoid race conditions with R key
    const rotation = currentRotationRef.current ?? selectedPiece.defaultRotation ?? 0;

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

    const hasCollision = checkCollision(snappedX, snappedY, effectiveWidth, effectiveHeight, undefined, selectedPiece.isDiagonal, rotation, selectedPiece.pieceType === 'prop');

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
      isProp: selectedPiece.pieceType === 'prop',
      propEmoji: selectedPiece.propEmoji,
      propImage: selectedPiece.propImage,
      // Store original dimensions for diagonal piece rendering
      originalWidth: selectedPiece.isDiagonal ? selectedPiece.size.width : undefined,
      originalHeight: selectedPiece.isDiagonal ? selectedPiece.size.height : undefined,
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

    // Only process if this was actually a sidebar drag
    if (!isDraggingFromSidebar) {
      return;
    }

    // Use the ref to get the latest preview position
    const currentPreview = dragPreviewRef.current;

    setDragPreview((prev) => ({ ...prev, visible: false }));
    setIsDraggingFromSidebar(false);

    // Don't place if there's a collision
    if (currentPreview.hasCollision) {
      return;
    }

    if (!selectedPiece) {
      return;
    }

    // Always use the preview position and rotation (already snapped)
    onDrop(currentPreview.x, currentPreview.y, currentPreview.rotation);
  };

  // Handle mouse move for sidebar drag, placement mode, map drag, selection rect, multi-drag, AND panning
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Delegate to navigation hook first (space+drag and right-click panning)
    if (handleNavigationMouseMove(e)) return;

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
          const beforeX = newX;
          const beforeY = newY;
          newX = Math.round(newX / gridConfig.cellSize) * gridConfig.cellSize;
          newY = Math.round(newY / gridConfig.cellSize) * gridConfig.cellSize;
          console.log('[MULTI-DRAG] Grid snap:', {
            cellSize: gridConfig.cellSize,
            before: { x: beforeX.toFixed(2), y: beforeY.toFixed(2) },
            after: { x: newX.toFixed(2), y: newY.toFixed(2) },
          });
        }

        // Clamp to map bounds
        const piece = allPieces.find((ap) => ap.id === p.pieceId);
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

    // For map drag, preserve the piece's rotation; for sidebar/placement, use currentRotationRef (sync)
    const rotation = mapDragPiece?.rotation ?? currentRotationRef.current ?? selectedPiece.defaultRotation ?? 0;

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
    const hasCollision = checkCollision(snappedX, snappedY, effectiveWidth, effectiveHeight, excludeId, selectedPiece.isDiagonal, rotation, selectedPiece.pieceType === 'prop');
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
      isProp: selectedPiece.pieceType === 'prop',
      propEmoji: selectedPiece.propEmoji,
      propImage: selectedPiece.propImage,
      // Store original dimensions for diagonal piece rendering
      originalWidth: selectedPiece.isDiagonal ? selectedPiece.size.width : undefined,
      originalHeight: selectedPiece.isDiagonal ? selectedPiece.size.height : undefined,
    };

    // Update both ref and state
    dragPreviewRef.current = newPreview;
    setDragPreview(newPreview);
  };

  // Handle mouse up to place piece from sidebar drag or map drag
  // KEY INSIGHT: The preview is ALWAYS accurate, so we just use its position directly
  const handleMouseUp = (e: React.MouseEvent) => {
    // Delegate to navigation hook first (space+drag / right-click pan end)
    if (handleNavigationMouseUp()) return;

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

          const piece = allPieces.find((p) => p.id === placed.pieceId);
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
      } else {
        // Rect was just a click (too small) — deselect everything
        clearSelection();
      }

      setSelectionRect(null);
      return;
    }

    // Handle multi-drag finalization
    if (multiDragState) {
      // Record the move for undo/redo - compare original positions with current positions
      const moves = multiDragState.pieces
        .map((p) => {
          const currentPiece = placedPieces.find((pp) => pp.id === p.id);
          if (currentPiece && (currentPiece.x !== p.originalX || currentPiece.y !== p.originalY)) {
            return {
              id: p.id,
              from: { x: p.originalX, y: p.originalY },
              to: { x: currentPiece.x, y: currentPiece.y },
            };
          }
          return null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (moves.length > 0) {
        recordMovePieces(moves);
      }

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
      const originalX = mapDragPiece.originalX;
      const originalY = mapDragPiece.originalY;
      setMapDragPiece(null);
      setDraggingPieceId(null);
      setSelectedPieceId(null);

      // If collision or preview not visible, keep piece at original position (do nothing)
      if (preview.hasCollision || !preview.visible) {
        // Piece stays where it was - no update needed
        return;
      }

      // Only record move if position actually changed
      if (preview.x !== originalX || preview.y !== originalY) {
        recordMovePiece(pieceId, { x: originalX, y: originalY }, { x: preview.x, y: preview.y });
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
    if (!isSidebarDragging || !selectedPiece) {
      return;
    }

    setDragPreview((prev) => ({ ...prev, visible: false }));

    // Don't place if there's a collision or preview not visible
    if (preview.hasCollision || !preview.visible) {
      endSidebarDrag();
      return;
    }

    // Use the preview position directly - it's always correct!
    // Call onDrop BEFORE endSidebarDrag because onDrop needs selectedPieceId
    onDrop(preview.x, preview.y, preview.rotation);
    endSidebarDrag();
  };

  // Handle mouse leave to hide preview and cancel map drag
  const handleMouseLeave = () => {
    // Stop navigation panning
    handleNavigationMouseLeave();
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
      // Cancel the drag - piece was never removed, just hidden
      // Simply unhide it by clearing draggingPieceId
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
    if (!isBackground) {
      return;
    }

    // Use the ref to get the latest preview position
    const currentPreview = dragPreviewRef.current;

    // If in placement mode, place the piece (only if preview is visible and valid)
    if (isPlacementMode && selectedPiece && currentPreview.visible && !currentPreview.hasCollision) {
      onDrop(currentPreview.x, currentPreview.y, currentPreview.rotation);
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

    // Delegate to navigation hook (space+drag, right-click pan)
    if (e.evt && handleNavigationMouseDown(e.evt)) {
      return;
    }

    // Left click (button 0): start selection rectangle on background
    // BUT NOT if we're in sidebar drag mode or placement mode (we want to place pieces instead)
    if (mouseButton === 0 && isBackground) {
      // Don't start selection if in sidebar drag mode or placement mode - these modes use clicks to place
      if (isSidebarDragging || isPlacementMode) {
        return;
      }
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
      className={`flex-1 h-full min-h-0 overflow-hidden bg-gray-900 relative ${navCursorClass}`}
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
            // Note: onClick removed - Stage handles clicks to prevent double-firing
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
              {dragPreview.isProp ? (
                // Prop preview - circular with emoji or image
                <>
                  <Circle
                    x={dragPreview.width * pixelsPerInch / 2}
                    y={dragPreview.height * pixelsPerInch / 2}
                    radius={Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch / 2}
                    fill={dragPreview.hasCollision ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                    stroke={dragPreview.hasCollision ? '#ef4444' : '#3b82f6'}
                    strokeWidth={2}
                    dash={[6, 3]}
                  />
                  {dragPreview.propImage ? (
                    <PropImage
                      src={dragPreview.propImage}
                      x={(dragPreview.width * pixelsPerInch - Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch * 0.8) / 2}
                      y={(dragPreview.height * pixelsPerInch - Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch * 0.8) / 2}
                      width={Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch * 0.8}
                      height={Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch * 0.8}
                      opacity={dragPreview.hasCollision ? 0.5 : 1}
                    />
                  ) : (
                    <Text
                      text={dragPreview.propEmoji || '?'}
                      x={0}
                      y={0}
                      width={dragPreview.width * pixelsPerInch}
                      height={dragPreview.height * pixelsPerInch}
                      align="center"
                      verticalAlign="middle"
                      fontSize={Math.min(dragPreview.width, dragPreview.height) * pixelsPerInch * 0.6}
                      opacity={dragPreview.hasCollision ? 0.5 : 1}
                    />
                  )}
                </>
              ) : dragPreview.isDiagonal ? (
                (() => {
                  // Use original dimensions for the triangle shape, effective dimensions for positioning
                  const origW = (dragPreview.originalWidth ?? dragPreview.width) * pixelsPerInch;
                  const origH = (dragPreview.originalHeight ?? dragPreview.height) * pixelsPerInch;
                  return (
                    <Group
                      offsetX={origW / 2}
                      offsetY={origH / 2}
                      x={dragPreview.width * pixelsPerInch / 2}
                      y={dragPreview.height * pixelsPerInch / 2}
                      rotation={dragPreview.rotation}
                    >
                      <Line
                        points={[
                          0, 0,
                          origW, 0,
                          0, origH,
                        ]}
                        closed
                        fill={getPreviewColor()}
                        opacity={dragPreview.hasCollision ? 0.5 : 0.4}
                        stroke="#fff"
                        strokeWidth={2}
                        dash={[8, 4]}
                      />
                    </Group>
                  );
                })()
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
              {/* Size label - only for terrain, not props */}
              {!dragPreview.isProp && (
                <Text
                  x={4}
                  y={4}
                  text={dragPreview.label}
                  fontSize={11}
                  fill="#fff"
                  fontStyle="bold"
                  opacity={0.9}
                />
              )}
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
          {/* Reference pieces (other levels shown as guides, rendered first/behind) */}
          {referencePieces.map((placed) => {
            const piece = allPieces.find((p) => p.id === placed.pieceId);
            if (!piece) return null;

            const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
            const isRotated = placed.rotation === 90 || placed.rotation === 270;
            const effectiveWidth = (isRotated ? piece.size.height : piece.size.width) * pixelsPerInch;
            const effectiveHeight = (isRotated ? piece.size.width : piece.size.height) * pixelsPerInch;
            const pieceWidth = piece.size.width * pixelsPerInch;
            const pieceHeight = piece.size.height * pixelsPerInch;
            const baseColor = terrain?.color || '#666';
            const refColor = desaturateColor(baseColor, 0.5);
            const levelLabel = placed.level === 0 ? 'G' : placed.level > 0 ? `${placed.level}` : `B${Math.abs(placed.level)}`;

            return (
              <Group
                key={`ref-${placed.id}`}
                x={placed.x * pixelsPerInch + effectiveWidth / 2}
                y={placed.y * pixelsPerInch + effectiveHeight / 2}
                offsetX={pieceWidth / 2}
                offsetY={pieceHeight / 2}
                rotation={placed.rotation}
                opacity={referenceLevelOpacity}
                listening={false}
              >
                {piece.isDiagonal ? (
                  <Line
                    points={[0, 0, pieceWidth, 0, 0, pieceHeight]}
                    closed
                    fill={refColor}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                    dash={[4, 4]}
                  />
                ) : (piece.isCustom || piece.isVariant) && piece.cellColors && piece.cellColors.length > 0 ? (
                  <>
                    {(() => {
                      const { rows, cols } = getGridDimensions(piece.size.width, piece.size.height);
                      const cellWidth = pieceWidth / cols;
                      const cellHeight = pieceHeight / rows;
                      return piece.cellColors.map((row, rowIdx) =>
                        row.map((terrainId, colIdx) => {
                          const cellTerrain = terrainTypes.find((t) => t.id === terrainId);
                          const cellColor = desaturateColor(cellTerrain?.color || '#666', 0.5);
                          return (
                            <Rect
                              key={`${rowIdx}-${colIdx}`}
                              x={colIdx * cellWidth}
                              y={rowIdx * cellHeight}
                              width={cellWidth}
                              height={cellHeight}
                              fill={cellColor}
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={0.5}
                              dash={[2, 2]}
                            />
                          );
                        })
                      );
                    })()}
                  </>
                ) : (
                  <Rect
                    width={pieceWidth}
                    height={pieceHeight}
                    fill={refColor}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                    cornerRadius={2}
                    dash={[4, 4]}
                  />
                )}
                {/* Level badge */}
                <Text
                  text={levelLabel}
                  x={2}
                  y={2}
                  fontSize={10}
                  fill="#fff"
                  fontStyle="bold"
                />
              </Group>
            );
          })}

          {/* Current level terrain pieces */}
          {terrainPieces.map((placed) => {
            const piece = allPieces.find((p) => p.id === placed.pieceId);
            if (!piece) return null;

            // Control interactivity based on edit mode (terrain pieces interactive in terrain mode)
            const isInteractive = editMode === 'terrain';

            // Look up by id (UUID) or slug for backward compatibility
            const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
            // Calculate effective dimensions based on rotation (for positioning)
            const isRotated = placed.rotation === 90 || placed.rotation === 270;
            const effectiveWidth = (isRotated ? piece.size.height : piece.size.width) * pixelsPerInch;
            const effectiveHeight = (isRotated ? piece.size.width : piece.size.height) * pixelsPerInch;
            // Original dimensions (for drawing the shape inside the group)
            const pieceWidth = piece.size.width * pixelsPerInch;
            const pieceHeight = piece.size.height * pixelsPerInch;
            const isDragging = draggingPieceId === placed.id;
            const isSelected = selectedSet.has(placed.id);

            // Terrain piece rendering
            return (
              <Group
                key={placed.id}
                // Position using EFFECTIVE dimensions (matches drag/drop system)
                x={placed.x * pixelsPerInch + effectiveWidth / 2}
                y={placed.y * pixelsPerInch + effectiveHeight / 2}
                // Offset using ORIGINAL dimensions (rotation pivot at shape center)
                offsetX={pieceWidth / 2}
                offsetY={pieceHeight / 2}
                listening={isInteractive}
                onMouseDown={isInteractive ? (e) => handlePieceMouseDown(placed.id, e) : undefined}
                onDblClick={isInteractive ? () => handleDeletePiece(placed.id) : undefined}
                onClick={isInteractive ? (e) => handlePieceClick(placed.id, e) : undefined}
                rotation={placed.rotation}
                opacity={isDragging ? 0 : (isInteractive ? 1 : 0.75)}
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
                      <Group x={0} y={0} name="elevation-indicator">
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
                      <Group x={pieceWidth} y={0} name="elevation-indicator">
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
                      <Group x={0} y={pieceHeight} name="elevation-indicator">
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
                      <Group x={pieceWidth} y={pieceHeight} name="elevation-indicator">
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

        {/* Props Layer - rendered on top of terrain */}
        <Layer>
          {propPieces.map((placed) => {
            const piece = allPieces.find((p) => p.id === placed.pieceId);
            if (!piece) return null;

            // Control interactivity based on edit mode (props interactive in props mode)
            const isInteractive = editMode === 'props';

            // Calculate effective dimensions based on rotation (for positioning)
            const isRotated = placed.rotation === 90 || placed.rotation === 270;
            const effectiveWidth = (isRotated ? piece.size.height : piece.size.width) * pixelsPerInch;
            const effectiveHeight = (isRotated ? piece.size.width : piece.size.height) * pixelsPerInch;
            // Original dimensions (for drawing the shape inside the group)
            const pieceWidth = piece.size.width * pixelsPerInch;
            const pieceHeight = piece.size.height * pixelsPerInch;
            const isDragging = draggingPieceId === placed.id;
            const isSelected = selectedSet.has(placed.id);

            const propRadius = Math.min(pieceWidth, pieceHeight) / 2;
            const emojiSize = propRadius * 1.2;

            return (
              <Group
                key={placed.id}
                x={placed.x * pixelsPerInch + effectiveWidth / 2}
                y={placed.y * pixelsPerInch + effectiveHeight / 2}
                offsetX={pieceWidth / 2}
                offsetY={pieceHeight / 2}
                listening={isInteractive}
                onMouseDown={isInteractive ? (e) => handlePieceMouseDown(placed.id, e) : undefined}
                onDblClick={isInteractive ? () => handleDeletePiece(placed.id) : undefined}
                onClick={isInteractive ? (e) => handlePieceClick(placed.id, e) : undefined}
                rotation={placed.rotation}
                opacity={isDragging ? 0 : (isInteractive ? 1 : 0.75)}
                visible={!isDragging}
              >
                {/* Circular background - subtle transparent instead of bright white */}
                <Circle
                  x={pieceWidth / 2}
                  y={pieceHeight / 2}
                  radius={propRadius}
                  fill="rgba(240, 240, 240, 0.6)"
                  stroke={isSelected ? '#3b82f6' : 'rgba(100, 100, 100, 0.8)'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  shadowColor="black"
                  shadowBlur={3}
                  shadowOpacity={0.2}
                />
                {/* Emoji or Image */}
                {piece.propImage ? (
                  <PropImage
                    src={piece.propImage}
                    x={(pieceWidth - propRadius * 1.6) / 2}
                    y={(pieceHeight - propRadius * 1.6) / 2}
                    width={propRadius * 1.6}
                    height={propRadius * 1.6}
                  />
                ) : (
                  <Text
                    text={piece.propEmoji || '?'}
                    x={0}
                    y={0}
                    width={pieceWidth}
                    height={pieceHeight}
                    align="center"
                    verticalAlign="middle"
                    fontSize={emojiSize}
                  />
                )}
                {/* Rotate button - appears when selected */}
                {isSelected && (
                  <Group
                    x={pieceWidth / 2}
                    y={-12}
                    onClick={(e) => {
                      e.cancelBubble = true;
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

      {/* Help button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 bg-gray-800/80 hover:bg-gray-700 border-gray-600 z-50"
        onClick={() => setShowHelpDialog(true)}
      >
        <Info className="h-4 w-4" />
      </Button>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <div className="font-medium text-gray-400">Navigation</div>
              <div className="text-white"></div>

              <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Scroll / Trackpad</div>
              <div className="text-gray-300 flex items-center">Pan the map</div>

              <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Pinch / Ctrl+Scroll</div>
              <div className="text-gray-300 flex items-center">Zoom to cursor</div>

              <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Right Drag</div>
              <div className="text-gray-300 flex items-center">Pan the map</div>

              <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Space + Drag</div>
              <div className="text-gray-300 flex items-center">Pan the map (hand tool)</div>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="font-medium text-gray-400">Mouse</div>
                <div className="text-white"></div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Left Click</div>
                <div className="text-gray-300 flex items-center">Select piece</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Left Drag</div>
                <div className="text-gray-300 flex items-center">Selection rectangle / Move piece</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Shift+Click</div>
                <div className="text-gray-300 flex items-center">Add to selection</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs">Double Click</div>
                <div className="text-gray-300 flex items-center">Delete piece</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="font-medium text-gray-400">Keyboard</div>
                <div className="text-white"></div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">R</div>
                <div className="text-gray-300 flex items-center">Rotate piece (selected or while dragging)</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">T</div>
                <div className="text-gray-300 flex items-center">Quick piece selector (radial menu)</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">V</div>
                <div className="text-gray-300 flex items-center">Toggle 2D / 3D view</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">F</div>
                <div className="text-gray-300 flex items-center">Focus view (selection or map center)</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">Delete</div>
                <div className="text-gray-300 flex items-center">Delete selected pieces</div>

                <div className="bg-gray-700 px-2 py-1 rounded text-center text-xs font-mono">Escape</div>
                <div className="text-gray-300 flex items-center">Cancel / Deselect</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        Scroll: Pan | Pinch/Ctrl+Scroll: Zoom | Space+Drag: Pan | R: Rotate | F: Focus
      </div>
    </div>
  );
}
