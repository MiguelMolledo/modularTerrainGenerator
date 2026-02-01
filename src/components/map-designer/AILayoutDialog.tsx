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
  Layout,
  AlertCircle,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useAPIKeysStore } from '@/store/apiKeysStore';

interface AILayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlacementSuggestion {
  pieceId: string;
  x: number;
  y: number;
  rotation: number;
}

type LayoutStatus = 'idle' | 'generating' | 'success' | 'error';

// Example scene prompts
const EXAMPLE_PROMPTS = [
  'A forest clearing with a stream running through it',
  'A rocky canyon with elevated terrain on both sides',
  'A coastal area with beach transitioning to forest',
  'A mountain pass with narrow pathways',
  'A swamp with scattered dry land islands',
];

export function AILayoutDialog({ open, onOpenChange }: AILayoutDialogProps) {
  const {
    mapWidth,
    mapHeight,
    availablePieces,
    placedPieces,
    addPlacedPiece,
    currentLevel,
  } = useMapStore();

  // Local state
  const [sceneDescription, setSceneDescription] = useState('');
  const [status, setStatus] = useState<LayoutStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacementSuggestion[]>([]);
  const [layoutDescription, setLayoutDescription] = useState('');

  // Calculate available pieces with remaining quantities
  const availablePiecesWithQuantity = useMemo(() => {
    // Only terrain pieces, not props
    const terrainPieces = availablePieces.filter((p) => p.pieceType !== 'prop');

    // Count how many of each piece are already placed
    const usedCounts = new Map<string, number>();
    placedPieces.forEach((placed) => {
      const count = usedCounts.get(placed.pieceId) || 0;
      usedCounts.set(placed.pieceId, count + 1);
    });

    return terrainPieces
      .map((piece) => {
        const used = usedCounts.get(piece.id) || 0;
        const available = piece.quantity - used;
        return {
          id: piece.id,
          name: piece.name,
          terrainType: piece.terrainTypeId,
          width: piece.size.width,
          height: piece.size.height,
          isDiagonal: piece.isDiagonal,
          available: Math.max(0, available),
        };
      })
      .filter((p) => p.available > 0);
  }, [availablePieces, placedPieces]);

  // Reset state
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setSuggestions([]);
    setLayoutDescription('');
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSceneDescription('');
      resetState();
    }, 200);
  };

  // Generate layout suggestions
  const handleGenerate = async () => {
    if (!sceneDescription.trim()) {
      setError('Please describe the scene you want to create');
      return;
    }

    if (availablePiecesWithQuantity.length === 0) {
      setError('No terrain pieces available. Add pieces to your inventory first.');
      return;
    }

    setStatus('generating');
    setError(null);
    setSuggestions([]);
    setLayoutDescription('');

    try {
      const { openRouterKey } = useAPIKeysStore.getState();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/llm/suggest-layout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sceneDescription: sceneDescription.trim(),
          mapWidth,
          mapHeight,
          availablePieces: availablePiecesWithQuantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate layout');
      }

      setSuggestions(data.placements || []);
      setLayoutDescription(data.description || '');
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setStatus('error');
    }
  };

  // Apply suggestions to the map
  const handleApply = () => {
    suggestions.forEach((suggestion) => {
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

  // Use example prompt
  const useExample = (prompt: string) => {
    setSceneDescription(prompt);
  };

  const isGenerating = status === 'generating';
  const hasResults = status === 'success' && suggestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-green-400" />
            AI Layout Suggestions
          </DialogTitle>
          <DialogDescription>
            Describe a scene and get terrain placement suggestions based on your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Map Info */}
          <div className="text-sm text-gray-400 flex gap-4">
            <span>Map: {mapWidth}" x {mapHeight}"</span>
            <span>Available pieces: {availablePiecesWithQuantity.length} types</span>
          </div>

          {/* Scene Description Input */}
          {!hasResults && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">
                  Describe the Scene
                </label>
                <textarea
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="Describe the battle map scene you want to create...

Example: A forest clearing with a small river running through it, some elevated rocky terrain on the north side, and dense trees to the east and west."
                  disabled={isGenerating}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:opacity-50"
                />
              </div>

              {/* Example Prompts */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">
                  Quick examples:
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => useExample(prompt)}
                      disabled={isGenerating}
                      className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      {prompt.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Results Section */}
          {hasResults && (
            <div className="space-y-4">
              {/* Layout Description */}
              {layoutDescription && (
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                  <p className="text-sm text-green-200">{layoutDescription}</p>
                </div>
              )}

              {/* Suggestions Summary */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  {suggestions.length} pieces will be placed
                </h4>

                {/* Group by terrain type for display */}
                <div className="space-y-2 text-sm">
                  {(() => {
                    const grouped = new Map<string, number>();
                    suggestions.forEach((s) => {
                      const piece = availablePieces.find((p) => p.id === s.pieceId);
                      if (piece) {
                        const key = piece.name;
                        grouped.set(key, (grouped.get(key) || 0) + 1);
                      }
                    });

                    return Array.from(grouped.entries()).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-gray-300">
                        <span>{name}</span>
                        <span className="text-gray-500">x{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Regenerate Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="text-gray-400"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Generate different layout
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* No Pieces Warning */}
          {availablePiecesWithQuantity.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                No terrain pieces available. Add pieces to your inventory or remove some from the map.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {hasResults ? (
            <Button
              onClick={handleApply}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Layout
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!sceneDescription.trim() || isGenerating || availablePiecesWithQuantity.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Layout
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
