'use client';

import React, { useState, useEffect } from 'react';
import { TerrainTypeWithInventory, CellColors } from '@/types';
import { getGridDimensions, fillAllCells, setCellColor } from '@/lib/gridUtils';
import { Paintbrush } from 'lucide-react';

interface GridColorPickerProps {
  width: number;
  height: number;
  cellColors: CellColors;
  onChange: (cellColors: CellColors) => void;
  terrainTypes: TerrainTypeWithInventory[];
}

export function GridColorPicker({
  width,
  height,
  cellColors,
  onChange,
  terrainTypes,
}: GridColorPickerProps) {
  const [selectedTerrainId, setSelectedTerrainId] = useState<string>(
    terrainTypes[0]?.id || ''
  );

  // Update selectedTerrainId if it's empty and terrainTypes become available
  useEffect(() => {
    if (!selectedTerrainId && terrainTypes.length > 0) {
      setSelectedTerrainId(terrainTypes[0].id);
    }
  }, [terrainTypes, selectedTerrainId]);

  const { rows, cols } = getGridDimensions(width, height);

  const handleCellClick = (row: number, col: number) => {
    if (!selectedTerrainId) return;
    const newColors = setCellColor(cellColors, row, col, selectedTerrainId);
    onChange(newColors);
  };

  const handleFillAll = () => {
    if (!selectedTerrainId) return;
    const newColors = fillAllCells(cellColors, selectedTerrainId);
    onChange(newColors);
  };

  const getTerrainForCell = (row: number, col: number) => {
    const terrainId = cellColors[row]?.[col];
    return terrainTypes.find((t) => t.id === terrainId);
  };

  const selectedTerrain = terrainTypes.find((t) => t.id === selectedTerrainId);

  // Calculate cell dimensions for display
  const cellPixelSize = Math.min(60, 200 / Math.max(rows, cols));

  return (
    <div className="space-y-4">
      {/* Terrain Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Select terrain to paint
          </label>
          <button
            type="button"
            onClick={handleFillAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Fill all cells with selected terrain"
          >
            <Paintbrush className="w-3 h-3" />
            Fill All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {terrainTypes.map((terrain) => (
            <button
              key={terrain.id}
              type="button"
              onClick={() => setSelectedTerrainId(terrain.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                selectedTerrainId === terrain.id
                  ? 'ring-2 ring-blue-500 bg-gray-700'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full border border-gray-600"
                style={{ backgroundColor: terrain.color }}
              />
              <span className="text-sm text-white">
                {terrain.icon} {terrain.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Display */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">
          Click cells to paint ({cols}x{rows} grid)
        </label>
        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center">
          <div
            className="border-2 border-gray-600 rounded overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellPixelSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellPixelSize}px)`,
              gap: '1px',
              backgroundColor: '#374151', // gap color
            }}
          >
            {cellColors.map((row, rowIdx) =>
              row.map((_, colIdx) => {
                const terrain = getTerrainForCell(rowIdx, colIdx);
                return (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    type="button"
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    className="transition-all hover:opacity-80 hover:scale-105 relative group"
                    style={{
                      width: cellPixelSize,
                      height: cellPixelSize,
                      backgroundColor: terrain?.color || '#666',
                    }}
                    title={terrain?.name || 'Unknown terrain'}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {terrain?.icon}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Currently painting: {selectedTerrain?.icon} {selectedTerrain?.name}
        </p>
      </div>
    </div>
  );
}
