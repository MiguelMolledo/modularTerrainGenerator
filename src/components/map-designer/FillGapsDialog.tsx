'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  PaintBucket,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

interface FillGapsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlacementSuggestion {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
}

type FillStatus = 'idle' | 'filling' | 'success' | 'error';

export function FillGapsDialog({ open, onOpenChange }: FillGapsDialogProps) {
  const {
    mapWidth,
    mapHeight,
    availablePieces,
    placedPieces,
    addPlacedPiece,
    currentLevel,
  } = useMapStore();

  const [selectedTerrain, setSelectedTerrain] = useState<string>('');
  const [status, setStatus] = useState<FillStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ placements: PlacementSuggestion[]; filledArea: number } | null>(null);

  // Get unique terrain types that have flat pieces
  const terrainOptions = useMemo(() => {
    const terrainPieces = availablePieces.filter(
      (p) => p.pieceType !== 'prop' && !p.isDiagonal
    );

    const terrainMap = new Map<string, { name: string; color: string; count: number }>();

    terrainPieces.forEach((piece) => {
      const terrain = piece.terrainTypeId;
      if (!terrainMap.has(terrain)) {
        terrainMap.set(terrain, {
          name: terrain.charAt(0).toUpperCase() + terrain.slice(1),
          color: '#666',
          count: 0,
        });
      }
      terrainMap.get(terrain)!.count++;
    });

    return Array.from(terrainMap.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  }, [availablePieces]);

  // Calculate current placed pieces with their dimensions
  const placedPiecesWithDimensions = useMemo(() => {
    return placedPieces
      .filter((p) => p.level === currentLevel)
      .map((placed) => {
        const piece = availablePieces.find((p) => p.id === placed.pieceId);
        if (!piece) return null;

        const isRotated = placed.rotation === 90 || placed.rotation === 270;
        return {
          pieceId: placed.pieceId,
          x: placed.x,
          y: placed.y,
          rotation: placed.rotation,
          width: isRotated ? piece.size.height : piece.size.width,
          height: isRotated ? piece.size.width : piece.size.height,
        };
      })
      .filter(Boolean);
  }, [placedPieces, availablePieces, currentLevel]);

  // Reset state
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedTerrain('');
      resetState();
    }, 200);
  };

  // Fill gaps
  const handleFill = async () => {
    if (!selectedTerrain) {
      setError('Please select a terrain type');
      return;
    }

    setStatus('filling');
    setError(null);
    setResult(null);

    try {
      const terrainPieces = availablePieces
        .filter((p) => p.pieceType !== 'prop')
        .map((piece) => ({
          id: piece.id,
          name: piece.name,
          terrainType: piece.terrainTypeId,
          width: piece.size.width,
          height: piece.size.height,
          isDiagonal: piece.isDiagonal,
          elevation: piece.elevation || { nw: 0, ne: 0, sw: 0, se: 0 },
        }));

      const response = await fetch('/api/fill-gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mapWidth,
          mapHeight,
          availablePieces: terrainPieces,
          placedPieces: placedPiecesWithDimensions,
          terrainType: selectedTerrain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fill gaps');
      }

      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setStatus('error');
    }
  };

  // Apply placements
  const handleApply = () => {
    if (!result) return;

    result.placements.forEach((suggestion) => {
      const piece = availablePieces.find((p) => p.id === suggestion.pieceId);
      if (piece) {
        addPlacedPiece({
          id: `placed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          pieceId: suggestion.pieceId,
          x: suggestion.x,
          y: suggestion.y,
          rotation: suggestion.rotation,
          level: currentLevel,
        });
      }
    });

    handleClose();
  };

  const isFilling = status === 'filling';
  const hasResults = status === 'success' && result && result.placements.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PaintBucket className="h-5 w-5 text-primary" />
            Fill Empty Spaces
          </DialogTitle>
          <DialogDescription>
            Fill all empty areas on the map with the selected terrain type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Map Info */}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>Map: {mapWidth}" x {mapHeight}"</span>
            <span>Placed: {placedPiecesWithDimensions.length} pieces</span>
          </div>

          {/* Terrain Selection */}
          {!hasResults && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Select Terrain Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {terrainOptions.map((terrain) => (
                  <button
                    key={terrain.id}
                    onClick={() => setSelectedTerrain(terrain.id)}
                    disabled={isFilling}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedTerrain === terrain.id
                        ? 'border-primary bg-primary/20 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-border'
                    } disabled:opacity-50`}
                  >
                    <div className="font-medium">{terrain.name}</div>
                    <div className="text-xs text-muted-foreground">{terrain.count} piece types</div>
                  </button>
                ))}
              </div>

              {terrainOptions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No terrain pieces available in inventory
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {hasResults && result && (
            <div className="bg-card rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                {result.placements.length} pieces will be placed
              </h4>
              <p className="text-sm text-muted-foreground">
                Filling approximately {result.filledArea} square inches
              </p>

              {/* Group by piece type */}
              <div className="mt-3 space-y-1 text-sm">
                {(() => {
                  const grouped = new Map<string, number>();
                  result.placements.forEach((s) => {
                    const piece = availablePieces.find((p) => p.id === s.pieceId);
                    if (piece) {
                      const key = piece.name;
                      grouped.set(key, (grouped.get(key) || 0) + 1);
                    }
                  });

                  return Array.from(grouped.entries())
                    .slice(0, 5)
                    .map(([name, count]) => (
                      <div key={name} className="flex justify-between text-foreground">
                        <span>{name}</span>
                        <span className="text-muted-foreground">x{count}</span>
                      </div>
                    ));
                })()}
                {result.placements.length > 5 && (
                  <div className="text-muted-foreground text-xs">
                    ... and more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive rounded-lg text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {hasResults ? (
            <Button
              onClick={handleApply}
              className="bg-primary hover:bg-primary/80"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply
            </Button>
          ) : (
            <Button
              onClick={handleFill}
              disabled={!selectedTerrain || isFilling || terrainOptions.length === 0}
              className="bg-primary hover:bg-primary/80"
            >
              {isFilling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Filling...
                </>
              ) : (
                <>
                  <PaintBucket className="h-4 w-4 mr-2" />
                  Fill Gaps
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
