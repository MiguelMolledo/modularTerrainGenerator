'use client';

import React from 'react';

interface SelectionOutline3DProps {
  children: React.ReactNode;
}

/**
 * SelectionOutline3D - simplified version without postprocessing
 * to avoid infinite loop issues with @react-three/postprocessing.
 * Selection highlighting is now handled directly in the piece components.
 */
export function SelectionOutline3D({ children }: SelectionOutline3DProps) {
  // Simply render children without postprocessing effects
  // Selection is indicated via edge colors in PlacedPiece3D
  return <>{children}</>;
}

interface SelectableProps {
  enabled: boolean;
  children: React.ReactNode;
}

/**
 * Simplified Selectable wrapper - just passes through children.
 * Selection highlighting is handled in the piece components themselves.
 */
export function Selectable({ enabled, children }: SelectableProps) {
  return <>{children}</>;
}
