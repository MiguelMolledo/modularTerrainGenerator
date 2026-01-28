'use client';

import React, { lazy, Suspense } from 'react';
import { useMapStore } from '@/store/mapStore';
import { Sidebar } from './Sidebar';
import { MapCanvas } from './MapCanvas';
import { Toolbar } from './Toolbar';
import { PiecesSummaryPanel } from './PiecesSummaryPanel';
import { RadialMenu } from './RadialMenu';
import { PropSearchDialog } from './PropSearchDialog';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';

// Lazy load 3D viewer to reduce initial bundle
const Map3DViewer = lazy(() =>
  import('./three/Map3DViewer').then((mod) => ({ default: mod.Map3DViewer }))
);

function Loading3D() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
        <p className="text-gray-400 mt-2">Loading 3D view...</p>
      </div>
    </div>
  );
}

export function MapDesigner() {
  const {
    selectedPieceId,
    currentLevel,
    addPlacedPiece,
    availablePieces,
    customProps,
    placedPieces,
    setCurrentRotation,
    is3DMode,
    isPropSearchOpen,
    propSearchPosition,
    closePropSearch,
  } = useMapStore();

  const handleDrop = (x: number, y: number, rotation: number) => {
    if (!selectedPieceId) return;

    // Check both availablePieces and customProps for the piece
    const piece = availablePieces.find((p) => p.id === selectedPieceId)
      || customProps.find((p) => p.id === selectedPieceId);
    if (!piece) return;

    // Use defaultRotation for diagonal pieces, otherwise use the provided rotation
    const finalRotation = piece.defaultRotation !== undefined ? piece.defaultRotation : rotation;

    // Allow placing pieces even beyond available quantity (will show negative in sidebar)
    addPlacedPiece({
      id: uuidv4(),
      pieceId: selectedPieceId,
      x,
      y,
      rotation: finalRotation,
      level: currentLevel,
    });

    // Reset rotation after placing
    setCurrentRotation(0);
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col bg-gray-900">
      <UnsavedChangesGuard />
      <Toolbar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        {!is3DMode && <Sidebar />}
        <div className="flex-1 relative overflow-hidden min-h-0 h-full">
          {is3DMode ? (
            <Suspense fallback={<Loading3D />}>
              <Map3DViewer />
            </Suspense>
          ) : (
            <>
              <MapCanvas onDrop={handleDrop} />
              <PiecesSummaryPanel />
            </>
          )}
        </div>
      </div>
      {!is3DMode && <RadialMenu />}
      {!is3DMode && (
        <PropSearchDialog
          isOpen={isPropSearchOpen}
          onClose={closePropSearch}
          position={propSearchPosition}
        />
      )}
    </div>
  );
}
