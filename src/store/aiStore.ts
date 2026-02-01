import { create } from 'zustand';
import type { GeneratedProp } from '@/lib/openrouter';
import type { ModularPiece } from '@/types';
import { PROP_SIZES } from '@/config/props';
import { useAPIKeysStore } from './apiKeysStore';

interface AIState {
  // Generation state
  isGenerating: boolean;
  generatedProps: GeneratedProp[];
  error: string | null;

  // Dialog state
  isDialogOpen: boolean;

  // Actions
  setDialogOpen: (open: boolean) => void;
  generateProps: (prompt: string, count: number) => Promise<void>;
  clearGenerated: () => void;
  clearError: () => void;
}

// Map GeneratedProp size to PROP_SIZES key
function mapSizeToKey(size: GeneratedProp['size']): string {
  switch (size) {
    case 'tiny':
      return 'tiny';
    case 'small':
    case 'medium':
      return 'medium';
    case 'large':
      return 'large';
    case 'huge':
      return 'huge';
    case 'gargantuan':
      return 'gargantuan';
    default:
      return 'medium';
  }
}

// Convert GeneratedProp to ModularPiece
export function generatedPropToModularPiece(prop: GeneratedProp): ModularPiece {
  const sizeKey = mapSizeToKey(prop.size);
  const size = PROP_SIZES[sizeKey] || PROP_SIZES.medium;

  return {
    id: `ai-prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: prop.name,
    pieceType: 'prop',
    propEmoji: prop.emoji,
    propCategory: prop.category,
    terrainTypeId: 'props',
    size,
    isDiagonal: false,
    quantity: 99,
    tags: prop.tags,
  };
}

export const useAIStore = create<AIState>((set) => ({
  // Initial state
  isGenerating: false,
  generatedProps: [],
  error: null,
  isDialogOpen: false,

  // Actions
  setDialogOpen: (open) =>
    set({
      isDialogOpen: open,
      // Clear error when closing dialog
      error: open ? undefined : null,
    }),

  generateProps: async (prompt: string, count: number) => {
    set({ isGenerating: true, error: null, generatedProps: [] });

    try {
      // Get API key from settings store
      const openRouterKey = useAPIKeysStore.getState().openRouterKey;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include API key in header if available
      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/llm/generate-props', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, count }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate props');
      }

      set({ generatedProps: data.props, isGenerating: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      set({ error: errorMessage, isGenerating: false });
    }
  },

  clearGenerated: () => set({ generatedProps: [], error: null }),

  clearError: () => set({ error: null }),
}));
