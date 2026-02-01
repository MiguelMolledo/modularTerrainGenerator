'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Connection status types
export type ConnectionStatus = 'unknown' | 'checking' | 'connected' | 'error';

interface APIKeysState {
  // Keys (stored encrypted/obfuscated in localStorage)
  openRouterKey: string;
  falKey: string;

  // Connection status
  openRouterStatus: ConnectionStatus;
  falStatus: ConnectionStatus;
  openRouterError: string | null;
  falError: string | null;

  // Actions
  setOpenRouterKey: (key: string) => void;
  setFalKey: (key: string) => void;
  setOpenRouterStatus: (status: ConnectionStatus, error?: string) => void;
  setFalStatus: (status: ConnectionStatus, error?: string) => void;
  clearKeys: () => void;

  // Test connection actions
  testOpenRouterConnection: () => Promise<boolean>;
  testFalConnection: () => Promise<boolean>;
}

// Simple obfuscation for localStorage (not true encryption, but prevents casual viewing)
// For production, consider using Web Crypto API or a proper encryption library
function obfuscate(str: string): string {
  if (!str) return '';
  return btoa(str.split('').reverse().join(''));
}

function deobfuscate(str: string): string {
  if (!str) return '';
  try {
    return atob(str).split('').reverse().join('');
  } catch {
    return '';
  }
}

export const useAPIKeysStore = create<APIKeysState>()(
  persist(
    (set, get) => ({
      // Initial state
      openRouterKey: '',
      falKey: '',
      openRouterStatus: 'unknown',
      falStatus: 'unknown',
      openRouterError: null,
      falError: null,

      // Actions
      setOpenRouterKey: (key) => {
        set({ openRouterKey: key, openRouterStatus: 'unknown', openRouterError: null });
      },

      setFalKey: (key) => {
        set({ falKey: key, falStatus: 'unknown', falError: null });
      },

      setOpenRouterStatus: (status, error) => {
        set({ openRouterStatus: status, openRouterError: error || null });
      },

      setFalStatus: (status, error) => {
        set({ falStatus: status, falError: error || null });
      },

      clearKeys: () => {
        set({
          openRouterKey: '',
          falKey: '',
          openRouterStatus: 'unknown',
          falStatus: 'unknown',
          openRouterError: null,
          falError: null,
        });
      },

      // Test OpenRouter connection
      testOpenRouterConnection: async () => {
        const { openRouterKey } = get();
        if (!openRouterKey) {
          set({ openRouterStatus: 'error', openRouterError: 'No API key configured' });
          return false;
        }

        set({ openRouterStatus: 'checking', openRouterError: null });

        try {
          const response = await fetch('/api/test/openrouter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-OpenRouter-Key': openRouterKey,
            },
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({ openRouterStatus: 'connected', openRouterError: null });
            return true;
          } else {
            set({ openRouterStatus: 'error', openRouterError: data.error || 'Connection failed' });
            return false;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection failed';
          set({ openRouterStatus: 'error', openRouterError: message });
          return false;
        }
      },

      // Test FAL.ai connection
      testFalConnection: async () => {
        const { falKey } = get();
        if (!falKey) {
          set({ falStatus: 'error', falError: 'No API key configured' });
          return false;
        }

        set({ falStatus: 'checking', falError: null });

        try {
          const response = await fetch('/api/test/falai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Fal-Key': falKey,
            },
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({ falStatus: 'connected', falError: null });
            return true;
          } else {
            set({ falStatus: 'error', falError: data.error || 'Connection failed' });
            return false;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection failed';
          set({ falStatus: 'error', falError: message });
          return false;
        }
      },
    }),
    {
      name: 'mtc-api-keys',
      // Custom storage to obfuscate keys
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const parsed = JSON.parse(str);
            // Deobfuscate keys
            if (parsed.state?.openRouterKey) {
              parsed.state.openRouterKey = deobfuscate(parsed.state.openRouterKey);
            }
            if (parsed.state?.falKey) {
              parsed.state.falKey = deobfuscate(parsed.state.falKey);
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          // Obfuscate keys before storing
          const toStore = {
            ...value,
            state: {
              ...value.state,
              openRouterKey: obfuscate(value.state.openRouterKey || ''),
              falKey: obfuscate(value.state.falKey || ''),
              // Don't persist status
              openRouterStatus: 'unknown',
              falStatus: 'unknown',
              openRouterError: null,
              falError: null,
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist the keys, not the status
      partialize: (state) => ({
        openRouterKey: state.openRouterKey,
        falKey: state.falKey,
      }) as APIKeysState,
    }
  )
);

// Helper to get key for API calls (prefers localStorage, falls back to env)
export function getOpenRouterKey(): string | null {
  // This runs on client, so we can access the store
  if (typeof window !== 'undefined') {
    const storeKey = useAPIKeysStore.getState().openRouterKey;
    if (storeKey) return storeKey;
  }
  return null;
}

export function getFalKey(): string | null {
  if (typeof window !== 'undefined') {
    const storeKey = useAPIKeysStore.getState().falKey;
    if (storeKey) return storeKey;
  }
  return null;
}
