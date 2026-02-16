/**
 * use3DTransform Hook
 * Handles keyboard shortcuts for 3D transform modes
 * W key = translate mode, E key = rotate mode
 */

import { useEffect, useCallback } from 'react';
import { useMapStore } from '@/store/mapStore';

export function use3DTransform() {
  const {
    is3DMode,
    transform3DMode,
    setTransform3DMode,
    selectedPlacedPieceIds,
  } = useMapStore();

  // Switch to translate mode
  const setTranslateMode = useCallback(() => {
    setTransform3DMode('translate');
  }, [setTransform3DMode]);

  // Switch to rotate mode
  const setRotateMode = useCallback(() => {
    setTransform3DMode('rotate');
  }, [setTransform3DMode]);

  // Keyboard shortcuts for transform modes
  useEffect(() => {
    // Only listen when in 3D mode
    if (!is3DMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ignore if modifier keys are pressed (avoid conflicts with other shortcuts)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w':
          e.preventDefault();
          setTranslateMode();
          break;
        case 'e':
          e.preventDefault();
          setRotateMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [is3DMode, setTranslateMode, setRotateMode]);

  return {
    // Current mode
    transform3DMode,

    // Mode setters
    setTranslateMode,
    setRotateMode,

    // Convenience booleans
    isTranslateMode: transform3DMode === 'translate',
    isRotateMode: transform3DMode === 'rotate',

    // Whether transform controls should be active
    isTransformActive: is3DMode && selectedPlacedPieceIds.length > 0,
  };
}
