'use client';

import React from 'react';
import { CellColors, TerrainTypeWithInventory } from '@/types';
import { getGridDimensions } from '@/lib/gridUtils';

interface CustomPiecePreviewProps {
  width: number;
  height: number;
  cellColors: CellColors;
  terrainTypes: TerrainTypeWithInventory[];
  scale?: number;
  className?: string;
}

export function CustomPiecePreview({
  width,
  height,
  cellColors,
  terrainTypes,
  scale = 10,
  className = '',
}: CustomPiecePreviewProps) {
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  const { rows, cols } = getGridDimensions(width, height);

  const getTerrainColor = (terrainId: string) => {
    const terrain = terrainTypes.find((t) => t.id === terrainId);
    return terrain?.color || '#666';
  };

  // If single cell, render simple box
  if (rows === 1 && cols === 1) {
    const color = getTerrainColor(cellColors[0]?.[0] || '');
    return (
      <div
        className={`border-2 border-border rounded ${className}`}
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: color,
        }}
      />
    );
  }

  // Calculate cell sizes
  const cellWidth = displayWidth / cols;
  const cellHeight = displayHeight / rows;

  return (
    <div
      className={`border-2 border-border rounded overflow-hidden ${className}`}
      style={{
        width: displayWidth,
        height: displayHeight,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
      }}
    >
      {cellColors.map((row, rowIdx) =>
        row.map((terrainId, colIdx) => (
          <div
            key={`${rowIdx}-${colIdx}`}
            style={{
              backgroundColor: getTerrainColor(terrainId),
              borderRight: colIdx < cols - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              borderBottom: rowIdx < rows - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}
          />
        ))
      )}
    </div>
  );
}
