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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  FileText,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { useAPIKeysStore } from '@/store/apiKeysStore';
import { PROP_SIZES } from '@/config/props';
import type { ModularPiece, PropCategory } from '@/types';

interface CampaignAnalyzerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedEntity {
  name: string;
  emoji: string;
  category: PropCategory;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  tags: string[];
  context: string;
}

type AnalysisStatus = 'idle' | 'analyzing' | 'success' | 'error';

export function CampaignAnalyzerDialog({ open, onOpenChange }: CampaignAnalyzerDialogProps) {
  const { addCustomProp } = useMapStore();

  // Local state
  const [campaignText, setCampaignText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [summary, setSummary] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reset state
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setEntities([]);
    setSummary('');
    setSelectedIds(new Set());
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setCampaignText('');
      resetState();
    }, 200);
  };

  // Analyze campaign text
  const handleAnalyze = async () => {
    if (!campaignText.trim()) {
      setError('Please paste some campaign text to analyze');
      return;
    }

    setStatus('analyzing');
    setError(null);
    setEntities([]);
    setSummary('');
    setSelectedIds(new Set());

    try {
      const { openRouterKey } = useAPIKeysStore.getState();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/llm/analyze-campaign', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: campaignText,
          maxEntities: 25,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze campaign');
      }

      setEntities(data.entities || []);
      setSummary(data.summary || '');
      // Select all by default
      setSelectedIds(new Set(data.entities?.map((_: ExtractedEntity, i: number) => i) || []));
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setStatus('error');
    }
  };

  // Toggle entity selection
  const toggleSelection = (index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((_, i) => i)));
    }
  };

  // Add selected entities as props
  const handleAddSelected = () => {
    const selectedEntities = entities.filter((_, i) => selectedIds.has(i));

    selectedEntities.forEach((entity) => {
      const newProp: ModularPiece = {
        id: `campaign-prop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: entity.name,
        pieceType: 'prop',
        propEmoji: entity.emoji,
        propCategory: entity.category,
        terrainTypeId: 'props',
        size: PROP_SIZES[entity.size] || PROP_SIZES.medium,
        isDiagonal: false,
        quantity: 99,
        tags: entity.tags,
      };

      addCustomProp(newProp);
    });

    handleClose();
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'npc':
        return '👤';
      case 'creature':
        return '🐺';
      case 'boss':
        return '💀';
      case 'hero':
        return '⚔️';
      case 'item':
        return '📦';
      case 'furniture':
        return '🪑';
      default:
        return '❓';
    }
  };

  const isAnalyzing = status === 'analyzing';
  const hasResults = status === 'success' && entities.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Campaign Analyzer
          </DialogTitle>
          <DialogDescription>
            Paste campaign text to automatically extract NPCs, creatures, and items as props.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
          {/* Input Section */}
          {!hasResults && (
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium text-foreground block mb-2">
                Campaign Text
              </label>
              <textarea
                value={campaignText}
                onChange={(e) => setCampaignText(e.target.value)}
                placeholder="Paste your encounter description, adventure module text, or session notes here...

Example:
'The party enters the Rusty Dragon Inn. Behind the bar stands Ameiko Kaijitsu, the inn's owner. A grizzled dwarf named Torvald sits in the corner nursing an ale. On the table next to him rests a glowing longsword...'"
                disabled={isAnalyzing}
                className="flex-1 min-h-[200px] bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {campaignText.length} / 15000 characters
                </span>
                {campaignText.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCampaignText('')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {hasResults && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Summary */}
              {summary && (
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-purple-200">{summary}</p>
                </div>
              )}

              {/* Entity List Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">
                  Found {entities.length} entities
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs"
                >
                  {selectedIds.size === entities.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Entity List */}
              <ScrollArea className="flex-1 -mx-2">
                <div className="space-y-2 px-2">
                  {entities.map((entity, index) => (
                    <EntityCard
                      key={index}
                      entity={entity}
                      selected={selectedIds.has(index)}
                      onToggle={() => toggleSelection(index)}
                      categoryIcon={getCategoryIcon(entity.category)}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="mt-2 text-muted-foreground"
              >
                ← Analyze different text
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive rounded-lg text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {hasResults ? (
            <Button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedIds.size} Props
            </Button>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={!campaignText.trim() || isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Text
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Entity card component
function EntityCard({
  entity,
  selected,
  onToggle,
  categoryIcon,
}: {
  entity: ExtractedEntity;
  selected: boolean;
  onToggle: () => void;
  categoryIcon: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full p-3 rounded-lg text-left transition-all flex items-start gap-3 ${
        selected
          ? 'bg-purple-600/20 ring-1 ring-purple-500'
          : 'bg-card hover:bg-accent'
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          selected
            ? 'bg-purple-500 border-purple-500'
            : 'border-border'
        }`}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Emoji */}
      <span className="text-2xl flex-shrink-0">{entity.emoji}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{entity.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground">
            {categoryIcon} {entity.category}
          </span>
          <span className="text-xs text-muted-foreground">{entity.size}</span>
        </div>
        {entity.context && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entity.context}</p>
        )}
        {entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {entity.tags.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="text-xs px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
