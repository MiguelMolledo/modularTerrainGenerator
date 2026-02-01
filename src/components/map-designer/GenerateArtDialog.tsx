'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  Wand2,
  Download,
  Image as ImageIcon,
  AlertCircle,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useAPIKeysStore } from '@/store/apiKeysStore';
import { generateFullMapSnapshot } from '@/lib/stageRef';
import { STYLE_PRESETS, ASPECT_RATIOS, RESOLUTIONS, OUTPUT_FORMATS, buildDirectImagePrompt, type StylePreset, type TerrainDetail } from '@/lib/falai';

interface GenerateArtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GenerationStatus = 'idle' | 'capturing' | 'generating' | 'success' | 'error';

export function GenerateArtDialog({ open, onOpenChange }: GenerateArtDialogProps) {
  const { mapWidth, mapHeight, placedPieces, terrainTypes, customProps, availablePieces } = useMapStore();

  // Local state
  const [selectedStyle, setSelectedStyle] = useState<string>('fantasy');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Model parameters
  const [aspectRatio, setAspectRatio] = useState<string>('auto');
  const [resolution, setResolution] = useState<string>('1K');
  const [outputFormat, setOutputFormat] = useState<string>('png');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI prompt generation
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedJson, setGeneratedJson] = useState<Record<string, unknown> | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Compute detailed terrain info and props summary
  const { terrainDetails, propsSummary } = useMemo(() => {
    // Track terrain area by type (in square inches)
    const terrainAreas = new Map<string, { area: number; count: number }>();
    const propCounts = new Map<string, number>();

    const allPieces = [...availablePieces, ...customProps];
    const totalMapArea = mapWidth * mapHeight;

    placedPieces.forEach((placed) => {
      const piece = allPieces.find((p) => p.id === placed.pieceId);
      if (!piece) return;

      if (piece.pieceType === 'prop') {
        const name = piece.name || 'Unknown';
        propCounts.set(name, (propCounts.get(name) || 0) + 1);
      } else {
        const terrainId = piece.terrainTypeId;
        // Calculate piece area (considering diagonal pieces are half the area)
        const pieceArea = piece.size.width * piece.size.height * (piece.isDiagonal ? 0.5 : 1);
        const current = terrainAreas.get(terrainId) || { area: 0, count: 0 };
        terrainAreas.set(terrainId, {
          area: current.area + pieceArea,
          count: current.count + 1,
        });
      }
    });

    // Build detailed terrain info with colors and descriptions
    const terrainDetails: TerrainDetail[] = [];

    terrainAreas.forEach((data, terrainId) => {
      // Find terrain by id OR slug (pieces may use either)
      const terrain = terrainTypes.find((t) => t.id === terrainId || t.slug === terrainId);
      if (terrain) {
        const percentage = (data.area / totalMapArea) * 100;
        terrainDetails.push({
          name: terrain.name,
          color: terrain.color,
          description: terrain.description || `${terrain.name} terrain`,
          percentage,
          pieceCount: data.count,
        });
      }
    });

    // Sort by percentage (most coverage first)
    terrainDetails.sort((a, b) => b.percentage - a.percentage);

    // Build props summary
    let propsSummary = '';
    if (propCounts.size > 0) {
      const parts = Array.from(propCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name));
      propsSummary = parts.join(', ');
    }

    return { terrainDetails, propsSummary };
  }, [placedPieces, terrainTypes, availablePieces, customProps, mapWidth, mapHeight]);

  // Generate prompt from current state
  const generatePrompt = useCallback(() => {
    const prompt = buildDirectImagePrompt({
      imageBase64: '', // Not needed for prompt generation
      prompt: '',
      style: selectedStyle,
      mapWidth,
      mapHeight,
      terrainDetails: terrainDetails.length > 0 ? terrainDetails : undefined,
      propsSummary: propsSummary || undefined,
    });
    return prompt;
  }, [selectedStyle, mapWidth, mapHeight, terrainDetails, propsSummary]);

  // Regenerate prompt when style changes
  const handleRegeneratePrompt = useCallback(() => {
    setEditablePrompt(generatePrompt());
  }, [generatePrompt]);

  // Generate AI-enhanced prompt using LLM with JSON template
  const handleAIPrompt = useCallback(async () => {
    setIsGeneratingPrompt(true);
    setError(null);
    setGeneratedJson(null);

    try {
      const { openRouterKey } = useAPIKeysStore.getState();
      const selectedStylePreset = STYLE_PRESETS.find((s) => s.id === selectedStyle);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/image/generate-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          style: selectedStyle,
          styleName: selectedStylePreset?.name || 'Fantasy Battle Map',
          terrainDetails,
          propsSummary,
          mapWidth,
          mapHeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI prompt');
      }

      setEditablePrompt(data.prompt);
      if (data.json) {
        setGeneratedJson(data.json);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI prompt';
      setError(message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [selectedStyle, terrainDetails, propsSummary, mapWidth, mapHeight]);

  // Capture map preview when dialog opens
  const captureMapPreview = useCallback(() => {
    setStatus('capturing');
    setError(null);

    // Small delay to ensure canvas is ready
    setTimeout(() => {
      // Capture the full map area, not just the current viewport
      const snapshot = generateFullMapSnapshot(1200, 900);
      if (snapshot) {
        setMapPreview(snapshot);
        setStatus('idle');
      } else {
        setError('Failed to capture map preview. Make sure the map has content.');
        setStatus('error');
      }
    }, 100);
  }, []);

  // Capture on open and generate initial prompt
  React.useEffect(() => {
    if (open) {
      if (!mapPreview) {
        captureMapPreview();
      }
      // Generate initial prompt when dialog opens
      if (!editablePrompt) {
        setEditablePrompt(generatePrompt());
      }
    }
  }, [open, mapPreview, captureMapPreview, editablePrompt, generatePrompt]);

  // Reset state when dialog closes
  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setMapPreview(null);
      setGeneratedImageUrl(null);
      setEditablePrompt('');
      setUsedPrompt(null);
      setShowPrompt(false);
      setShowAdvanced(false);
      setGeneratedJson(null);
      setShowJson(false);
    }, 200);
  };

  // Generate art
  const handleGenerate = async () => {
    if (!mapPreview) {
      setError('No map preview available');
      return;
    }

    if (!editablePrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (editablePrompt.length > 2000) {
      setError('Prompt must be less than 2000 characters');
      return;
    }

    setStatus('generating');
    setError(null);
    setGeneratedImageUrl(null);

    try {
      // Get API key from settings store
      const { falKey } = useAPIKeysStore.getState();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include API key in headers if available
      if (falKey) {
        headers['X-Fal-Key'] = falKey;
      }

      // Send the editable prompt directly with model parameters
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: mapPreview,
          prompt: editablePrompt,
          style: selectedStyle,
          mapWidth,
          mapHeight,
          // Model parameters
          aspectRatio,
          resolution,
          outputFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImageUrl(data.imageUrl);
      setUsedPrompt(data.prompt || null);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setStatus('error');
    }
  };

  // Download generated image
  const handleDownload = async () => {
    if (!generatedImageUrl) return;

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `map-art-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download image');
    }
  };

  // Regenerate with same settings
  const handleRegenerate = () => {
    setGeneratedImageUrl(null);
    handleGenerate();
  };

  const selectedStylePreset = STYLE_PRESETS.find((s) => s.id === selectedStyle);
  const isGenerating = status === 'generating';
  const hasResult = status === 'success' && generatedImageUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-amber-400" />
            Generate Map Art
          </DialogTitle>
          <DialogDescription>
            Transform your tactical map into artistic illustration for player handouts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Preview Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Source Map Preview */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Source Map
              </label>
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center">
                {status === 'capturing' ? (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Capturing...</span>
                  </div>
                ) : mapPreview ? (
                  <img
                    src={mapPreview}
                    alt="Map preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500 flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">No preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Result */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Generated Art
              </label>
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center">
                {isGenerating ? (
                  <div className="text-amber-400 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Generating...</span>
                    <span className="text-xs text-gray-500">This may take a moment</span>
                  </div>
                ) : generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated art"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500 flex flex-col items-center gap-2">
                    <Wand2 className="h-8 w-8" />
                    <span className="text-sm">Result will appear here</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex gap-4">
              <span>Size: {mapWidth}" x {mapHeight}"</span>
              <span>Pieces: {placedPieces.length}</span>
            </div>
            {terrainDetails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {terrainDetails.slice(0, 4).map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-300"
                    style={{ backgroundColor: `${t.color}30` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name} ({Math.round(t.percentage)}%)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Style Selector */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Art Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  selected={selectedStyle === style.id}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    // Regenerate prompt with new style after a tick
                    setTimeout(() => {
                      const newPrompt = buildDirectImagePrompt({
                        imageBase64: '',
                        prompt: '',
                        style: style.id,
                        mapWidth,
                        mapHeight,
                        terrainDetails: terrainDetails.length > 0 ? terrainDetails : undefined,
                        propsSummary: propsSummary || undefined,
                      });
                      setEditablePrompt(newPrompt);
                    }, 0);
                  }}
                  disabled={isGenerating}
                />
              ))}
            </div>
          </div>

          {/* Editable Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Prompt (editable)
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAIPrompt}
                  disabled={isGenerating || isGeneratingPrompt}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {isGeneratingPrompt ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  AI Prompt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegeneratePrompt}
                  disabled={isGenerating || isGeneratingPrompt}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Simple
                </Button>
              </div>
            </div>
            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              placeholder="The prompt will be generated based on your terrain..."
              rows={5}
              disabled={isGenerating}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:opacity-50 font-mono ${
                editablePrompt.length > 2000 ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Edit the prompt or click <span className="text-purple-400">AI Prompt</span> (Gemini) for a creative version, or <span className="text-amber-400">Simple</span> for a basic template.
              </p>
              <span className={`text-xs ${editablePrompt.length > 2000 ? 'text-red-400' : editablePrompt.length > 1800 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {editablePrompt.length}/2000
              </span>
            </div>

            {/* Show generated JSON if available */}
            {generatedJson && (
              <div className="mt-2">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {showJson ? '▼' : '▶'} Ver JSON generado
                </button>
                {showJson && (
                  <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto max-h-48">
                    {JSON.stringify(generatedJson, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Advanced Settings - Collapsible */}
          <div className="border border-gray-700 rounded-lg">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-400 hover:text-gray-200"
            >
              <span>Advanced Settings</span>
              <span>{showAdvanced ? '▲' : '▼'}</span>
            </button>

            {showAdvanced && (
              <div className="px-3 pb-3 space-y-3 border-t border-gray-700 pt-3">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Aspect Ratio
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        disabled={isGenerating}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          aspectRatio === ar.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Resolution
                  </label>
                  <div className="flex gap-1">
                    {RESOLUTIONS.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => setResolution(res.id)}
                        disabled={isGenerating}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          resolution === res.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Output Format
                  </label>
                  <div className="flex gap-1">
                    {OUTPUT_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setOutputFormat(fmt.id)}
                        disabled={isGenerating}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          outputFormat === fmt.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Model: nano-banana-pro/edit (Google Gemini)
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {hasResult && (
            <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Art generated successfully!</span>
            </div>
          )}

                  </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            {hasResult ? 'Close' : 'Cancel'}
          </Button>

          {hasResult ? (
            <>
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={handleDownload} className="bg-amber-600 hover:bg-amber-700">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!mapPreview || isGenerating || editablePrompt.length > 2000}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Art
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Style card component
function StyleCard({
  style,
  selected,
  onClick,
  disabled,
}: {
  style: StylePreset;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-lg text-left transition-all ${
        selected
          ? 'bg-amber-600/20 ring-2 ring-amber-500 text-white'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="font-medium text-sm">{style.name}</div>
      <div className="text-xs text-gray-400 mt-1">{style.description}</div>
    </button>
  );
}
