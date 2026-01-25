'use client';

import React from 'react';
import { useMapStore } from '@/store/mapStore';
import { Sidebar } from './Sidebar';
import { MapCanvas } from './MapCanvas';
import { Toolbar } from './Toolbar';
import { PiecesSummaryPanel } from './PiecesSummaryPanel';
import { RadialMenu } from './RadialMenu';
import { v4 as uuidv4 } from 'uuid';

export function MapDesigner() {
  const {
    selectedPieceId,
    currentLevel,
    addPlacedPiece,
    availablePieces,
    placedPieces,
    setCurrentRotation,
  } = useMapStore();

  const handleDrop = (x: number, y: number, rotation: number) => {
    if (!selectedPieceId) return;

    const piece = availablePieces.find((p) => p.id === selectedPieceId);
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
      <Toolbar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <div className="flex-1 relative overflow-hidden min-h-0 h-full">
          <MapCanvas onDrop={handleDrop} />
          <PiecesSummaryPanel />
        </div>
      </div>
      <RadialMenu />
    </div>
  );
}
