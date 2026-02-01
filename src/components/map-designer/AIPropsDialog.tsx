'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useAIStore, generatedPropToModularPiece } from '@/store/aiStore';
import { useMapStore } from '@/store/mapStore';
import { PROP_CATEGORIES, PROP_SIZES } from '@/config/props';
import type { GeneratedProp } from '@/lib/openrouter';

// Generation mode options
type GenerationMode = 'quick' | 'document';

const GENERATION_MODES = [
  { id: 'quick' as const, name: 'Quick Description', description: 'Brief scene or object description' },
  { id: 'document' as const, name: 'Paste Document', description: 'Campaign text or encounter details' },
];

// Preset examples for quick generation
const QUICK_EXAMPLES = [
  'medieval tavern with patrons',
  'forest clearing with wildlife',
  'dungeon room with traps',
  'marketplace with merchants',
  'castle throne room',
  'underground cave with monsters',
];

export function AIPropsDialog() {
  const { isDialogOpen, setDialogOpen, isGenerating, generatedProps, error, generateProps, clearGenerated } =
    useAIStore();
  const { addCustomProp } = useMapStore();

  // Local state
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<GenerationMode>('quick');
  const [count, setCount] = useState(5);
  const [selectedProps, setSelectedProps] = useState<Set<number>>(new Set());

  // Get category info for display
  const getCategoryInfo = (categoryId: string) => {
    return PROP_CATEGORIES.find((c) => c.id === categoryId) || { icon: '?', name: categoryId };
  };

  // Get size label
  const getSizeLabel = (size: string) => {
    const sizeKey = size === 'small' ? 'medium' : size;
    return PROP_SIZES[sizeKey]?.label || size;
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setSelectedProps(new Set());
    await generateProps(prompt, count);
  };

  // Toggle prop selection
  const togglePropSelection = (index: number) => {
    setSelectedProps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Select all props
  const selectAll = () => {
    setSelectedProps(new Set(generatedProps.map((_, i) => i)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProps(new Set());
  };

  // Add selected props to map
  const handleAddSelected = () => {
    const propsToAdd = generatedProps.filter((_, i) => selectedProps.has(i));
    propsToAdd.forEach((prop) => {
      const modularPiece = generatedPropToModularPiece(prop);
      addCustomProp(modularPiece);
    });
    // Close dialog and clear state
    handleClose();
  };

  // Add all props
  const handleAddAll = () => {
    generatedProps.forEach((prop) => {
      const modularPiece = generatedPropToModularPiece(prop);
      addCustomProp(modularPiece);
    });
    handleClose();
  };

  // Close and reset
  const handleClose = () => {
    setDialogOpen(false);
    setPrompt('');
    setSelectedProps(new Set());
    clearGenerated();
  };

  // Use example prompt
  const useExample = (example: string) => {
    setPrompt(example);
  };

  // Computed values
  const hasGeneratedProps = generatedProps.length > 0;
  const selectedCount = selectedProps.size;
  const canGenerate = prompt.trim().length >= 3 && !isGenerating;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            AI Prop Generator
          </DialogTitle>
          <DialogDescription>
            Describe a scene or paste campaign text to generate props automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Generation Mode */}
          <div className="flex gap-2">
            {GENERATION_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  mode === m.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {mode === 'quick' ? 'Describe your scene' : 'Paste your campaign text'}
            </label>
            {mode === 'quick' ? (
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., medieval tavern with patrons"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === 'Enter' && canGenerate && handleGenerate()}
              />
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your encounter description, campaign notes, or any text describing the scene..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            )}

            {/* Quick examples */}
            {mode === 'quick' && !hasGeneratedProps && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500">Try:</span>
                {QUICK_EXAMPLES.slice(0, 3).map((example) => (
                  <button
                    key={example}
                    onClick={() => useExample(example)}
                    className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-gray-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Count Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-300">Number of props:</label>
            <div className="flex gap-1">
              {[3, 5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`px-3 py-1 rounded text-sm ${
                    count === n
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Props
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Generated Props */}
          {hasGeneratedProps && (
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <span className="text-sm text-gray-400">
                  Generated {generatedProps.length} props
                  {selectedCount > 0 && ` (${selectedCount} selected)`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 text-purple-400 hover:text-purple-300"
                  >
                    Select All
                  </button>
                  {selectedCount > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs px-2 py-1 text-gray-400 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto max-h-[300px] px-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1">
                  {generatedProps.map((prop, index) => {
                    const isSelected = selectedProps.has(index);
                    const categoryInfo = getCategoryInfo(prop.category);

                    return (
                      <Card
                        key={index}
                        onClick={() => togglePropSelection(index)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-2 ring-purple-500 bg-purple-900/20'
                            : 'hover:bg-gray-800'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {/* Selection indicator */}
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'border-gray-600'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>

                            {/* Emoji */}
                            <span className="text-2xl">{prop.emoji}</span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white text-sm truncate">
                                {prop.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{categoryInfo.icon} {categoryInfo.name}</span>
                                <span>•</span>
                                <span>{getSizeLabel(prop.size)}</span>
                              </div>
                              {prop.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {prop.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {hasGeneratedProps && (
            <>
              <Button
                variant="outline"
                onClick={handleAddSelected}
                disabled={selectedCount === 0}
              >
                Add Selected ({selectedCount})
              </Button>
              <Button onClick={handleAddAll} className="bg-purple-600 hover:bg-purple-700">
                Add All ({generatedProps.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
