import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CornerElevations } from '@/types';

// Key format: "terrainSlug-shapeKey" e.g., "desert-6x6"
type ElevationKey = string;

interface ElevationState {
  // Map of piece key to elevation config
  elevations: Record<ElevationKey, CornerElevations>;

  // Actions
  setElevation: (key: ElevationKey, elevation: CornerElevations) => void;
  getElevation: (key: ElevationKey) => CornerElevations | undefined;
  removeElevation: (key: ElevationKey) => void;
  clearAll: () => void;
}

export const useElevationStore = create<ElevationState>()(
  persist(
    (set, get) => ({
      elevations: {},

      setElevation: (key, elevation) => {
        // Only store if not flat (all zeros)
        const isFlat = elevation.nw === 0 && elevation.ne === 0 &&
                       elevation.sw === 0 && elevation.se === 0;

        set((state) => {
          if (isFlat) {
            // Remove the key if setting to flat
            const { [key]: _, ...rest } = state.elevations;
            return { elevations: rest };
          }
          return {
            elevations: {
              ...state.elevations,
              [key]: elevation,
            },
          };
        });
      },

      getElevation: (key) => {
        return get().elevations[key];
      },

      removeElevation: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.elevations;
          return { elevations: rest };
        });
      },

      clearAll: () => {
        set({ elevations: {} });
      },
    }),
    {
      name: 'terrain-elevations',
    }
  )
);

// Helper to create elevation key from terrain slug and shape key
export function createElevationKey(terrainSlug: string, shapeKey: string): string {
  return `${terrainSlug}-${shapeKey}`;
}
