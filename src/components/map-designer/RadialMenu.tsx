'use client';

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';

const MENU_RADIUS = 120; // Distance from center to items
const ITEM_SIZE = 64; // Size of each item
const CENTER_SIZE = 40; // Size of center circle
const MIN_SELECTION_DISTANCE = 40; // Minimum distance from center to select

export function RadialMenu() {
  const {
    isRadialMenuOpen,
    recentlyUsedPieceIds,
    availablePieces,
    terrainTypes,
    radialMenuSelectedIndex,
    radialMenuPosition,
    setRadialMenuSelectedIndex,
    closeRadialMenu,
    selectPieceFromRadialMenu,
  } = useMapStore();

  const lastSelectionRef = useRef<number | null>(null);

  // Get piece info for display
  const getPieceInfo = useCallback(
    (pieceId: string) => {
      const piece = availablePieces.find((p) => p.id === pieceId);
      if (!piece) return null;
      const terrain = terrainTypes.find((t) => t.id === piece.terrainTypeId);
      return { piece, terrain };
    },
    [availablePieces, terrainTypes]
  );

  // Menu center is fixed when the menu opens
  const menuCenter = useMemo(() => radialMenuPosition, [radialMenuPosition]);

  // Reset selection state when menu opens
  useEffect(() => {
    if (isRadialMenuOpen) {
      lastSelectionRef.current = null;
    }
  }, [isRadialMenuOpen]);

  // Calculate selection based on mouse position (only updates selection index, not position)
  useEffect(() => {
    if (!isRadialMenuOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate distance and angle from fixed menu center
      const dx = e.clientX - menuCenter.x;
      const dy = e.clientY - menuCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only select if mouse is far enough from center
      if (distance < MIN_SELECTION_DISTANCE) {
        if (lastSelectionRef.current !== null) {
          lastSelectionRef.current = null;
          setRadialMenuSelectedIndex(null);
        }
        return;
      }

      const itemCount = Math.min(recentlyUsedPieceIds.length, 8);
      if (itemCount === 0) return;

      // Calculate angle (0 = right, going clockwise)
      let angle = Math.atan2(dy, dx);
      // Adjust so 0 = top
      angle = angle + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;

      const segmentSize = (Math.PI * 2) / itemCount;

      // Calculate the center angle of each segment and find the closest one
      let closestIndex = 0;
      let closestAngleDiff = Infinity;

      for (let i = 0; i < itemCount; i++) {
        const segmentCenterAngle = i * segmentSize;
        let angleDiff = Math.abs(angle - segmentCenterAngle);
        // Handle wrap-around
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < closestAngleDiff) {
          closestAngleDiff = angleDiff;
          closestIndex = i;
        }
      }

      // Apply hysteresis: only switch if we're clearly pointing at a different segment
      const hysteresisThreshold = segmentSize * 0.15;

      if (lastSelectionRef.current === null) {
        lastSelectionRef.current = closestIndex;
        setRadialMenuSelectedIndex(closestIndex);
      } else if (closestIndex !== lastSelectionRef.current) {
        const lastSegmentCenterAngle = lastSelectionRef.current * segmentSize;
        let lastAngleDiff = Math.abs(angle - lastSegmentCenterAngle);
        if (lastAngleDiff > Math.PI) lastAngleDiff = Math.PI * 2 - lastAngleDiff;

        if (closestAngleDiff < lastAngleDiff - hysteresisThreshold) {
          lastSelectionRef.current = closestIndex;
          setRadialMenuSelectedIndex(closestIndex);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isRadialMenuOpen, menuCenter, recentlyUsedPieceIds.length, setRadialMenuSelectedIndex]);

  // Handle T key release
  useEffect(() => {
    if (!isRadialMenuOpen) return;

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        selectPieceFromRadialMenu();
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [isRadialMenuOpen, selectPieceFromRadialMenu]);

  if (!isRadialMenuOpen) return null;

  const itemCount = Math.min(recentlyUsedPieceIds.length, 8);

  if (itemCount === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-none">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
          <p className="text-gray-300 text-sm">No recently used pieces</p>
          <p className="text-gray-500 text-xs mt-1">Place some pieces first!</p>
        </div>
      </div>
    );
  }

  // Calculate positions for each item
  const items = recentlyUsedPieceIds.slice(0, 8).map((pieceId, index) => {
    const info = getPieceInfo(pieceId);
    if (!info) return null;

    // Angle for this item (starting from top, going clockwise)
    const angle = (index * (Math.PI * 2)) / itemCount - Math.PI / 2;
    const x = Math.cos(angle) * MENU_RADIUS;
    const y = Math.sin(angle) * MENU_RADIUS;

    const isSelected = radialMenuSelectedIndex === index;

    return {
      pieceId,
      piece: info.piece,
      terrain: info.terrain,
      x,
      y,
      angle,
      isSelected,
    };
  }).filter(Boolean);

  // Calculate arrow angle
  const selectedItem = radialMenuSelectedIndex !== null ? items[radialMenuSelectedIndex] : null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Menu container */}
      <div
        className="absolute"
        style={{
          left: menuCenter.x,
          top: menuCenter.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* SVG for arrow */}
        <svg
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: MENU_RADIUS * 2 + ITEM_SIZE,
            height: MENU_RADIUS * 2 + ITEM_SIZE,
            pointerEvents: 'none',
          }}
        >
          {/* Arrow line from center to selected item */}
          {selectedItem && (
            <>
              <line
                x1={(MENU_RADIUS * 2 + ITEM_SIZE) / 2}
                y1={(MENU_RADIUS * 2 + ITEM_SIZE) / 2}
                x2={(MENU_RADIUS * 2 + ITEM_SIZE) / 2 + selectedItem.x * 0.8}
                y2={(MENU_RADIUS * 2 + ITEM_SIZE) / 2 + selectedItem.y * 0.8}
                stroke={selectedItem.terrain?.color || '#3b82f6'}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Arrowhead */}
              <polygon
                points={`0,-8 12,0 0,8`}
                fill={selectedItem.terrain?.color || '#3b82f6'}
                transform={`translate(${(MENU_RADIUS * 2 + ITEM_SIZE) / 2 + selectedItem.x * 0.85}, ${(MENU_RADIUS * 2 + ITEM_SIZE) / 2 + selectedItem.y * 0.85}) rotate(${(selectedItem.angle * 180) / Math.PI + 90})`}
              />
            </>
          )}
        </svg>

        {/* Center circle */}
        <div
          className="absolute rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center"
          style={{
            width: CENTER_SIZE,
            height: CENTER_SIZE,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="text-gray-400 text-xs font-bold">T</span>
        </div>

        {/* Menu items */}
        {items.map((item, index) => {
          if (!item) return null;
          return (
            <div
              key={item.pieceId}
              className={`absolute rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-100 ${
                item.isSelected
                  ? 'bg-gray-700 border-blue-400 scale-110 shadow-lg'
                  : 'bg-gray-800 border-gray-600'
              }`}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                left: `calc(50% + ${item.x}px)`,
                top: `calc(50% + ${item.y}px)`,
                transform: 'translate(-50%, -50%)',
                borderColor: item.isSelected ? item.terrain?.color : undefined,
              }}
            >
              {/* Terrain icon */}
              <span
                className="text-xl"
                style={{ color: item.terrain?.color }}
              >
                {item.terrain?.icon}
              </span>
              {/* Piece shape indicator */}
              <div className="mt-1">
                {item.piece.isDiagonal ? (
                  <svg width="20" height="20" style={{ opacity: 0.8 }}>
                    <polygon
                      points="0,0 20,0 0,20"
                      fill={item.terrain?.color}
                      transform={`rotate(${item.piece.defaultRotation || 0} 10 10)`}
                    />
                  </svg>
                ) : (
                  <div
                    className="rounded-sm"
                    style={{
                      width: Math.min(item.piece.size.width * 5, 20),
                      height: Math.min(item.piece.size.height * 3, 12),
                      backgroundColor: item.terrain?.color,
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Selected item label */}
        {selectedItem && (
          <div
            className="absolute whitespace-nowrap bg-gray-900/90 px-2 py-1 rounded text-sm text-white border border-gray-600"
            style={{
              left: '50%',
              top: `calc(50% + ${MENU_RADIUS + ITEM_SIZE / 2 + 16}px)`,
              transform: 'translateX(-50%)',
            }}
          >
            <span style={{ color: selectedItem.terrain?.color }}>
              {selectedItem.terrain?.icon}
            </span>{' '}
            {selectedItem.piece.name}
            <span className="text-gray-400 ml-2 text-xs">
              {selectedItem.piece.size.label}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-600">
        <p className="text-gray-300 text-sm">
          Move mouse to select • Release <kbd className="bg-gray-700 px-1.5 py-0.5 rounded mx-1">T</kbd> to place
        </p>
      </div>
    </div>
  );
}
