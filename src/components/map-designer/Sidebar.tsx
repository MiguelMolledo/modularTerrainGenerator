'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/store/mapStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Puzzle } from 'lucide-react';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const {
    terrainTypes,
    availablePieces,
    placedPieces,
    selectedPieceId,
    currentLevel,
    currentRotation,
    rotateCurrentPiece,
    isSidebarDragging,
    startSidebarDrag,
    endSidebarDrag,
  } = useMapStore();

  // Separate custom pieces from regular pieces
  const regularPieces = availablePieces.filter((p) => !p.isCustom);
  const customPieces = availablePieces.filter((p) => p.isCustom);

  // End drag on mouseup anywhere (cleanup)
  useEffect(() => {
    const handleMouseUp = () => {
      if (isSidebarDragging) {
        endSidebarDrag();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isSidebarDragging, endSidebarDrag]);

  // Get total used across all levels
  const getTotalUsed = (pieceId: string) => {
    return placedPieces.filter((p) => p.pieceId === pieceId).length;
  };

  const handleMouseDown = (e: React.MouseEvent, pieceId: string) => {
    e.preventDefault();
    startSidebarDrag(pieceId);
  };

  return (
    <div
      className={`relative flex transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0'
      }`}
    >
      {/* Sidebar content */}
      <div
        className={`w-72 bg-gray-800 border-r border-gray-700 flex flex-col absolute left-0 top-0 h-full transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Pieces</h2>
              <p className="text-sm text-gray-400">Drag pieces to the map</p>
            </div>
            <button
              onClick={rotateCurrentPiece}
              className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
              title="Rotate piece (R)"
            >
              <span className="text-lg">↻</span>
              <span className="font-mono">{currentRotation}°</span>
            </button>
          </div>
        </div>

        <Tabs defaultValue={terrainTypes[0]?.id} className="flex-1 flex flex-col min-h-0">
          <div className="mx-2 mt-2 shrink-0 overflow-x-auto scrollbar-thin">
            <TabsList className="inline-flex w-max gap-1 bg-gray-900 p-1">
            {terrainTypes.map((terrain) => {
              const terrainPieces = regularPieces.filter(
                (p) => p.terrainTypeId === terrain.id
              );
              if (terrainPieces.length === 0) return null;

              return (
                <TabsTrigger
                  key={terrain.id}
                  value={terrain.id}
                  className="text-xs data-[state=active]:bg-gray-700"
                  style={{
                    borderBottom: `2px solid ${terrain.color}`,
                  }}
                >
                  {terrain.icon} {terrain.name}
                </TabsTrigger>
              );
            })}
            {customPieces.length > 0 && (
              <TabsTrigger
                value="custom"
                className="text-xs data-[state=active]:bg-gray-700"
                style={{
                  borderBottom: '2px solid #a855f7',
                }}
              >
                <Puzzle className="h-3 w-3 mr-1" /> Custom
              </TabsTrigger>
            )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
            {terrainTypes.map((terrain) => {
              const terrainPieces = regularPieces.filter(
                (p) => p.terrainTypeId === terrain.id
              );

              return (
                <TabsContent
                  key={terrain.id}
                  value={terrain.id}
                  className="p-2 m-0"
                >
                  <div className="space-y-2">
                    {terrainPieces.map((piece) => {
                      const totalUsed = getTotalUsed(piece.id);
                      const available = piece.quantity - totalUsed;
                      const isSelected = selectedPieceId === piece.id;
                      const isOverused = available < 0;

                      return (
                        <Card
                          key={piece.id}
                          onMouseDown={(e) => handleMouseDown(e, piece.id)}
                          className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                            isSelected
                              ? 'ring-2 ring-blue-500'
                              : ''
                          } ${
                            isOverused
                              ? 'border-red-500 bg-red-950/30'
                              : 'hover:bg-gray-700'
                          }`}
                          style={{
                            borderLeft: `4px solid ${isOverused ? '#ef4444' : terrain.color}`,
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className={`font-medium text-sm ${isOverused ? 'text-red-300' : 'text-white'}`}>
                                  {piece.name}
                                </h3>
                                <p className="text-xs text-gray-400">
                                  {piece.size.label}
                                  {piece.isDiagonal && ' (Diagonal)'}
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-sm font-bold ${
                                    available > 0
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {available}
                                </span>
                                <span className="text-xs text-gray-500">
                                  /{piece.quantity}
                                </span>
                              </div>
                            </div>

                            {/* Visual size representation */}
                            <div className="mt-2 flex items-end gap-1">
                              {piece.isDiagonal ? (
                                <svg
                                  width={piece.size.width * 8}
                                  height={piece.size.height * 8}
                                  style={{ opacity: 0.6 }}
                                >
                                  <polygon
                                    points={`0,0 ${piece.size.width * 8},0 0,${piece.size.height * 8}`}
                                    fill={terrain.color}
                                    transform={`rotate(${piece.defaultRotation || 0} ${piece.size.width * 4} ${piece.size.height * 4})`}
                                  />
                                </svg>
                              ) : (
                                <div
                                  className="rounded"
                                  style={{
                                    width: `${piece.size.width * 8}px`,
                                    height: `${piece.size.height * 8}px`,
                                    backgroundColor: terrain.color,
                                    opacity: 0.6,
                                  }}
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}

            {/* Custom Pieces Tab Content */}
            <TabsContent value="custom" className="p-2 m-0">
              <div className="space-y-2">
                {customPieces.map((piece) => {
                  const totalUsed = getTotalUsed(piece.id);
                  const available = piece.quantity - totalUsed;
                  const isSelected = selectedPieceId === piece.id;
                  const isOverused = available < 0;
                  const primaryTerrain = terrainTypes.find((t) => t.id === piece.terrainTypeId);
                  const secondaryTerrain = piece.secondaryTerrainTypeId
                    ? terrainTypes.find((t) => t.id === piece.secondaryTerrainTypeId)
                    : undefined;

                  return (
                    <Card
                      key={piece.id}
                      onMouseDown={(e) => handleMouseDown(e, piece.id)}
                      className={`cursor-grab active:cursor-grabbing transition-all select-none ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      } ${isOverused ? 'border-red-500 bg-red-950/30' : 'hover:bg-gray-700'}`}
                      style={{
                        borderLeft: `4px solid ${isOverused ? '#ef4444' : '#a855f7'}`,
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`font-medium text-sm ${isOverused ? 'text-red-300' : 'text-white'}`}>
                              {piece.name}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {piece.size.label}
                              {piece.isSplit && ` (${piece.splitDirection === 'horizontal' ? 'H' : 'V'}-Split)`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {available}
                            </span>
                            <span className="text-xs text-gray-500">/{piece.quantity}</span>
                          </div>
                        </div>

                        {/* Visual size representation for custom pieces */}
                        <div className="mt-2 flex items-end gap-1">
                          {piece.isSplit && piece.splitDirection ? (
                            <div
                              className="rounded overflow-hidden border border-gray-600"
                              style={{
                                width: `${piece.size.width * 8}px`,
                                height: `${piece.size.height * 8}px`,
                                display: 'flex',
                                flexDirection: piece.splitDirection === 'horizontal' ? 'column' : 'row',
                                opacity: 0.6,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  backgroundColor: primaryTerrain?.color || '#666',
                                }}
                              />
                              <div
                                style={{
                                  flex: 1,
                                  backgroundColor: secondaryTerrain?.color || '#888',
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="rounded"
                              style={{
                                width: `${piece.size.width * 8}px`,
                                height: `${piece.size.height * 8}px`,
                                backgroundColor: primaryTerrain?.color || '#666',
                                opacity: 0.6,
                              }}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {customPieces.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    <Puzzle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No custom pieces yet</p>
                    <p className="text-xs mt-1">Create custom pieces in Inventory</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        {/* Stats footer */}
        <div className="p-3 bg-gray-900">
          <div className="text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Pieces on map:</span>
              <span className="text-white">{placedPieces.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Current level:</span>
              <span className="text-white">
                {currentLevel === 0
                  ? 'Ground'
                  : currentLevel > 0
                  ? `Floor ${currentLevel}`
                  : `Basement ${Math.abs(currentLevel)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-16 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg flex items-center justify-center transition-all duration-300 z-10 ${
          isOpen ? 'left-72' : 'left-0'
        }`}
        title={isOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </button>
    </div>
  );
}
