'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { CornerElevations, DEFAULT_CORNER_ELEVATIONS } from '@/types';
import { Mountain } from 'lucide-react';

interface ElevationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pieceId: string;
  pieceName: string;
  pieceWidth: number;
  pieceHeight: number;
  terrainColor: string;
  currentElevation?: CornerElevations;
  onSave: (pieceId: string, elevation: CornerElevations) => void;
}

const MAX_ELEVATION = 2.5;
const STEP = 0.5;

export function ElevationEditor({
  open,
  onOpenChange,
  pieceId,
  pieceName,
  pieceWidth,
  pieceHeight,
  terrainColor,
  currentElevation,
  onSave,
}: ElevationEditorProps) {
  const [elevation, setElevation] = useState<CornerElevations>(
    currentElevation || DEFAULT_CORNER_ELEVATIONS
  );

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setElevation(currentElevation || DEFAULT_CORNER_ELEVATIONS);
    }
  }, [open, currentElevation]);

  const handleCornerChange = (corner: keyof CornerElevations, value: number) => {
    setElevation((prev) => ({ ...prev, [corner]: value }));
  };

  const handleSave = () => {
    onSave(pieceId, elevation);
    onOpenChange(false);
  };

  const handleReset = () => {
    setElevation(DEFAULT_CORNER_ELEVATIONS);
  };

  // Quick presets
  const applyPreset = (preset: 'flat' | 'ramp-n' | 'ramp-s' | 'ramp-e' | 'ramp-w' | 'corner-nw' | 'corner-ne' | 'corner-sw' | 'corner-se') => {
    switch (preset) {
      case 'flat':
        setElevation({ nw: 0, ne: 0, sw: 0, se: 0 });
        break;
      case 'ramp-n':
        setElevation({ nw: 2, ne: 2, sw: 0, se: 0 });
        break;
      case 'ramp-s':
        setElevation({ nw: 0, ne: 0, sw: 2, se: 2 });
        break;
      case 'ramp-e':
        setElevation({ nw: 0, ne: 2, sw: 0, se: 2 });
        break;
      case 'ramp-w':
        setElevation({ nw: 2, ne: 0, sw: 2, se: 0 });
        break;
      case 'corner-nw':
        setElevation({ nw: 2.5, ne: 0, sw: 0, se: 0 });
        break;
      case 'corner-ne':
        setElevation({ nw: 0, ne: 2.5, sw: 0, se: 0 });
        break;
      case 'corner-sw':
        setElevation({ nw: 0, ne: 0, sw: 2.5, se: 0 });
        break;
      case 'corner-se':
        setElevation({ nw: 0, ne: 0, sw: 0, se: 2.5 });
        break;
    }
  };

  // Calculate visual representation heights
  const getCornerHeight = (corner: keyof CornerElevations) => {
    return 0.5 + (elevation[corner] / MAX_ELEVATION) * 2; // Base 0.5" + up to 2.5"
  };

  const isFlat = elevation.nw === 0 && elevation.ne === 0 && elevation.sw === 0 && elevation.se === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            Edit Elevation: {pieceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 3D Preview */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-2 text-center">Preview (isometric view)</div>
            <svg
              viewBox="0 0 200 150"
              className="w-full h-32"
            >
              {/* Draw the piece as isometric box */}
              {(() => {
                const baseX = 100;
                const baseY = 120;
                const scaleX = 15;
                const scaleY = 8;
                const heightScale = 15;

                // Calculate corner positions in isometric view
                // SW is front-left, SE is front-right, NW is back-left, NE is back-right
                const w = pieceWidth;
                const h = pieceHeight;

                const corners = {
                  sw: { x: baseX - w * scaleX / 2, y: baseY, z: elevation.sw * heightScale },
                  se: { x: baseX + w * scaleX / 2, y: baseY, z: elevation.se * heightScale },
                  nw: { x: baseX - w * scaleX / 2 - h * scaleY, y: baseY - h * scaleY, z: elevation.nw * heightScale },
                  ne: { x: baseX + w * scaleX / 2 - h * scaleY, y: baseY - h * scaleY, z: elevation.ne * heightScale },
                };

                // Top face points (with elevation)
                const topPoints = [
                  `${corners.sw.x},${corners.sw.y - corners.sw.z - 8}`,
                  `${corners.se.x},${corners.se.y - corners.se.z - 8}`,
                  `${corners.ne.x},${corners.ne.y - corners.ne.z - 8}`,
                  `${corners.nw.x},${corners.nw.y - corners.nw.z - 8}`,
                ].join(' ');

                // Bottom face points
                const bottomPoints = [
                  `${corners.sw.x},${corners.sw.y - 8}`,
                  `${corners.se.x},${corners.se.y - 8}`,
                  `${corners.ne.x},${corners.ne.y - 8}`,
                  `${corners.nw.x},${corners.nw.y - 8}`,
                ].join(' ');

                return (
                  <>
                    {/* Bottom face (dark) */}
                    <polygon
                      points={bottomPoints}
                      fill="#333"
                      stroke="#555"
                      strokeWidth="1"
                    />
                    {/* Left side */}
                    <polygon
                      points={`${corners.sw.x},${corners.sw.y - 8} ${corners.nw.x},${corners.nw.y - 8} ${corners.nw.x},${corners.nw.y - corners.nw.z - 8} ${corners.sw.x},${corners.sw.y - corners.sw.z - 8}`}
                      fill={terrainColor}
                      stroke="#333"
                      strokeWidth="1"
                      opacity="0.7"
                    />
                    {/* Front side */}
                    <polygon
                      points={`${corners.sw.x},${corners.sw.y - 8} ${corners.se.x},${corners.se.y - 8} ${corners.se.x},${corners.se.y - corners.se.z - 8} ${corners.sw.x},${corners.sw.y - corners.sw.z - 8}`}
                      fill={terrainColor}
                      stroke="#333"
                      strokeWidth="1"
                      opacity="0.85"
                    />
                    {/* Top face */}
                    <polygon
                      points={topPoints}
                      fill={terrainColor}
                      stroke="#333"
                      strokeWidth="1"
                    />
                    {/* Corner labels */}
                    <text x={corners.nw.x - 12} y={corners.nw.y - corners.nw.z - 15} fontSize="10" fill="#aaa">NW</text>
                    <text x={corners.ne.x + 2} y={corners.ne.y - corners.ne.z - 15} fontSize="10" fill="#aaa">NE</text>
                    <text x={corners.sw.x - 12} y={corners.sw.y - corners.sw.z + 5} fontSize="10" fill="#aaa">SW</text>
                    <text x={corners.se.x + 2} y={corners.se.y - corners.se.z + 5} fontSize="10" fill="#aaa">SE</text>
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Presets */}
          <div>
            <div className="text-sm font-medium text-gray-300 mb-2">Quick Presets</div>
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('flat')}
                className="text-xs"
              >
                Flat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('ramp-n')}
                className="text-xs"
              >
                Ramp N
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('ramp-s')}
                className="text-xs"
              >
                Ramp S
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('ramp-e')}
                className="text-xs"
              >
                Ramp E
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('ramp-w')}
                className="text-xs"
              >
                Ramp W
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('corner-nw')}
                className="text-xs"
              >
                Corner NW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('corner-ne')}
                className="text-xs"
              >
                Corner NE
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('corner-sw')}
                className="text-xs"
              >
                Corner SW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('corner-se')}
                className="text-xs"
              >
                Corner SE
              </Button>
            </div>
          </div>

          {/* Corner sliders */}
          <div className="grid grid-cols-2 gap-4">
            {/* NW */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">NW (top-left)</span>
                <span className="text-white font-mono">{elevation.nw.toFixed(1)}&quot;</span>
              </div>
              <Slider
                value={[elevation.nw]}
                onValueChange={([v]) => handleCornerChange('nw', v)}
                min={0}
                max={MAX_ELEVATION}
                step={STEP}
                className="w-full"
              />
            </div>

            {/* NE */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">NE (top-right)</span>
                <span className="text-white font-mono">{elevation.ne.toFixed(1)}&quot;</span>
              </div>
              <Slider
                value={[elevation.ne]}
                onValueChange={([v]) => handleCornerChange('ne', v)}
                min={0}
                max={MAX_ELEVATION}
                step={STEP}
                className="w-full"
              />
            </div>

            {/* SW */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">SW (bottom-left)</span>
                <span className="text-white font-mono">{elevation.sw.toFixed(1)}&quot;</span>
              </div>
              <Slider
                value={[elevation.sw]}
                onValueChange={([v]) => handleCornerChange('sw', v)}
                min={0}
                max={MAX_ELEVATION}
                step={STEP}
                className="w-full"
              />
            </div>

            {/* SE */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">SE (bottom-right)</span>
                <span className="text-white font-mono">{elevation.se.toFixed(1)}&quot;</span>
              </div>
              <Slider
                value={[elevation.se]}
                onValueChange={([v]) => handleCornerChange('se', v)}
                min={0}
                max={MAX_ELEVATION}
                step={STEP}
                className="w-full"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
            {isFlat ? (
              <span className="text-gray-400">Flat piece (base height 0.5&quot;)</span>
            ) : (
              <span className="text-blue-400">
                Sloped piece: {elevation.nw}&quot; / {elevation.ne}&quot; / {elevation.sw}&quot; / {elevation.se}&quot;
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Elevation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
