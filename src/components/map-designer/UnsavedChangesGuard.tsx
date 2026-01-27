'use client';

import { useEffect } from 'react';
import { useMapStore } from '@/store/mapStore';

const LAST_MAP_KEY = 'modular-terrain-last-map-id';

export function UnsavedChangesGuard() {
  const { hasUnsavedChanges, currentMapId } = useMapStore();

  // Store last map ID in localStorage
  useEffect(() => {
    if (currentMapId) {
      localStorage.setItem(LAST_MAP_KEY, currentMapId);
    }
  }, [currentMapId]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return null;
}

// Helper to get the last map ID from localStorage
export function getLastMapId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_MAP_KEY);
}

// Helper to clear the last map ID
export function clearLastMapId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_MAP_KEY);
}
