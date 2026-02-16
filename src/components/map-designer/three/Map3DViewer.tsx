'use client';

import React, { Suspense, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMapStore } from '@/store/mapStore';
import { use3DTransform } from '@/hooks/use3DTransform';
import { Scene3D } from './Scene3D';
import { Loader2, Move, RotateCw } from 'lucide-react';
import { setCanvas3dInstance } from '@/lib/canvas3dRef';
import * as THREE from 'three';

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-muted-foreground mt-2">Loading 3D view...</p>
      </div>
    </div>
  );
}

// Check if 3D editing is disabled via environment variable
const is3DEditingDisabled = process.env.NEXT_PUBLIC_DISABLE_3D_EDITING === 'true';

export function Map3DViewer() {
  const { mapWidth, mapHeight, toggle3DMode, clearSelection, selectedPlacedPieceIds } = useMapStore();
  const { transform3DMode, isTranslateMode, isRotateMode } = use3DTransform();

  // Handle click on empty space (no piece hit) to clear selection
  const handlePointerMissed = useCallback((event: MouseEvent) => {
    // Only clear selection on left click (button 0)
    if (event.button === 0) {
      clearSelection();
    }
  }, [clearSelection]);

  // Callback to capture canvas reference when it's created
  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    setCanvas3dInstance(gl.domElement);
  }, []);

  // Clean up canvas reference on unmount
  useEffect(() => {
    return () => {
      setCanvas3dInstance(null);
    };
  }, []);

  // Handle V key to toggle back to 2D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      // V key to toggle between 2D and 3D view
      if ((e.key === 'v' || e.key === 'V') && !e.repeat) {
        e.preventDefault();
        toggle3DMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [toggle3DMode]);

  // Calculate initial camera position
  // Camera positioned at south (+Z) looking toward north
  const cameraDistance = Math.max(mapWidth, mapHeight) * 0.8;
  const cameraHeight = cameraDistance * 0.6;

  return (
    <div className="w-full h-full relative bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          camera={{
            position: [mapWidth / 2, cameraHeight, mapHeight + cameraDistance * 0.5],
            fov: 50,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true, // Required for snapshot capture
          }}
          onCreated={handleCanvasCreated}
          onPointerMissed={is3DEditingDisabled ? undefined : handlePointerMissed}
        >
          <color attach="background" args={['#1a1a2e']} />
          <Scene3D editingDisabled={is3DEditingDisabled} />
        </Canvas>
      </Suspense>

      {/* 3D View Controls Legend */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
        <div className="space-y-1">
          <div className="font-medium text-foreground mb-1">Camera (Fly Mode)</div>
          <div><span className="text-muted-foreground">Look:</span> Right click + drag</div>
          <div><span className="text-muted-foreground">Fly:</span> Hold right + WASD</div>
          <div><span className="text-muted-foreground">Up/Down:</span> Hold right + E/Q</div>
          <div><span className="text-muted-foreground">Zoom:</span> Scroll wheel</div>
          <div><span className="text-muted-foreground">Fast:</span> Shift</div>
          {!is3DEditingDisabled && (
            <>
              <div className="border-t border-border my-1 pt-1"></div>
              <div className="font-medium text-foreground mb-1">Pieces</div>
              <div><span className="text-muted-foreground">Select:</span> Click</div>
              <div><span className="text-muted-foreground">Multi:</span> Shift + Click</div>
              <div><span className="text-muted-foreground">Move mode:</span> W</div>
              <div><span className="text-muted-foreground">Rotate mode:</span> E</div>
            </>
          )}
          <div className="border-t border-border my-1 pt-1"></div>
          <div><span className="text-muted-foreground">Toggle 2D:</span> V</div>
        </div>
      </div>

      {/* Transform Mode Indicator - show when pieces are selected (only when editing enabled) */}
      {!is3DEditingDisabled && selectedPlacedPieceIds.length > 0 && (
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
          {isTranslateMode ? (
            <>
              <Move className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Move Mode</span>
              <span className="text-xs text-muted-foreground">(W)</span>
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Rotate Mode</span>
              <span className="text-xs text-muted-foreground">(E)</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
