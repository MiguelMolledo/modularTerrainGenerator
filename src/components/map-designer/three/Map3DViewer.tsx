'use client';

import React, { Suspense, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMapStore } from '@/store/mapStore';
import { Scene3D } from './Scene3D';
import { Loader2 } from 'lucide-react';
import { setCanvas3dInstance } from '@/lib/canvas3dRef';
import * as THREE from 'three';

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
        <p className="text-gray-400 mt-2">Loading 3D view...</p>
      </div>
    </div>
  );
}

export function Map3DViewer() {
  const { mapWidth, mapHeight, toggle3DMode } = useMapStore();

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
    <div className="w-full h-full relative bg-gray-900">
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
        >
          <color attach="background" args={['#1a1a2e']} />
          <Scene3D />
        </Canvas>
      </Suspense>

      {/* 3D View Controls Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300">
        <div className="space-y-1">
          <div><span className="text-gray-500">Rotate:</span> Left click + drag</div>
          <div><span className="text-gray-500">Pan:</span> Right click + drag</div>
          <div><span className="text-gray-500">Zoom:</span> Scroll wheel</div>
          <div><span className="text-gray-500">Toggle 2D:</span> V</div>
        </div>
      </div>
    </div>
  );
}
