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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  BookOpen,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Shield,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useAPIKeysStore } from '@/store/apiKeysStore';

interface SceneDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DescriptionStatus = 'idle' | 'generating' | 'success' | 'error';

export function SceneDescriptionDialog({ open, onOpenChange }: SceneDescriptionDialogProps) {
  const {
    mapWidth,
    mapHeight,
    placedPieces,
    terrainTypes,
    availablePieces,
    customProps,
  } = useMapStore();

  // Local state
  const [context, setContext] = useState('');
  const [status, setStatus] = useState<DescriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [readAloud, setReadAloud] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [copiedReadAloud, setCopiedReadAloud] = useState(false);
  const [copiedDmNotes, setCopiedDmNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'readAloud' | 'dmNotes'>('readAloud');

  // Compute terrain and props info from the map
  const { terrainInfo, propsInfo } = useMemo(() => {
    const allPieces = [...availablePieces, ...customProps];
    const totalMapArea = mapWidth * mapHeight;

    // Track terrain coverage
    const terrainAreas = new Map<string, { area: number; name: string; description?: string }>();
    // Track props
    const propCounts = new Map<string, { name: string; emoji: string; count: number }>();

    placedPieces.forEach((placed) => {
      const piece = allPieces.find((p) => p.id === placed.pieceId);
      if (!piece) return;

      if (piece.pieceType === 'prop') {
        const key = piece.name;
        const existing = propCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          propCounts.set(key, {
            name: piece.name,
            emoji: piece.propEmoji || '?',
            count: 1,
          });
        }
      } else {
        const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId);
        if (terrain) {
          const pieceArea = piece.size.width * piece.size.height * (piece.isDiagonal ? 0.5 : 1);
          const existing = terrainAreas.get(terrain.id);
          if (existing) {
            existing.area += pieceArea;
          } else {
            terrainAreas.set(terrain.id, {
              area: pieceArea,
              name: terrain.name,
              description: terrain.description,
            });
          }
        }
      }
    });

    // Convert to arrays with percentages
    const terrainInfo = Array.from(terrainAreas.values())
      .map((t) => ({
        name: t.name,
        percentage: (t.area / totalMapArea) * 100,
        description: t.description,
      }))
      .filter((t) => t.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);

    const propsInfo = Array.from(propCounts.values())
      .sort((a, b) => b.count - a.count);

    return { terrainInfo, propsInfo };
  }, [placedPieces, terrainTypes, availablePieces, customProps, mapWidth, mapHeight]);

  // Reset state
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setReadAloud('');
    setDmNotes('');
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setContext('');
      resetState();
    }, 200);
  };

  // Generate descriptions
  const handleGenerate = async () => {
    setStatus('generating');
    setError(null);
    setReadAloud('');
    setDmNotes('');

    try {
      const { openRouterKey } = useAPIKeysStore.getState();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/llm/describe-scene', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mapWidth,
          mapHeight,
          terrains: terrainInfo,
          props: propsInfo,
          context: context.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description');
      }

      setReadAloud(data.readAloud || '');
      setDmNotes(data.dmNotes || '');
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setStatus('error');
    }
  };

  // Copy to clipboard
  const handleCopy = async (text: string, type: 'readAloud' | 'dmNotes') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'readAloud') {
        setCopiedReadAloud(true);
        setTimeout(() => setCopiedReadAloud(false), 2000);
      } else {
        setCopiedDmNotes(true);
        setTimeout(() => setCopiedDmNotes(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isGenerating = status === 'generating';
  const hasResults = status === 'success' && (readAloud || dmNotes);
  const hasMapContent = terrainInfo.length > 0 || propsInfo.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            Scene Description
          </DialogTitle>
          <DialogDescription>
            Generate narrative descriptions of your map for players and DM notes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
          {/* Map Summary */}
          <div className="text-sm text-gray-400 space-y-1">
            <div className="flex gap-4">
              <span>Map: {mapWidth}" x {mapHeight}"</span>
              <span>({Math.round(mapWidth / 12)}ft x {Math.round(mapHeight / 12)}ft)</span>
            </div>
            {terrainInfo.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {terrainInfo.slice(0, 4).map((t) => (
                  <span key={t.name} className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                    {t.name} ({Math.round(t.percentage)}%)
                  </span>
                ))}
              </div>
            )}
            {propsInfo.length > 0 && (
              <div className="text-xs text-gray-500">
                Props: {propsInfo.slice(0, 5).map((p) => `${p.emoji} ${p.name}`).join(', ')}
                {propsInfo.length > 5 && ` +${propsInfo.length - 5} more`}
              </div>
            )}
          </div>

          {/* Context Input - show before generating */}
          {!hasResults && (
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Additional Context (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add context to enhance the description...

Examples:
- 'This is where the bandits have made camp'
- 'An ancient elven ruin, overgrown with vines'
- 'A tense negotiation is about to take place here'"
                disabled={isGenerating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
              />
            </div>
          )}

          {/* Results Section */}
          {hasResults && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-700 mb-3">
                <button
                  onClick={() => setActiveTab('readAloud')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'readAloud'
                      ? 'text-indigo-400 border-b-2 border-indigo-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Read Aloud
                </button>
                <button
                  onClick={() => setActiveTab('dmNotes')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'dmNotes'
                      ? 'text-indigo-400 border-b-2 border-indigo-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  DM Notes
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                {activeTab === 'readAloud' ? (
                  <div className="space-y-3">
                    <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-4">
                      <p className="text-gray-200 whitespace-pre-wrap leading-relaxed italic">
                        {readAloud}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(readAloud, 'readAloud')}
                      className="gap-2"
                    >
                      {copiedReadAloud ? (
                        <>
                          <Check className="h-4 w-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {dmNotes}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(dmNotes, 'dmNotes')}
                      className="gap-2"
                    >
                      {copiedDmNotes ? (
                        <>
                          <Check className="h-4 w-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </ScrollArea>

              {/* Regenerate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="mt-3 text-gray-400"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate new description
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

          {/* No Content Warning */}
          {!hasMapContent && !hasResults && (
            <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                Add some terrain or props to your map for better descriptions.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            {hasResults ? 'Close' : 'Cancel'}
          </Button>

          {!hasResults && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Generate Description
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
