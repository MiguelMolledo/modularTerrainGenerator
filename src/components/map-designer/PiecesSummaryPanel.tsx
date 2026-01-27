'use client';

import React, { useState, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PiecesSummaryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { placedPieces, availablePieces, terrainTypes } = useMapStore();
  const { shapes, terrainTypes: inventoryTerrainTypes } = useInventoryStore();

  const getTotalUsed = (pieceId: string) => {
    return placedPieces.filter((p) => p.pieceId === pieceId).length;
  };

  // Helper to find shape for a piece
  const findShapeForPiece = (piece: typeof availablePieces[0]) => {
    if (piece.isCustom) return null;

    if (piece.isVariant && piece.variantId) {
      for (const terrain of inventoryTerrainTypes) {
        const variant = terrain.variants?.find((v) => v.id === piece.variantId);
        if (variant?.shapeId) {
          return shapes.find((s) => s.id === variant.shapeId);
        }
      }
    } else {
      const pieceIdParts = piece.id.split('-');
      const shapeKey = pieceIdParts.slice(1).join('-');
      return shapes.find((s) => s.shapeKey === shapeKey);
    }
    return null;
  };

  // Calculate magnets for pieces ON the map
  const magnetSummary = useMemo(() => {
    const magnetTotals = new Map<string, number>();

    for (const placedPiece of placedPieces) {
      const piece = availablePieces.find((p) => p.id === placedPiece.pieceId);
      if (!piece) continue;

      const shape = findShapeForPiece(piece);
      if (shape?.magnets) {
        for (const magnet of shape.magnets) {
          const current = magnetTotals.get(magnet.size) || 0;
          magnetTotals.set(magnet.size, current + magnet.quantity);
        }
      }
    }

    return Array.from(magnetTotals.entries())
      .map(([size, quantity]) => ({ size, quantity }))
      .sort((a, b) => a.size.localeCompare(b.size));
  }, [placedPieces, availablePieces, shapes, inventoryTerrainTypes]);

  // Calculate magnets needed for pieces TO BUILD (shortfall)
  const magnetsNeeded = useMemo(() => {
    const magnetTotals = new Map<string, number>();

    // Group placed pieces by pieceId and count
    const usedCounts = new Map<string, number>();
    for (const placed of placedPieces) {
      usedCounts.set(placed.pieceId, (usedCounts.get(placed.pieceId) || 0) + 1);
    }

    // For each piece type, calculate magnets for shortfall
    for (const [pieceId, usedCount] of usedCounts) {
      const piece = availablePieces.find((p) => p.id === pieceId);
      if (!piece) continue;

      const shortfall = usedCount - piece.quantity;
      if (shortfall <= 0) continue; // No shortfall

      const shape = findShapeForPiece(piece);
      if (shape?.magnets) {
        for (const magnet of shape.magnets) {
          const current = magnetTotals.get(magnet.size) || 0;
          magnetTotals.set(magnet.size, current + (magnet.quantity * shortfall));
        }
      }
    }

    return Array.from(magnetTotals.entries())
      .map(([size, quantity]) => ({ size, quantity }))
      .sort((a, b) => a.size.localeCompare(b.size));
  }, [placedPieces, availablePieces, shapes, inventoryTerrainTypes]);

  const totalMagnets = magnetSummary.reduce((sum, m) => sum + m.quantity, 0);
  const totalMagnetsNeeded = magnetsNeeded.reduce((sum, m) => sum + m.quantity, 0);

  // Get pieces that have been used
  const usedPieces = availablePieces
    .map((piece) => {
      const used = getTotalUsed(piece.id);
      if (used === 0) return null;
      const remaining = piece.quantity - used;
      const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId);
      return { piece, used, remaining, terrain };
    })
    .filter(Boolean) as Array<{
      piece: typeof availablePieces[0];
      used: number;
      remaining: number;
      terrain: typeof terrainTypes[0] | undefined;
    }>;

  const totalPieces = placedPieces.length;
  const overusedCount = usedPieces.filter((p) => p.remaining < 0).length;

  return (
    <div
      className={`absolute right-0 top-0 h-full flex transition-transform duration-300 ease-in-out z-20 ${
        isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-2.5rem)]'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-24 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg flex items-center justify-center self-center transition-colors"
        title={isOpen ? 'Hide summary' : 'Show summary'}
      >
        <div className="flex flex-col items-center gap-1">
          {isOpen ? (
            <ChevronRight className="w-5 h-5 text-gray-300" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          )}
          {totalPieces > 0 && (
            <span
              className={`text-xs font-bold ${
                overusedCount > 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {totalPieces}
            </span>
          )}
        </div>
      </button>

      {/* Panel content */}
      <div className="w-64 bg-gray-800 border-l border-gray-600 flex flex-col h-full">
        <div className="p-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Pieces Summary</h2>
          <p className="text-xs text-gray-400">
            {totalPieces} pieces on map
            {overusedCount > 0 && (
              <span className="text-red-400 ml-2">({overusedCount} overused)</span>
            )}
          </p>
        </div>

        {usedPieces.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
            No pieces placed yet.
            <br />
            Drag pieces from the left sidebar.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <div className="space-y-2">
              {usedPieces.map(({ piece, used, remaining, terrain }) => (
                <div
                  key={piece.id}
                  className={`p-2 rounded border ${
                    remaining < 0
                      ? 'border-red-500/50 bg-red-950/30'
                      : 'border-gray-700 bg-gray-900/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: terrain?.color }}>
                          {terrain?.icon}
                        </span>
                        <span className="text-sm text-white truncate">
                          {piece.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {piece.size.label}
                        {piece.isDiagonal && ' (Diagonal)'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm">
                        <span className="text-white font-medium">{used}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="text-gray-400">{piece.quantity}</span>
                      </div>
                      {remaining < 0 && (
                        <span className="text-xs text-red-400 font-bold">
                          Need {Math.abs(remaining)} more
                        </span>
                      )}
                      {/* Show magnets needed for this piece type */}
                      {(() => {
                        // Find shape for this piece
                        let pieceMagnets = 0;
                        if (!piece.isCustom) {
                          let shape = null;
                          if (piece.isVariant && piece.variantId) {
                            for (const t of inventoryTerrainTypes) {
                              const variant = t.variants?.find((v) => v.id === piece.variantId);
                              if (variant?.shapeId) {
                                shape = shapes.find((s) => s.id === variant.shapeId);
                                break;
                              }
                            }
                          } else {
                            const pieceIdParts = piece.id.split('-');
                            const shapeKey = pieceIdParts.slice(1).join('-');
                            shape = shapes.find((s) => s.shapeKey === shapeKey);
                          }
                          if (shape?.magnets) {
                            pieceMagnets = shape.magnets.reduce((sum, m) => sum + m.quantity, 0) * used;
                          }
                        }
                        return pieceMagnets > 0 ? (
                          <div className="text-xs text-purple-400 mt-0.5">
                            🧲 {pieceMagnets}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary footer */}
        {usedPieces.length > 0 && (
          <div className="p-3 border-t border-gray-700 bg-gray-900">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Unique piece types:</span>
                <span className="text-white">{usedPieces.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total pieces needed:</span>
                <span
                  className={
                    overusedCount > 0 ? 'text-red-400 font-bold' : 'text-white'
                  }
                >
                  {usedPieces.reduce(
                    (acc, p) => acc + Math.max(p.used, p.piece.quantity),
                    0
                  )}
                </span>
              </div>
            </div>

            {/* Magnet Summary */}
            {totalMagnets > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🧲</span>
                  <span className="text-xs font-medium text-gray-300">
                    Magnets
                  </span>
                </div>

                {/* Magnets for map */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">For map:</span>
                    <span className="text-purple-400 font-bold">{totalMagnets}</span>
                  </div>
                  {magnetSummary.map(({ size, quantity }) => (
                    <div
                      key={size}
                      className="flex justify-between text-xs pl-2"
                    >
                      <span className="text-gray-500 font-mono">{size}</span>
                      <span className="text-gray-300">{quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Magnets needed for pieces to build */}
                {totalMagnetsNeeded > 0 && (
                  <div className="space-y-1 pt-2 border-t border-gray-700/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400">To build:</span>
                      <span className="text-red-400 font-bold">{totalMagnetsNeeded}</span>
                    </div>
                    {magnetsNeeded.map(({ size, quantity }) => (
                      <div
                        key={`need-${size}`}
                        className="flex justify-between text-xs pl-2"
                      >
                        <span className="text-gray-500 font-mono">{size}</span>
                        <span className="text-red-300">{quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
