'use client';

import React from 'react';
import { SplitDirection } from '@/types';

interface CustomPiecePreviewProps {
  width: number;
  height: number;
  isSplit: boolean;
  splitDirection?: SplitDirection;
  primaryColor: string;
  secondaryColor?: string;
  scale?: number;
  className?: string;
}

export function CustomPiecePreview({
  width,
  height,
  isSplit,
  splitDirection,
  primaryColor,
  secondaryColor,
  scale = 10,
  className = '',
}: CustomPiecePreviewProps) {
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  if (!isSplit || !splitDirection || !secondaryColor) {
    return (
      <div
        className={`border-2 border-gray-600 rounded ${className}`}
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: primaryColor,
        }}
      />
    );
  }

  if (splitDirection === 'horizontal') {
    return (
      <div
        className={`border-2 border-gray-600 rounded overflow-hidden flex flex-col ${className}`}
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: primaryColor,
          }}
        />
        <div
          style={{
            flex: 1,
            backgroundColor: secondaryColor,
          }}
        />
      </div>
    );
  }

  // Vertical split
  return (
    <div
      className={`border-2 border-gray-600 rounded overflow-hidden flex flex-row ${className}`}
      style={{
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundColor: primaryColor,
        }}
      />
      <div
        style={{
          flex: 1,
          backgroundColor: secondaryColor,
        }}
      />
    </div>
  );
}
